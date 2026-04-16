import prisma from '../db.js'

export default async function rmMasterRoutes(fastify) {
  // GET all items (for dropdowns)
  fastify.get('/', async (req, reply) => {
    const q = req.query.q || req.query.search
    const items = await prisma.rmMaster.findMany({
      where: q
        ? { OR: [
            { itemName: { contains: q, mode: 'insensitive' } },
            { itemCode: { contains: q, mode: 'insensitive' } },
          ]}
        : {},
      orderBy: { itemName: 'asc' },
    })
    return { success: true, data: items }
  })

  // GET single item
  fastify.get('/:itemCode', async (req, reply) => {
    const item = await prisma.rmMaster.findUnique({ where: { itemCode: req.params.itemCode } })
    if (!item) return reply.status(404).send({ success: false, error: 'Item not found' })
    return { success: true, data: item }
  })

  // POST create item
  fastify.post('/', async (req, reply) => {
    const { itemCode, itemName, uom, reorderLevel } = req.body
    if (!itemCode || !itemName || !uom) {
      return reply.status(400).send({ success: false, error: 'itemCode, itemName, uom required' })
    }
    const item = await prisma.rmMaster.create({
      data: { itemCode: itemCode.trim(), itemName: itemName.trim(), uom: uom.trim(), reorderLevel: reorderLevel ? Number(reorderLevel) : null },
    })
    return reply.status(201).send({ success: true, data: item })
  })

  // PUT update item
  fastify.put('/:itemCode', async (req, reply) => {
    const { itemName, uom, reorderLevel } = req.body
    const item = await prisma.rmMaster.update({
      where: { itemCode: req.params.itemCode },
      data: { itemName, uom, reorderLevel: reorderLevel ? Number(reorderLevel) : null },
    })
    return { success: true, data: item }
  })

  // DELETE item
  fastify.delete('/:itemCode', async (req, reply) => {
    try {
      await prisma.rmMaster.delete({ where: { itemCode: req.params.itemCode } })
      return { success: true }
    } catch (err) {
      if (err.code === 'P2025') {
        return reply.status(404).send({ success: false, error: 'Item not found' })
      }
      if (err.code === 'P2003') {
        return reply.status(409).send({ success: false, error: 'Cannot delete: item has associated records (inward, packs, etc.)' })
      }
      throw err
    }
  })

  // GET warehouses list (from inward records)
  fastify.get('/meta/warehouses', async () => {
    const result = await prisma.$queryRaw`SELECT DISTINCT warehouse FROM inward ORDER BY warehouse`
    return { success: true, data: result.map((r) => r.warehouse) }
  })
}
