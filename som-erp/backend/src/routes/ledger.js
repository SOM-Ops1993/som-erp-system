import { getLedgerEntries } from '../services/ledger-service.js'
import prisma from '../db.js'

export default async function ledgerRoutes(fastify) {

  // GET ledger entries for an item
  fastify.get('/:itemCode', async (req, reply) => {
    const { page, limit, dateFrom, dateTo } = req.query
    const result = await getLedgerEntries({
      itemCode: req.params.itemCode,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      dateFrom,
      dateTo,
    })
    return { success: true, ...result }
  })

  // GET full ledger (all items, paginated, for admin view)
  fastify.get('/', async (req, reply) => {
    const { page = 1, limit = 100, itemCode, transactionType, dateFrom, dateTo } = req.query
    const where = {}
    if (itemCode) where.itemCode = itemCode
    if (transactionType) where.transactionType = transactionType
    if (dateFrom || dateTo) {
      where.timestamp = {}
      if (dateFrom) where.timestamp.gte = new Date(dateFrom)
      if (dateTo) where.timestamp.lte = new Date(dateTo + 'T23:59:59Z')
    }

    const [data, total] = await Promise.all([
      prisma.stockLedger.findMany({
        where,
        orderBy: [{ timestamp: 'desc' }, { ledgerId: 'desc' }],
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: { rmMaster: { select: { itemName: true, uom: true } } },
      }),
      prisma.stockLedger.count({ where }),
    ])

    return { success: true, data, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
  })
}
