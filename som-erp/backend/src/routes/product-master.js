import prisma from '../db.js'

export default async function productMasterRoutes(fastify) {

  // GET all products
  fastify.get('/', async (req, reply) => {
    const { q } = req.query
    const where = q
      ? {
          OR: [
            { productCode: { contains: q, mode: 'insensitive' } },
            { productName: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}

    const data = await prisma.productMaster.findMany({
      where,
      orderBy: { productName: 'asc' },
    })
    return { success: true, data }
  })

  // GET single product
  fastify.get('/:productCode', async (req, reply) => {
    const data = await prisma.productMaster.findUnique({
      where: { productCode: req.params.productCode },
    })
    if (!data) return reply.status(404).send({ success: false, error: 'Product not found' })
    return { success: true, data }
  })

  // POST create product
  fastify.post('/', async (req, reply) => {
    const { productCode, productName, batchUnit, plant, equipment, category, remarks } = req.body
    if (!productCode || !productName) {
      return reply.status(400).send({ success: false, error: 'productCode and productName required' })
    }
    try {
      const data = await prisma.productMaster.create({
        data: { productCode, productName, batchUnit: batchUnit || 'Kg', plant, equipment, category, remarks },
      })
      return reply.status(201).send({ success: true, data })
    } catch (err) {
      if (err.code === 'P2002') {
        return reply.status(409).send({ success: false, error: 'Product code already exists' })
      }
      throw err
    }
  })

  // PUT update product
  fastify.put('/:productCode', async (req, reply) => {
    const { productName, batchUnit, plant, equipment, category, remarks } = req.body
    try {
      const data = await prisma.productMaster.update({
        where: { productCode: req.params.productCode },
        data: { productName, batchUnit, plant, equipment, category, remarks },
      })
      return { success: true, data }
    } catch (err) {
      if (err.code === 'P2025') {
        return reply.status(404).send({ success: false, error: 'Product not found' })
      }
      throw err
    }
  })

  // DELETE product
  fastify.delete('/:productCode', async (req, reply) => {
    try {
      await prisma.productMaster.delete({ where: { productCode: req.params.productCode } })
      return { success: true }
    } catch (err) {
      if (err.code === 'P2025') {
        return reply.status(404).send({ success: false, error: 'Product not found' })
      }
      throw err
    }
  })

  // POST bulk sync from recipe_db — import products that exist in recipe_db but not product_master
  fastify.post('/sync-from-recipe', async (req, reply) => {
    const recipeProducts = await prisma.$queryRaw`
      SELECT DISTINCT product_code, product_name, batch_unit FROM recipe_db ORDER BY product_name
    `
    let created = 0
    for (const rp of recipeProducts) {
      const exists = await prisma.productMaster.findUnique({ where: { productCode: rp.product_code } })
      if (!exists) {
        await prisma.productMaster.create({
          data: {
            productCode: rp.product_code,
            productName: rp.product_name,
            batchUnit: rp.batch_unit || 'Kg',
          },
        })
        created++
      }
    }
    return { success: true, created, message: `${created} products imported from Recipe DB` }
  })
}
