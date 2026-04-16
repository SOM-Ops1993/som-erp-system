/**
 * Inward Service — Bulk Scan Session Management
 *
 * Flow:
 *  1. Create session → returns session_id
 *  2. Scan packs → validates and adds to session buffer (DB array)
 *  3. Submit session → bulk commits all inward records + ledger entries
 */

import prisma from '../db.js'
import { getLedgerBalance } from './ledger-service.js'

/**
 * Create a new inward session.
 * Calculates expected bag count from pending packs for this item+lot.
 */
export async function createInwardSession({ itemCode, lotNo, warehouse, createdBy }) {
  // Fetch the item
  const item = await prisma.rmMaster.findUnique({ where: { itemCode } })
  if (!item) throw Object.assign(new Error(`Item ${itemCode} not found`), { statusCode: 404 })

  // Count pending packs for this item+lot
  const pendingPacks = await prisma.printMaster.findMany({
    where: { itemCode, lotNo, status: 'AWAITING_INWARD' },
    orderBy: { bagNo: 'asc' },
    select: { packId: true, bagNo: true, packQty: true },
  })

  if (pendingPacks.length === 0) {
    throw Object.assign(
      new Error(`No pending packs found for ${item.itemName} — Lot ${lotNo}`),
      { statusCode: 400 }
    )
  }

  // Check for any existing ACTIVE session for same item+lot
  const existing = await prisma.inwardSession.findFirst({
    where: { itemCode, lotNo, sessionStatus: 'ACTIVE' },
  })
  if (existing) {
    // Return existing session (operator may have refreshed the page)
    return { session: existing, pendingPacks, isResumed: true }
  }

  const session = await prisma.inwardSession.create({
    data: {
      itemCode,
      itemName: item.itemName,
      lotNo,
      warehouse,
      expectedBags: pendingPacks.length,
      scannedPackIds: [],
      sessionStatus: 'ACTIVE',
      createdBy: createdBy || null,
    },
  })

  return { session, pendingPacks, isResumed: false }
}

/**
 * Validate and add a scanned pack to the session buffer.
 * No DB write to inward yet — only updates the session array.
 *
 * Returns: { ok: true, packInfo } or throws with error message.
 */
export async function scanPackForSession(sessionId, scannedPackId) {
  const session = await prisma.inwardSession.findUnique({ where: { sessionId } })
  if (!session) throw Object.assign(new Error('Session not found'), { statusCode: 404 })
  if (session.sessionStatus !== 'ACTIVE') {
    throw Object.assign(new Error(`Session is ${session.sessionStatus}`), { statusCode: 400 })
  }

  // ── Validation 1: Pack exists in print_master ─────────────────
  const pack = await prisma.printMaster.findUnique({ where: { packId: scannedPackId } })
  if (!pack) {
    throw Object.assign(
      new Error(`Pack ID "${scannedPackId}" is not registered. Check the QR code.`),
      { statusCode: 400, code: 'PACK_NOT_FOUND' }
    )
  }

  // ── Validation 2: Pack belongs to this session's item + lot ───
  if (pack.itemCode !== session.itemCode || pack.lotNo !== session.lotNo) {
    throw Object.assign(
      new Error(`Pack belongs to ${pack.itemName} / Lot ${pack.lotNo}. This session is for Lot ${session.lotNo}.`),
      { statusCode: 400, code: 'WRONG_ITEM_LOT' }
    )
  }

  // ── Validation 3: Not already inwarded ───────────────────────
  if (pack.status !== 'AWAITING_INWARD') {
    throw Object.assign(
      new Error(`Pack "${scannedPackId}" is already ${pack.status}.`),
      { statusCode: 400, code: 'ALREADY_INWARDED' }
    )
  }

  // ── Validation 4: Not duplicate in this session ───────────────
  if (session.scannedPackIds.includes(scannedPackId)) {
    throw Object.assign(
      new Error(`Pack "${scannedPackId}" was already scanned in this session.`),
      { statusCode: 400, code: 'DUPLICATE_SCAN' }
    )
  }

  // ── Valid: Add to session buffer ──────────────────────────────
  const updated = await prisma.inwardSession.update({
    where: { sessionId },
    data: { scannedPackIds: { push: scannedPackId } },
  })

  return {
    ok: true,
    packInfo: {
      packId: pack.packId,
      bagNo: pack.bagNo,
      packQty: Number(pack.packQty),
      uom: pack.uom,
    },
    scannedCount: updated.scannedPackIds.length,
    expectedBags: session.expectedBags,
    isComplete: updated.scannedPackIds.length >= session.expectedBags,
  }
}

/**
 * Remove a pack from the session buffer (undo scan).
 */
export async function removePackFromSession(sessionId, packId) {
  const session = await prisma.inwardSession.findUnique({ where: { sessionId } })
  if (!session || session.sessionStatus !== 'ACTIVE') {
    throw Object.assign(new Error('Session not found or not active'), { statusCode: 400 })
  }
  const updated = await prisma.inwardSession.update({
    where: { sessionId },
    data: { scannedPackIds: session.scannedPackIds.filter((id) => id !== packId) },
  })
  return { scannedCount: updated.scannedPackIds.length }
}

/**
 * Get session state including pending packs.
 */
export async function getSessionState(sessionId) {
  const session = await prisma.inwardSession.findUnique({ where: { sessionId } })
  if (!session) throw Object.assign(new Error('Session not found'), { statusCode: 404 })

  // Get all pending packs for this lot
  const allPacks = await prisma.printMaster.findMany({
    where: { itemCode: session.itemCode, lotNo: session.lotNo, status: 'AWAITING_INWARD' },
    orderBy: { bagNo: 'asc' },
    select: { packId: true, bagNo: true, packQty: true },
  })

  const scannedSet = new Set(session.scannedPackIds)
  const scannedPacks = session.scannedPackIds.map((id) => {
    const p = allPacks.find((x) => x.packId === id)
    return p ? { packId: id, bagNo: p.bagNo, packQty: Number(p.packQty) } : { packId: id }
  })
  const pendingPacks = allPacks.filter((p) => !scannedSet.has(p.packId))

  return {
    session,
    scannedPacks,
    pendingPacks,
    scannedCount: scannedPacks.length,
    pendingCount: pendingPacks.length,
    isComplete: scannedPacks.length >= session.expectedBags,
  }
}

/**
 * Commit (submit) the inward session.
 * All-or-nothing transaction:
 *  - Bulk insert INWARD records
 *  - Create PACK_BALANCE records
 *  - Insert STOCK_LEDGER entries (running balance)
 *  - Mark session SUBMITTED
 */
export async function submitInwardSession(sessionId, transactedBy) {
  const state = await getSessionState(sessionId)
  const { session } = state

  if (session.sessionStatus !== 'ACTIVE') {
    throw Object.assign(new Error('Session is not active'), { statusCode: 400 })
  }
  if (state.scannedCount === 0) {
    throw Object.assign(new Error('No packs scanned'), { statusCode: 400 })
  }

  // Fetch full pack details for scanned packs
  const packs = await prisma.printMaster.findMany({
    where: { packId: { in: session.scannedPackIds } },
  })

  const now = new Date()
  const today = new Date(now.toISOString().split('T')[0])

  await prisma.$transaction(async (tx) => {
    // 1. Bulk insert inward records
    await tx.inward.createMany({
      data: packs.map((p) => ({
        packId: p.packId,
        itemCode: p.itemCode,
        itemName: p.itemName,
        lotNo: p.lotNo,
        bagNo: p.bagNo,
        qty: p.packQty,
        uom: p.uom,
        warehouse: session.warehouse,
        inwardDate: today,
        inwardTime: now,
        transactedBy: transactedBy || null,
        batchId: sessionId,
        isLegacy: false,
      })),
    })

    // 2. Bulk insert pack_balance records
    await tx.packBalance.createMany({
      data: packs.map((p) => ({
        packId: p.packId,
        itemCode: p.itemCode,
        originalQty: p.packQty,
        issuedQty: 0,
        remainingQty: p.packQty,
        isExhausted: false,
      })),
    })

    // 3. Insert stock_ledger entries with running balance
    //    Process pack by pack to maintain accurate running balance
    let runningBalance = await getRunningBalance(tx, packs[0].itemCode)

    for (const p of packs) {
      runningBalance = runningBalance + Number(p.packQty)
      await tx.stockLedger.create({
        data: {
          itemCode: p.itemCode,
          sourceId: p.packId,
          sourceType: 'PACK',
          transactionType: 'INWARD',
          inQty: p.packQty,
          outQty: 0,
          balance: runningBalance,
          reference: `Batch: ${sessionId} | Lot: ${p.lotNo}`,
          transactedBy: transactedBy || null,
          timestamp: now,
        },
      })
    }

    // 4. print_master status updated by DB trigger
    // 5. Mark session submitted
    await tx.inwardSession.update({
      where: { sessionId },
      data: { sessionStatus: 'SUBMITTED', submittedAt: now },
    })
  })

  return {
    success: true,
    packsInwarded: packs.length,
    totalQty: packs.reduce((s, p) => s + Number(p.packQty), 0),
    warehouse: session.warehouse,
    sessionId,
  }
}

async function getRunningBalance(tx, itemCode) {
  const last = await tx.stockLedger.findFirst({
    where: { itemCode },
    orderBy: [{ timestamp: 'desc' }, { ledgerId: 'desc' }],
    select: { balance: true },
  })
  return Number(last?.balance || 0)
}

// re-export for use in submit
export { getRunningBalance }
