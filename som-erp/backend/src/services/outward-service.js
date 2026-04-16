/**
 * Outward Service — All stock exit modes
 *
 * Modes:
 *  1. BOM_ISSUANCE     — scan pack → auto-allocate to indent
 *  2. PACK_REDUCTION   — pack → container
 *  3. STOCK_RECON      — manual adjustment with remarks
 *  4. WAREHOUSE_TRANSFER — pack → different warehouse
 *  5. JOB_WORK         — issue to job work (no BOM required)
 */

import prisma from '../db.js'
import { getRunningBalance } from './inward-service.js'

/**
 * BOM Issuance — scan a pack and auto-allocate qty to an indent RM line.
 * Deducts exactly what's needed; stops when required qty reached.
 *
 * @returns {{ deducted, remaining, isComplete, outwardId }}
 */
export async function bomIssuanceScan({ indentId, rmCode, scannedPackId, transactedBy }) {
  return prisma.$transaction(async (tx) => {
    // ── Load indent detail ───────────────────────────────────────
    const detail = await tx.indentDetails.findFirst({
      where: { indentId, rmCode },
    })
    if (!detail) throw Object.assign(new Error('RM not found in indent'), { statusCode: 404 })

    const balanceQty = Number(detail.requiredQty) - Number(detail.issuedQty)
    if (balanceQty <= 0) throw Object.assign(new Error('This RM is already fully issued'), { statusCode: 400 })

    // ── Validate pack ────────────────────────────────────────────
    const pack = await tx.printMaster.findUnique({ where: { packId: scannedPackId } })
    if (!pack) throw Object.assign(new Error(`Pack ${scannedPackId} not found`), { statusCode: 404 })
    if (pack.itemCode !== rmCode) {
      throw Object.assign(
        new Error(`Pack is for ${pack.itemName}, but indent requires item code ${rmCode}`),
        { statusCode: 400, code: 'WRONG_ITEM' }
      )
    }

    const packBalance = await tx.packBalance.findUnique({ where: { packId: scannedPackId } })
    if (!packBalance || packBalance.isExhausted) {
      throw Object.assign(new Error(`Pack ${scannedPackId} is exhausted`), { statusCode: 400 })
    }
    if (Number(packBalance.remainingQty) <= 0) {
      throw Object.assign(new Error(`Pack ${scannedPackId} has no remaining quantity`), { statusCode: 400 })
    }

    // Check pack is inwarded
    const inward = await tx.inward.findUnique({ where: { packId: scannedPackId } })
    if (!inward) throw Object.assign(new Error(`Pack ${scannedPackId} has not been inwarded`), { statusCode: 400 })

    // ── AUTO-ALLOCATION: deduct minimum of (available, needed) ───
    const available = Number(packBalance.remainingQty)
    const deduct = Math.min(available, balanceQty)
    const newRemaining = available - deduct
    const isPackExhausted = newRemaining === 0

    // ── Outward record ───────────────────────────────────────────
    const indent = await tx.indentMaster.findUnique({ where: { indentId } })
    const outward = await tx.outward.create({
      data: {
        transactionType: 'BOM_ISSUANCE',
        sourceId: scannedPackId,
        sourceType: 'PACK',
        rmCode,
        qtyIssued: deduct,
        uom: pack.uom,
        indentId,
        destination: indent?.plant || null,
        bomRef: indent?.diNo || null,
        transactedBy: transactedBy || null,
      },
    })

    // ── Update pack balance ───────────────────────────────────────
    await tx.packBalance.update({
      where: { packId: scannedPackId },
      data: {
        issuedQty: { increment: deduct },
        remainingQty: newRemaining,
        isExhausted: isPackExhausted,
        lastUpdated: new Date(),
      },
    })

    // ── Update indent detail ──────────────────────────────────────
    const newIssuedQty = Number(detail.issuedQty) + deduct
    const newBalanceQty = Number(detail.requiredQty) - newIssuedQty
    await tx.indentDetails.update({
      where: { detailId: detail.detailId },
      data: {
        issuedQty: newIssuedQty,
        status: newBalanceQty <= 0 ? 'COMPLETE' : newIssuedQty > 0 ? 'PARTIAL' : 'PENDING',
      },
    })

    // ── Check if full indent is complete ──────────────────────────
    const allDetails = await tx.indentDetails.findMany({ where: { indentId } })
    const allComplete = allDetails.every((d) => d.status === 'COMPLETE')
    if (allComplete) {
      await tx.indentMaster.update({
        where: { indentId },
        data: { status: 'COMPLETE', closedAt: new Date() },
      })
    } else if (allDetails.some((d) => d.status !== 'PENDING')) {
      await tx.indentMaster.update({ where: { indentId }, data: { status: 'PARTIAL' } })
    }

    // ── Stock ledger entry ────────────────────────────────────────
    const currentBalance = await getRunningBalance(tx, rmCode)
    const newBalance = currentBalance - deduct
    await tx.stockLedger.create({
      data: {
        itemCode: rmCode,
        sourceId: scannedPackId,
        sourceType: 'PACK',
        transactionType: 'BOM_ISSUANCE',
        inQty: 0,
        outQty: deduct,
        balance: newBalance,
        reference: `Indent: ${indentId} | ${indent?.diNo || ''}`,
        transactedBy: transactedBy || null,
      },
    })

    return {
      deducted: deduct,
      remaining: newBalanceQty,
      isComplete: newBalanceQty <= 0,
      isPackExhausted,
      outwardId: Number(outward.outwardId),
    }
  })
}

/**
 * Pack Size Reduction — transfer qty from pack to container.
 */
export async function packToContainer({ scannedPackId, qtyToTransfer, transactedBy }) {
  return prisma.$transaction(async (tx) => {
    const pack = await tx.printMaster.findUnique({ where: { packId: scannedPackId } })
    if (!pack) throw Object.assign(new Error(`Pack ${scannedPackId} not found`), { statusCode: 404 })

    const packBalance = await tx.packBalance.findUnique({ where: { packId: scannedPackId } })
    if (!packBalance || packBalance.isExhausted) {
      throw Object.assign(new Error('Pack is exhausted'), { statusCode: 400 })
    }

    const qty = parseFloat(qtyToTransfer)
    if (qty <= 0) throw Object.assign(new Error('Quantity must be positive'), { statusCode: 400 })
    if (qty > Number(packBalance.remainingQty)) {
      throw Object.assign(
        new Error(`Only ${packBalance.remainingQty} ${pack.uom} remaining in pack`),
        { statusCode: 400 }
      )
    }

    // Find or auto-create container for this item
    let container = await tx.containerMaster.findUnique({ where: { itemCode: pack.itemCode } })
    if (!container) {
      // Auto-create container
      const lbl = pack.itemName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 3)
      const containerId = `${lbl}-${pack.itemCode}-CONT001`
      container = await tx.containerMaster.create({
        data: {
          containerId,
          itemCode: pack.itemCode,
          itemName: pack.itemName,
          currentQty: 0,
          uom: pack.uom,
          status: 'EMPTY',
        },
      })
    }

    // Outward: PACK → OUT
    const outward = await tx.outward.create({
      data: {
        transactionType: 'PACK_REDUCTION',
        sourceId: scannedPackId,
        sourceType: 'PACK',
        destinationId: container.containerId,
        rmCode: pack.itemCode,
        qtyIssued: qty,
        uom: pack.uom,
        transactedBy: transactedBy || null,
      },
    })

    // Update pack balance
    const newRemaining = Number(packBalance.remainingQty) - qty
    await tx.packBalance.update({
      where: { packId: scannedPackId },
      data: {
        issuedQty: { increment: qty },
        remainingQty: newRemaining,
        isExhausted: newRemaining === 0,
        lastUpdated: new Date(),
      },
    })

    // Update container
    await tx.containerMaster.update({
      where: { itemCode: pack.itemCode },
      data: {
        currentQty: { increment: qty },
        status: 'ACTIVE',
      },
    })

    // Stock ledger: OUT from pack
    const balance = await getRunningBalance(tx, pack.itemCode)
    // Note: pack→container is an internal transfer; balance doesn't change
    // We record both sides as reference entries
    await tx.stockLedger.create({
      data: {
        itemCode: pack.itemCode,
        sourceId: scannedPackId,
        sourceType: 'PACK',
        transactionType: 'PACK_REDUCTION_OUT',
        inQty: 0,
        outQty: 0,  // no stock change — internal transfer
        balance,
        reference: `Pack→Container: ${container.containerId}`,
        transactedBy: transactedBy || null,
      },
    })

    return {
      success: true,
      packId: scannedPackId,
      containerId: container.containerId,
      qtyTransferred: qty,
      packRemainingQty: newRemaining,
      containerCurrentQty: Number(container.currentQty) + qty,
      outwardId: Number(outward.outwardId),
    }
  })
}

/**
 * Stock Reconciliation Adjustment.
 * Remarks are mandatory.
 */
export async function stockReconAdjustment({ itemCode, adjustmentQty, remarks, transactedBy }) {
  if (!remarks || remarks.trim().length < 5) {
    throw Object.assign(new Error('Remarks are mandatory for stock reconciliation (min 5 chars)'), { statusCode: 400 })
  }

  return prisma.$transaction(async (tx) => {
    const item = await tx.rmMaster.findUnique({ where: { itemCode } })
    if (!item) throw Object.assign(new Error(`Item ${itemCode} not found`), { statusCode: 404 })

    const qty = parseFloat(adjustmentQty)
    const isPositive = qty > 0

    const outward = await tx.outward.create({
      data: {
        transactionType: 'STOCK_RECON',
        sourceId: `RECON-${Date.now()}`,
        sourceType: 'ADJUSTMENT',
        rmCode: itemCode,
        qtyIssued: Math.abs(qty),
        uom: item.uom,
        remarks: remarks.trim(),
        transactedBy: transactedBy || null,
      },
    })

    const currentBalance = await getRunningBalance(tx, itemCode)
    const newBalance = currentBalance + qty

    await tx.stockLedger.create({
      data: {
        itemCode,
        sourceId: `RECON-${outward.outwardId}`,
        sourceType: 'ADJUSTMENT',
        transactionType: 'STOCK_RECON',
        inQty: isPositive ? Math.abs(qty) : 0,
        outQty: isPositive ? 0 : Math.abs(qty),
        balance: newBalance,
        reference: `Recon: ${remarks.trim()}`,
        transactedBy: transactedBy || null,
      },
    })

    return { success: true, adjustmentQty: qty, newBalance, outwardId: Number(outward.outwardId) }
  })
}

/**
 * Warehouse Transfer — move a pack to a different warehouse.
 */
export async function warehouseTransfer({ scannedPackId, toWarehouse, transactedBy }) {
  return prisma.$transaction(async (tx) => {
    const inward = await tx.inward.findUnique({ where: { packId: scannedPackId } })
    if (!inward) throw Object.assign(new Error('Pack not inwarded'), { statusCode: 400 })

    const fromWarehouse = inward.warehouse
    if (fromWarehouse === toWarehouse) {
      throw Object.assign(new Error('Source and destination warehouse are the same'), { statusCode: 400 })
    }

    // Update inward warehouse
    await tx.inward.update({
      where: { packId: scannedPackId },
      data: { warehouse: toWarehouse },
    })

    const outward = await tx.outward.create({
      data: {
        transactionType: 'WAREHOUSE_TRANSFER',
        sourceId: scannedPackId,
        sourceType: 'PACK',
        rmCode: inward.itemCode,
        qtyIssued: 0,   // no stock change
        uom: inward.uom,
        destination: toWarehouse,
        remarks: `From: ${fromWarehouse} → To: ${toWarehouse}`,
        transactedBy: transactedBy || null,
      },
    })

    return { success: true, fromWarehouse, toWarehouse, outwardId: Number(outward.outwardId) }
  })
}
