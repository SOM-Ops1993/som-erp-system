import prisma from '../db.js'

export default async function rmMasterRoutes(fastify) {
  // List all RM
  fastify.get('/', async (req, reply) => {
    const { search } = req.query
    const where = search
      ? { OR: [
          { itemCode: { contains: search, mode: 'insensitive' } },
          { itemName: { contains: search, mode: 'insensitive' } },
        ]}
      : {}
    const items = await prisma.rmMaster.findMany({ where, orderBy: { itemName: 'asc' } })
    return { success: true, data: items }
  })

  // Get single RM
  fastify.get('/:itemCode', async (req, reply) => {
    const item = await prisma.rmMaster.findUnique({ where: { itemCode: req.params.itemCode } })
    if (!item) return reply.status(404).send({ success: false, error: 'RM not found' })
    return { success: true, data: item }
  })

  // Create Item
  fastify.post('/', async (req, reply) => {
    const { itemCode, itemName, uom, trackingType } = req.body
    if (!itemCode || !itemName || !uom)
      return reply.status(400).send({ success: false, error: 'itemCode, itemName and uom are required' })
    const existing = await prisma.rmMaster.findFirst({
      where: { OR: [{ itemCode }, { itemName }] }
    })
    if (existing) return reply.status(409).send({ success: false, error: 'Item code or name already exists' })
    const item = await prisma.rmMaster.create({
      data: { itemCode, itemName, uom, trackingType: trackingType || 'PACK' }
    })
    return reply.status(201).send({ success: true, data: item })
  })

  // Update Item
  fastify.put('/:itemCode', async (req, reply) => {
    const { itemName, uom, trackingType } = req.body
    const data = { itemName, uom }
    if (trackingType) data.trackingType = trackingType
    const item = await prisma.rmMaster.update({
      where: { itemCode: req.params.itemCode },
      data,
    })
    return { success: true, data: item }
  })

  // Delete RM
  fastify.delete('/:itemCode', async (req, reply) => {
    await prisma.rmMaster.delete({ where: { itemCode: req.params.itemCode } })
    return { success: true, message: 'Deleted' }
  })

  // Warehouses meta
  fastify.get('/meta/warehouses', async () => {
    const rows = await prisma.inward.findMany({ distinct: ['warehouse'], select: { warehouse: true } })
    return { success: true, data: rows.map(r => r.warehouse) }
  })
}
