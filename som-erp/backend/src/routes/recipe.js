import prisma from '../db.js'

export default async function recipeRoutes(fastify) {

  // GET all recipe entries (optionally filtered by product)
  fastify.get('/', async (req, reply) => {
    const { productCode } = req.query
    const data = await prisma.recipeDb.findMany({
      where: productCode ? { productCode } : {},
      orderBy: [{ productName: 'asc' }, { rmName: 'asc' }],
    })
    return { success: true, data }
  })

  // GET all unique products
  fastify.get('/products', async (req, reply) => {
    const products = await prisma.$queryRaw`
      SELECT DISTINCT product_code, product_name, batch_unit FROM recipe_db ORDER BY product_name
    `
    return { success: true, data: products }
  })

  // POST bulk upsert (Excel-like grid save)
  // Frontend sends entire grid for a product as array
  fastify.post('/bulk-save', async (req, reply) => {
    const { rows } = req.body
    if (!Array.isArray(rows) || rows.length === 0) {
      return reply.status(400).send({ success: false, error: 'rows array required' })
    }

    // Validate each row
    for (const row of rows) {
      if (!row.productCode || !row.rmCode || !row.qtyPerUnit) {
        return reply.status(400).send({
          success: false,
          error: 'Each row needs productCode, rmCode, qtyPerUnit',
        })
      }
    }

    // Upsert all rows
    const results = await prisma.$transaction(
      rows.map((row) =>
        prisma.recipeDb.upsert({
          where: { productCode_rmCode: { productCode: row.productCode, rmCode: row.rmCode } },
          update: {
            productName: row.productName,
            batchUnit: row.batchUnit || 'Kg',
            rmName: row.rmName,
            qtyPerUnit: parseFloat(row.qtyPerUnit),
            uom: row.uom || 'Kg',
          },
          create: {
            productCode: row.productCode,
            productName: row.productName,
            batchUnit: row.batchUnit || 'Kg',
            rmCode: row.rmCode,
            rmName: row.rmName,
            qtyPerUnit: parseFloat(row.qtyPerUnit),
            uom: row.uom || 'Kg',
          },
        })
      )
    )

    return { success: true, saved: results.length }
  })

  // DELETE a single recipe row
  fastify.delete('/:recipeId', async (req, reply) => {
    await prisma.recipeDb.delete({ where: { recipeId: BigInt(req.params.recipeId) } })
    return { success: true }
  })

  // DELETE all rows for a product (clear product BOM)
  fastify.delete('/product/:productCode', async (req, reply) => {
    const { count } = await prisma.recipeDb.deleteMany({
      where: { productCode: req.params.productCode },
    })
    return { success: true, deleted: count }
  })
}
