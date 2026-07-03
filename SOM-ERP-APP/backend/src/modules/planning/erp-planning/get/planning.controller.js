import prisma from '../../../../db.js'

export const listErpPlans = async (req, res) => {
  try {
    const { status, product_code, limit = 50, offset = 0 } = req.query

    const where = {}
    if (status)       where.status      = status
    if (product_code) where.productCode = product_code

    const [plans, total] = await Promise.all([
      prisma.erpProductionPlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip:    Number(offset),
        take:    Number(limit),
      }),
      prisma.erpProductionPlan.count({ where }),
    ])

    // Batch-resolve user names and sales order fields
    const userIds   = [...new Set([...plans.map(p => p.createdBy), ...plans.map(p => p.publishedBy)].filter(Boolean))]
    const diNumbers = [...new Set(plans.map(p => p.diNumber).filter(Boolean))]

    const [users, salesOrders] = await Promise.all([
      userIds.length   ? prisma.user.findMany({ where: { userId: { in: userIds } }, select: { userId: true, fullName: true } }) : [],
      diNumbers.length ? prisma.erpSalesOrder.findMany({ where: { diNumber: { in: diNumbers } }, select: { diNumber: true, customerName: true, etd: true, priority: true } }) : [],
    ])

    const userMap = Object.fromEntries(users.map(u => [u.userId, u.fullName]))
    const soMap   = Object.fromEntries(salesOrders.map(s => [s.diNumber, s]))

    const data = plans.map(p => ({
      ...p,
      customer_name:       soMap[p.diNumber]?.customerName ?? null,
      etd:                 soMap[p.diNumber]?.etd          ?? null,
      priority:            soMap[p.diNumber]?.priority     ?? null,
      created_by_name:     userMap[p.createdBy]            ?? null,
      published_by_name:   userMap[p.publishedBy]          ?? null,
    }))

    return res.json({ success: true, data, total })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getErpPlan = async (req, res) => {
  try {
    const plan = await prisma.erpProductionPlan.findUnique({ where: { planId: req.params.id } })
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found', code: 'NOT_FOUND' })

    const jobs = await prisma.erpProductionJob.findMany({
      where:   { planId: req.params.id },
      include: { equipment: { select: { equipmentName: true } } },
      orderBy: { batchNo: 'asc' },
    })
    const jobsFlat = jobs.map(j => ({
      ...j,
      equipment_name: j.equipment?.equipmentName ?? null,
      equipment: undefined,
    }))
    return res.json({ success: true, data: { ...plan, jobs: jobsFlat } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const listTimeMotion = async (req, res) => {
  try {
    const { product_code, equipment_id } = req.query
    // time_motion_model is a database VIEW with no Prisma model — must use raw SQL
    const data = await prisma.$queryRaw`
      SELECT tmm.*, ep.product_name, ee.equipment_name
      FROM time_motion_model tmm
      LEFT JOIN erp_products ep ON ep.product_code = tmm.product_code
      LEFT JOIN erp_equipment ee ON ee.equipment_id = tmm.equipment_id
      WHERE (${product_code || null}::text IS NULL OR tmm.product_code = ${product_code || null})
        AND (${equipment_id || null}::uuid IS NULL OR tmm.equipment_id = ${equipment_id || null}::uuid)
      ORDER BY tmm.product_code, tmm.operation_stage
    `
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getPlannerQueue = async (req, res) => {
  try {
    const horizonDays = Number(req.query.horizon || 3)
    const horizonDate = new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000)

    const orders = await prisma.erpSalesOrder.findMany({
      where:   { status: 'confirmed', etd: { lte: horizonDate } },
      orderBy: [{ priority: 'desc' }, { etd: 'asc' }],
    })

    const productCodes = [...new Set(orders.map(o => o.productCode).filter(Boolean))]
    const diNumbers    = orders.map(o => o.diNumber)

    const [products, plans] = await Promise.all([
      productCodes.length ? prisma.erpProduct.findMany({
        where:  { productCode: { in: productCodes } },
        select: { productCode: true, isMicrobial: true, consolidationWindowDays: true, plantId: true },
      }) : [],
      prisma.erpProductionPlan.findMany({
        where:  { diNumber: { in: diNumbers }, status: { not: 'cancelled' } },
        select: { diNumber: true, planId: true, status: true },
      }),
    ])

    const productMap = Object.fromEntries(products.map(p => [p.productCode, p]))
    const planMap    = {}
    for (const p of plans) planMap[p.diNumber] = p  // last plan per DI wins

    const data = orders.map(o => ({
      ...o,
      is_microbial:              productMap[o.productCode]?.isMicrobial              ?? null,
      consolidation_window_days: productMap[o.productCode]?.consolidationWindowDays  ?? null,
      plant_id:                  productMap[o.productCode]?.plantId                  ?? null,
      plan_id:                   planMap[o.diNumber]?.planId                         ?? null,
      plan_status:               planMap[o.diNumber]?.status                         ?? null,
    }))

    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
