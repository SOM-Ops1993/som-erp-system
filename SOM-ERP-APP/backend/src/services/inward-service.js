import prisma from '../db.js'

export async function createInwardSession({ itemCode, lotNo, warehouse }) {
  const existing = await prisma.inwardSession.findFirst({
    where: { itemCode, lotNo, status: 'ACTIVE' }
  })
  if (existing) return { success: true, data: existing, resumed: true }

  const packs = await prisma.printMaster.findMany({
    where: { itemCode, lotNo, status: 'AWAITING_INWARD' }
  })
  if (!packs.length) throw new Error('No packs awaiting inward for this item/lot')

  const session = await prisma.inwardSession.create({
    data: { itemCode, lotNo, warehouse, expectedBags: packs.length, scannedPackIds: [] }
  })
  return { success: true, data: session, resumed: false }
}

export async function scanPackForSession(sessionId, packId) {
  const session = await prisma.inwardSession.findUnique({ where: { sessionId } })
  if (!session) throw new Error('Session not found')
  if (session.status !== 'ACTIVE') throw new Error('Session is not active')

  const pack = await prisma.printMaster.findUnique({ where: { packId } })
  if (!pack) throw new Error(`Pack ${packId} does not exist in system`)
  if (pack.itemCode !== session.itemCode) throw new Error(`Pack belongs to ${pack.itemCode}, expected ${session.itemCode}`)
  if (pack.status !== 'AWAITING_INWARD') throw new Error(`Pack ${packId} is already ${pack.status}`)
  if (session.scannedPackIds.includes(packId)) throw new Error('Pack already scanned in this session')

  const updated = await prisma.inwardSession.update({
    where: { sessionId },
    data: { scannedPackIds: { push: packId } }
  })
  return { success: true, data: updated }
}

export async function removeScanFromSession(sessionId, packId) {
  const session = await prisma.inwardSession.findUnique({ where: { sessionId } })
  if (!session) throw new Error('Session not found')
  const updated = await prisma.inwardSession.update({
    where: { sessionId },
    data: { scannedPackIds: session.scannedPackIds.filter(id => id !== packId) }
  })
  return { success: true, data: updated }
}

export async function submitInwardSession(sessionId, transactedBy) {
  const session = await prisma.inwardSession.findUnique({ where: { sessionId } })
  if (!session) throw new Error('Session not found')
  if (session.scannedPackIds.length === 0) throw new Error('No packs scanned')

  const packs = await prisma.printMaster.findMany({
    where: { packId: { in: session.scannedPackIds } }
  })

  // Set of item codes being inwarded - used to re-check pending indents
  const inwaredItemCodes = [...new Set(packs.map(p => p.itemCode))]

  await prisma.$transaction(async (tx) => {
    await tx.inward.createMany({
      data: packs.map(p => ({
        packId: p.packId, itemCode: p.itemCode, itemName: p.itemName,
        lotNo: p.lotNo, bagNo: p.bagNo, qty: p.packQty, warehouse: session.warehouse,
      }))
    })
    await tx.packBalance.createMany({
      data: packs.map(p => ({
        packId: p.packId, itemCode: p.itemCode,
        totalQty: p.packQty, remainingQty: p.packQty,
      })),
      skipDuplicates: true,
    })

    let runningBalance = 0
    const prevBalance = await tx.stockLedger.findFirst({
      where: { itemCode: session.itemCode }, orderBy: { timestamp: 'desc' }
    })
    runningBalance = prevBalance?.balance || 0

    const ledgerEntries = packs.map(p => {
      runningBalance += p.packQty
      return {
        itemCode: p.itemCode, sourceId: p.packId, transactionType: 'INWARD',
        inQty: p.packQty, outQty: 0, balance: runningBalance,
        reference: `Lot ${p.lotNo} | Bag ${p.bagNo} | ${session.warehouse}`,
      }
    })
    await tx.stockLedger.createMany({ data: ledgerEntries })
    await tx.inwardSession.update({ where: { sessionId }, data: { status: 'SUBMITTED' } })
  }, { timeout: 60000 })

  // After successful inward - re-check any PENDING_STOCK indents for these items
  const nowReadyIndents = await checkAndUnblockIndents(inwaredItemCodes)

  return {
    success: true,
    message: `${packs.length} packs inwarded successfully`,
    nowReadyIndents
  }
}

// Check PENDING_STOCK indents - if all RMs now have sufficient stock, move to OPEN
async function checkAndUnblockIndents(itemCodes) {
  // Find all PENDING_STOCK indents that require any of these item codes
  const pendingDetails = await prisma.indentDetails.findMany({
    where: { rmCode: { in: itemCodes }, indent: { status: 'PENDING_STOCK' } },
    include: { indent: { include: { details: true } } },
    distinct: ['indentId']
  })

  const readyIndentIds = []

  for (const detail of pendingDetails) {
    const indent = detail.indent
    // Re-check all RMs for this indent
    let allOk = true
    for (const d of indent.details) {
      const packStock = await prisma.packBalance.aggregate({
        where: { itemCode: d.rmCode, remainingQty: { gt: 0 } },
        _sum: { remainingQty: true }
      })
      const container = await prisma.containerMaster.findUnique({ where: { itemCode: d.rmCode } })
      const available = (packStock._sum.remainingQty || 0) + (container?.currentQty || 0)
      if (available < d.balanceQty) { allOk = false; break }
    }
    if (allOk) {
      await prisma.indentMaster.update({
        where: { indentId: indent.indentId },
        data: { status: 'OPEN' }
      })
      readyIndentIds.push(indent.indentId)
    }
  }

  return readyIndentIds
}
