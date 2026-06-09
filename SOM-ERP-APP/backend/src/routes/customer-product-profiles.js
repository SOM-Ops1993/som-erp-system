// routes/customer-product-profiles.js
import prisma from '../db.js'

export default async function customerProductProfileRoutes(fastify) {

  // GET /api/cp-profiles?customer=NAME — all profiles for a customer
  fastify.get('/', async (req) => {
    const { customer } = req.query
    if (!customer) return { success: true, data: [] }

    // Also check recipe existence for each product
    const profiles = await prisma.customerProductProfile.findMany({
      where: { customerName: customer.trim().toUpperCase() },
      orderBy: { orderCount: 'desc' },
    })

    // Enrich with hasRecipe flag
    const enriched = await Promise.all(profiles.map(async (p) => {
      let hasRecipe = false
      if (p.productCode) {
        const recipeCount = await prisma.recipeDb.count({ where: { productCode: p.productCode } })
        hasRecipe = recipeCount > 0
      }
      return { ...p, hasRecipe }
    }))

    return { success: true, data: enriched }
  })

  // POST /api/cp-profiles — create single profile (manual from master)
  fastify.post('/', async (req, reply) => {
    const { customerName, productName } = req.body
    if (!customerName?.trim() || !productName?.trim())
      return reply.status(400).send({ success: false, error: 'customerName and productName required' })

    const name = customerName.trim().toUpperCase()
    const pname = productName.trim()

    const existing = await prisma.customerProductProfile.findUnique({
      where: { customerName_productName: { customerName: name, productName: pname } }
    })
    if (existing)
      return reply.status(409).send({ success: false, error: 'Profile already exists for this customer + product name' })

    const profile = await prisma.customerProductProfile.create({
      data: {
        customerName:  name,
        productName:   pname,
        productCode:   req.body.productCode   || null,
        inhouseName:   req.body.inhouseName   || null,
        activeSpecs:   req.body.activeSpecs   || null,
        carrier:       req.body.carrier       || null,
        sectionName:   req.body.sectionName   || null,
        unitQty:       req.body.unitQty       ? parseFloat(req.body.unitQty)  : null,
        unitUom:       req.body.unitUom       || null,
        primaryPack:   req.body.primaryPack   || null,
        secondaryPack: req.body.secondaryPack || null,
        unitsPerCS:    req.body.unitsPerCS    ? parseInt(req.body.unitsPerCS) : null,
        totalUom:      req.body.totalUom      || 'KG',
        labelType:     req.body.labelType     || null,
        orderCount:    0,
      }
    })
    return { success: true, data: profile }
  })

  // PUT /api/cp-profiles/:id — update profile
  fastify.put('/:id', async (req, reply) => {
    const existing = await prisma.customerProductProfile.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.status(404).send({ success: false, error: 'Not found' })

    const updated = await prisma.customerProductProfile.update({
      where: { id: req.params.id },
      data: {
        productName:   req.body.productName   !== undefined ? req.body.productName.trim()           : existing.productName,
        productCode:   req.body.productCode   !== undefined ? req.body.productCode   || null        : existing.productCode,
        inhouseName:   req.body.inhouseName   !== undefined ? req.body.inhouseName   || null        : existing.inhouseName,
        activeSpecs:   req.body.activeSpecs   !== undefined ? req.body.activeSpecs   || null        : existing.activeSpecs,
        carrier:       req.body.carrier       !== undefined ? req.body.carrier       || null        : existing.carrier,
        sectionName:   req.body.sectionName   !== undefined ? req.body.sectionName   || null        : existing.sectionName,
        unitQty:       req.body.unitQty       !== undefined ? (req.body.unitQty ? parseFloat(req.body.unitQty) : null) : existing.unitQty,
        unitUom:       req.body.unitUom       !== undefined ? req.body.unitUom       || null        : existing.unitUom,
        primaryPack:   req.body.primaryPack   !== undefined ? req.body.primaryPack   || null        : existing.primaryPack,
        secondaryPack: req.body.secondaryPack !== undefined ? req.body.secondaryPack || null        : existing.secondaryPack,
        unitsPerCS:    req.body.unitsPerCS    !== undefined ? (req.body.unitsPerCS ? parseInt(req.body.unitsPerCS) : null) : existing.unitsPerCS,
        totalUom:      req.body.totalUom      !== undefined ? req.body.totalUom      || 'KG'       : existing.totalUom,
        labelType:     req.body.labelType     !== undefined ? req.body.labelType     || null        : existing.labelType,
      }
    })
    return { success: true, data: updated }
  })

  // DELETE /api/cp-profiles/:id
  fastify.delete('/:id', async (req, reply) => {
    const existing = await prisma.customerProductProfile.findUnique({ where: { id: req.params.id } })
    if (!existing) return reply.status(404).send({ success: false, error: 'Not found' })
    await prisma.customerProductProfile.delete({ where: { id: req.params.id } })
    return { success: true }
  })

  // POST /api/cp-profiles/upsert-many — auto-learn from SO save
  fastify.post('/upsert-many', async (req, reply) => {
    const { customerName, items } = req.body
    if (!customerName || !Array.isArray(items))
      return reply.status(400).send({ success: false, error: 'customerName and items[] required' })

    const name = customerName.trim().toUpperCase()
    let saved = 0

    for (const it of items) {
      const pname = (it.customerProductName || it.productName || '').trim()
      if (!pname) continue

      const update = {
        productCode:   it.inhouseProductCode || it.productCode || null,
        inhouseName:   it.inhouseProductName || null,
        activeSpecs:   it.activeSpecs        || null,
        carrier:       it.carrier            || null,
        sectionName:   it.sectionName        || null,
        unitQty:       it.unitQty            ? parseFloat(it.unitQty)  : null,
        unitUom:       it.unitUom            || null,
        primaryPack:   it.primaryPack        || it.unitPackType || null,
        secondaryPack: it.secondaryPack      || it.packingType  || null,
        unitsPerCS:    it.unitsPerCS         ? parseInt(it.unitsPerCS) : null,
        totalUom:      it.totalUom           || 'KG',
        labelType:     it.labelType          || null,
        orderCount:    { increment: 1 },
        lastOrderedAt: new Date(),
      }

      const key = { customerName_productName: { customerName: name, productName: pname } }
      const existing = await prisma.customerProductProfile.findUnique({ where: key })

      if (existing) {
        await prisma.customerProductProfile.update({ where: key, data: update })
      } else {
        const { orderCount, lastOrderedAt, ...createRest } = update
        await prisma.customerProductProfile.create({
          data: { customerName: name, productName: pname, ...createRest, orderCount: 1, lastOrderedAt: new Date() }
        })
      }
      saved++
    }
    return { success: true, saved }
  })
}
