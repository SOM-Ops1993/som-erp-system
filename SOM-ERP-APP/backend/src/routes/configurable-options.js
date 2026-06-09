// routes/configurable-options.js
// Manages dropdown lists: CARRIER, PRIMARY_PACK, SECONDARY_PACK
import prisma from '../db.js'

export default async function configurableOptionRoutes(fastify) {

  // GET /api/config-options?category=CARRIER  (or omit for all)
  fastify.get('/', async (req) => {
    const { category } = req.query
    const where = category ? { category, isActive: true } : { isActive: true }
    const options = await prisma.configurableOption.findMany({
      where,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { value: 'asc' }],
    })
    return { success: true, data: options }
  })

  // POST /api/config-options — add new option
  fastify.post('/', async (req, reply) => {
    const { category, value } = req.body
    if (!category?.trim() || !value?.trim())
      return reply.status(400).send({ success: false, error: 'category and value required' })

    const validCategories = ['CARRIER', 'PRIMARY_PACK', 'SECONDARY_PACK']
    if (!validCategories.includes(category.toUpperCase()))
      return reply.status(400).send({ success: false, error: `category must be one of: ${validCategories.join(', ')}` })

    const existing = await prisma.configurableOption.findUnique({
      where: { category_value: { category: category.toUpperCase(), value: value.trim() } }
    })
    if (existing) {
      // Reactivate if soft-deleted
      if (!existing.isActive) {
        const updated = await prisma.configurableOption.update({
          where: { id: existing.id },
          data: { isActive: true }
        })
        return { success: true, data: updated }
      }
      return reply.status(409).send({ success: false, error: 'Option already exists' })
    }

    // Get max sort order for category
    const maxOrder = await prisma.configurableOption.aggregate({
      where: { category: category.toUpperCase() },
      _max: { sortOrder: true }
    })

    const option = await prisma.configurableOption.create({
      data: {
        category:  category.toUpperCase(),
        value:     value.trim(),
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      }
    })
    return { success: true, data: option }
  })

  // PUT /api/config-options/:id — rename value
  fastify.put('/:id', async (req, reply) => {
    const existing = await prisma.configurableOption.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.status(404).send({ success: false, error: 'Not found' })

    const updated = await prisma.configurableOption.update({
      where: { id: req.params.id },
      data: {
        value:     req.body.value     ? req.body.value.trim() : existing.value,
        sortOrder: req.body.sortOrder !== undefined ? parseInt(req.body.sortOrder) : existing.sortOrder,
      }
    })
    return { success: true, data: updated }
  })

  // DELETE /api/config-options/:id — soft delete
  fastify.delete('/:id', async (req, reply) => {
    const existing = await prisma.configurableOption.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.status(404).send({ success: false, error: 'Not found' })
    await prisma.configurableOption.update({ where: { id: req.params.id }, data: { isActive: false } })
    return { success: true }
  })
}
