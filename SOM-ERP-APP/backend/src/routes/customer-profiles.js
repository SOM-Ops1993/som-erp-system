import prisma from '../db.js'

export default async function customerProfileRoutes(fastify) {

  // GET /api/customer-profiles — all customers
  fastify.get('/', async (req) => {
    const profiles = await prisma.customerProfile.findMany({
      orderBy: { customerName: 'asc' },
    })
    return { success: true, data: profiles }
  })

  // GET /api/customer-profiles/:id
  fastify.get('/:id', async (req, reply) => {
    const profile = await prisma.customerProfile.findUnique({ where: { id: req.params.id } })
    if (!profile) return reply.status(404).send({ success: false, error: 'Not found' })
    return { success: true, data: profile }
  })

  // POST /api/customer-profiles — create new customer (manual from master)
  fastify.post('/', async (req, reply) => {
    const { customerName, company, orderType } = req.body
    if (!customerName?.trim())
      return reply.status(400).send({ success: false, error: 'customerName required' })
    const name = customerName.trim().toUpperCase()
    const existing = await prisma.customerProfile.findUnique({ where: { customerName: name } })
    if (existing)
      return reply.status(409).send({ success: false, error: 'Customer already exists' })
    const profile = await prisma.customerProfile.create({
      data: { customerName: name, company: company || '', orderType: orderType || 'DOMESTIC', orderCount: 0 }
    })
    return { success: true, data: profile }
  })

  // PUT /api/customer-profiles/:id — update
  fastify.put('/:id', async (req, reply) => {
    const existing = await prisma.customerProfile.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.status(404).send({ success: false, error: 'Not found' })
    const { customerName, company, orderType } = req.body
    const updated = await prisma.customerProfile.update({
      where: { id: req.params.id },
      data: {
        customerName: customerName ? customerName.trim().toUpperCase() : existing.customerName,
        company:   company   ?? existing.company,
        orderType: orderType ?? existing.orderType,
      }
    })
    return { success: true, data: updated }
  })

  // DELETE /api/customer-profiles/:id
  fastify.delete('/:id', async (req, reply) => {
    const existing = await prisma.customerProfile.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.status(404).send({ success: false, error: 'Not found' })
    await prisma.customerProfile.delete({ where: { id: req.params.id } })
    return { success: true }
  })

  // POST /api/customer-profiles/upsert — auto-learn when SO is saved
  fastify.post('/upsert', async (req, reply) => {
    const { customerName, company, orderType } = req.body
    if (!customerName?.trim())
      return reply.status(400).send({ success: false, error: 'customerName required' })
    const name = customerName.trim().toUpperCase()
    const existing = await prisma.customerProfile.findUnique({ where: { customerName: name } })
    if (existing) {
      await prisma.customerProfile.update({
        where: { customerName: name },
        data: { company: company || existing.company, orderType: orderType || existing.orderType, orderCount: { increment: 1 } }
      })
    } else {
      await prisma.customerProfile.create({
        data: { customerName: name, company: company || '', orderType: orderType || 'DOMESTIC', orderCount: 1 }
      })
    }
    return { success: true }
  })

  // POST /api/customer-profiles/seed — bulk seed from Excel import
  fastify.post('/seed', async (req, reply) => {
    const { profiles } = req.body
    if (!Array.isArray(profiles))
      return reply.status(400).send({ success: false, error: 'profiles array required' })
    let created = 0, updated = 0
    for (const p of profiles) {
      if (!p.customerName?.trim()) continue
      const name = p.customerName.trim().toUpperCase()
      const existing = await prisma.customerProfile.findUnique({ where: { customerName: name } })
      if (existing) {
        if (p.orderCount > existing.orderCount) {
          await prisma.customerProfile.update({
            where: { customerName: name },
            data: { company: p.company || existing.company, orderType: p.orderType || existing.orderType, orderCount: p.orderCount }
          })
          updated++
        }
      } else {
        await prisma.customerProfile.create({
          data: { customerName: name, company: p.company || '', orderType: p.orderType || 'DOMESTIC', orderCount: p.orderCount || 1 }
        })
        created++
      }
    }
    return { success: true, created, updated }
  })
}
