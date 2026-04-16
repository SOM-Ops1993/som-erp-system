import prisma from '../db.js'

export default async function ledgerRoutes(fastify) {

  // List all transactions (paginated)
  fastify.get('/', async (req) => {
    const { itemCode, limit = 50, page = 1 } = req.query
    const where = itemCode ? { itemCode } : {}
    const [total, rows] = await Promise.all([
      prisma.stockLedger.count({ where }),
      prisma.stockLedger.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      })
    ])
    return { success: true, data: rows, total, page: parseInt(page), limit: parseInt(limit) }
  })

  // Get entries for a specific item (paginated)
  fastify.get('/item/:itemCode', async (req, reply) => {
    const { limit = 50, page = 1 } = req.query
    const where = { itemCode: req.params.itemCode }
    const [total, rows] = await Promise.all([
      prisma.stockLedger.count({ where }),
      prisma.stockLedger.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      })
    ])
    return { success: true, data: rows, total, page: parseInt(page), limit: parseInt(limit) }
  })

  // Get full detail for a single ledger entry
  fastify.get('/entry/:id', async (req, reply) => {
    const entry = await prisma.stockLedger.findUnique({ where: { id: req.params.id } })
    if (!entry) return reply.status(404).send({ success: false, error: 'Entry not found' })

    const detail = {}

    if (entry.transactionType === 'BOM_ISSUANCE') {
      // Get outward record
      const outward = await prisma.outward.findFirst({
        where: { sourceId: entry.sourceId, rmCode: entry.itemCode }
      })
      detail.outward = outward
      if (outward?.indentId) {
        detail.indent = await prisma.indentMaster.findUnique({
          where: { indentId: outward.indentId },
          include: { details: true }
        })
        // SFG for this indent
        detail.sfg = await prisma.sfgMaster.findFirst({ where: { indentId: outward.indentId } })
      }
      // Pack details
      detail.pack = await prisma.printMaster.findUnique({ where: { packId: entry.sourceId } }).catch(() => null)
    }

    if (entry.transactionType === 'INWARD') {
      detail.pack = await prisma.printMaster.findUnique({ where: { packId: entry.sourceId } }).catch(() => null)
      detail.inward = await prisma.inward.findFirst({ where: { packId: entry.sourceId } })
    }

    if (entry.transactionType === 'PACK_TO_CONTAINER') {
      detail.pack = await prisma.printMaster.findUnique({ where: { packId: entry.sourceId } }).catch(() => null)
    }

    if (entry.transactionType === 'STOCK_RECON') {
      // Adjustment — no pack, reference has the reason
    }

    return { success: true, data: { ...entry, detail } }
  })

  // Legacy: keep /:itemCode route working (redirects to /item/:itemCode logic)
  fastify.get('/:itemCode', async (req) => {
    const { limit = 50, page = 1 } = req.query
    const where = { itemCode: req.params.itemCode }
    const [total, rows] = await Promise.all([
      prisma.stockLedger.count({ where }),
      prisma.stockLedger.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      })
    ])
    return { success: true, data: rows, total, page: parseInt(page), limit: parseInt(limit) }
  })
}
