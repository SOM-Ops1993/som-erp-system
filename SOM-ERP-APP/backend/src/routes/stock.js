import prisma from '../db.js'

export default async function stockRoutes(fastify) {
  fastify.get('/', async (req) => {
    const { search } = req.query
    const rms = await prisma.rmMaster.findMany({
      where: search ? { OR: [{ itemCode: { contains: search, mode: 'insensitive' } }, { itemName: { contains: search, mode: 'insensitive' } }] } : {},
      orderBy: { itemName: 'asc' }
    })
    const stockData = await Promise.all(rms.map(async (rm) => {
      const packStock = await prisma.packBalance.aggregate({
        where: { itemCode: rm.itemCode, remainingQty: { gt: 0 } },
        _sum: { remainingQty: true },
        _count: { packId: true }
      })
      const container = await prisma.containerMaster.findUnique({ where: { itemCode: rm.itemCode } })
      return {
        itemCode: rm.itemCode,
        itemName: rm.itemName,
        uom: rm.uom,
        stockInPacks: packStock._sum.remainingQty || 0,
        activePacks: packStock._count.packId || 0,
        stockInContainer: container?.currentQty || 0,
        totalStock: (packStock._sum.remainingQty || 0) + (container?.currentQty || 0),
      }
    }))
    return { success: true, data: stockData }
  })

  fastify.get('/containers/all', async () => {
    const containers = await prisma.containerMaster.findMany({ orderBy: { itemName: 'asc' } })
    return { success: true, data: containers }
  })

  fastify.get('/:itemCode', async (req, reply) => {
    const rm = await prisma.rmMaster.findUnique({ where: { itemCode: req.params.itemCode } })
    if (!rm) return reply.status(404).send({ success: false, error: 'Item not found' })
    const packs = await prisma.packBalance.findMany({
      where: { itemCode: rm.itemCode, remainingQty: { gt: 0 } }
    })
    return { success: true, data: { rm, packs } }
  })
}
