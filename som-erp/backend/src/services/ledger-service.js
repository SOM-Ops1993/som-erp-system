/**
 * Stock Ledger Service
 * Running balance is ALWAYS stored at write time.
 * Never recalculated — ledger is the source of truth.
 */

import prisma from '../db.js'

/**
 * Get the current running balance for an item.
 */
export async function getLedgerBalance(itemCode) {
  const last = await prisma.stockLedger.findFirst({
    where: { itemCode },
    orderBy: [{ timestamp: 'desc' }, { ledgerId: 'desc' }],
    select: { balance: true },
  })
  return Number(last?.balance || 0)
}

/**
 * Get ledger entries for an item (paginated).
 */
export async function getLedgerEntries({ itemCode, page = 1, limit = 50, dateFrom, dateTo }) {
  const where = { itemCode }
  if (dateFrom || dateTo) {
    where.timestamp = {}
    if (dateFrom) where.timestamp.gte = new Date(dateFrom)
    if (dateTo) where.timestamp.lte = new Date(dateTo + 'T23:59:59Z')
  }

  const [entries, total] = await Promise.all([
    prisma.stockLedger.findMany({
      where,
      orderBy: [{ timestamp: 'desc' }, { ledgerId: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.stockLedger.count({ where }),
  ])

  return { entries, total, page, pages: Math.ceil(total / limit) }
}

/**
 * Get stock summary for all items (uses v_stock_summary view).
 */
export async function getStockSummary({ search, status } = {}) {
  // Use direct query for flexibility
  const items = await prisma.rmMaster.findMany({
    where: search
      ? {
          OR: [
            { itemName: { contains: search, mode: 'insensitive' } },
            { itemCode: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {},
    orderBy: { itemName: 'asc' },
  })

  // For each item, get current balance and pack counts
  const result = await Promise.all(
    items.map(async (item) => {
      const [lastLedger, awaitingCount, inStockCount, partialCount] = await Promise.all([
        prisma.stockLedger.findFirst({
          where: { itemCode: item.itemCode },
          orderBy: [{ timestamp: 'desc' }, { ledgerId: 'desc' }],
          select: { balance: true },
        }),
        prisma.printMaster.count({ where: { itemCode: item.itemCode, status: 'AWAITING_INWARD' } }),
        prisma.printMaster.count({ where: { itemCode: item.itemCode, status: 'INWARDED' } }),
        prisma.printMaster.count({ where: { itemCode: item.itemCode, status: 'PARTIALLY_ISSUED' } }),
      ])

      const balance = Number(lastLedger?.balance || 0)
      let stockStatus = 'OUT_OF_STOCK'
      if (balance > 0) {
        stockStatus = item.reorderLevel && balance <= Number(item.reorderLevel)
          ? 'LOW_STOCK'
          : 'IN_STOCK'
      }

      if (status && stockStatus !== status) return null

      return {
        itemCode: item.itemCode,
        itemName: item.itemName,
        uom: item.uom,
        reorderLevel: item.reorderLevel ? Number(item.reorderLevel) : null,
        currentBalance: balance,
        stockStatus,
        packsAwaitingInward: awaitingCount,
        packsInStock: inStockCount,
        packsPartiallyIssued: partialCount,
      }
    })
  )

  return result.filter(Boolean)
}
