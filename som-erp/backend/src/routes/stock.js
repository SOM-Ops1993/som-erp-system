import prisma from '../db.js'
import { getStockSummary } from '../services/ledger-service.js'

export default async function stockRoutes(fastify) {

  // GET stock summary (all items)
  fastify.get('/', async (req, reply) => {
    const { search, status } = req.query
    const data = await getStockSummary({ search, status })
    return { success: true, data, count: data.length }
  })

  // GET item-level detail with pack breakdown
  fastify.get('/:itemCode', async (req, reply) => {
    const { itemCode } = req.params
    const item = await prisma.rmMaster.findUnique({ where: { itemCode } })
    if (!item) return reply.status(404).send({ success: false, error: 'Item not found' })

    const [packs, container, lastLedger] = await Promise.all([
      prisma.printMaster.findMany({
        where: { itemCode, status: { in: ['INWARDED', 'PARTIALLY_ISSUED'] } },
        include: { packBalance: true, inward: { select: { warehouse: true, inwardDate: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.containerMaster.findUnique({ where: { itemCode } }),
      prisma.stockLedger.findFirst({
        where: { itemCode },
        orderBy: [{ timestamp: 'desc' }, { ledgerId: 'desc' }],
        select: { balance: true },
      }),
    ])

    return {
      success: true,
      data: {
        item,
        currentBalance: Number(lastLedger?.balance || 0),
        packs: packs.map((p) => ({
          packId: p.packId,
          lotNo: p.lotNo,
          bagNo: p.bagNo,
          status: p.status,
          warehouse: p.inward?.warehouse,
          inwardDate: p.inward?.inwardDate,
          originalQty: p.packBalance ? Number(p.packBalance.originalQty) : Number(p.packQty),
          remainingQty: p.packBalance ? Number(p.packBalance.remainingQty) : Number(p.packQty),
          issuedQty: p.packBalance ? Number(p.packBalance.issuedQty) : 0,
        })),
        container,
      },
    }
  })

  // GET containers
  fastify.get('/containers/all', async (req, reply) => {
    const containers = await prisma.containerMaster.findMany({
      orderBy: { itemName: 'asc' },
    })
    return { success: true, data: containers }
  })
}
