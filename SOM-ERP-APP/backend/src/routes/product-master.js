import prisma from '../db.js'

export default async function productMasterRoutes(fastify) {
  fastify.get('/', async (req) => {
    const { search } = req.query
    const where = search
      ? { OR: [
          { productCode: { contains: search, mode: 'insensitive' } },
          { productName: { contains: search, mode: 'insensitive' } },
        ]}
      : {}
    const items = await prisma.productMaster.findMany({ where, orderBy: { productName: 'asc' } })
    return { success: true, data: items }
  })

  fastify.get('/:productCode', async (req, reply) => {
    const item = await prisma.productMaster.findUnique({ where: { productCode: req.params.productCode } })
    if (!item) return reply.status(404).send({ success: false, error: 'Product not found' })
    return { success: true, data: item }
  })

  fastify.post('/', async (req, reply) => {
    const { productCode, productName, plant } = req.body
    if (!productCode || !productName)
      return reply.status(400).send({ success: false, error: 'productCode and productName are required' })
    const existing = await prisma.productMaster.findFirst({
      where: { OR: [{ productCode }, { productName }] }
    })
    if (existing) return reply.status(409).send({ success: false, error: 'Product code or name already exists' })
    const item = await prisma.productMaster.create({ data: { productCode, productName, plant: plant || '' } })
    return reply.status(201).send({ success: true, data: item })
  })

  fastify.put('/:productCode', async (req, reply) => {
    const { productName, plant } = req.body
    const item = await prisma.productMaster.update({
      where: { productCode: req.params.productCode },
      data: { productName, plant },
    })
    return { success: true, data: item }
  })

  fastify.delete('/:productCode', async (req, reply) => {
    await prisma.productMaster.delete({ where: { productCode: req.params.productCode } })
    return { success: true, message: 'Deleted' }
  })
}
