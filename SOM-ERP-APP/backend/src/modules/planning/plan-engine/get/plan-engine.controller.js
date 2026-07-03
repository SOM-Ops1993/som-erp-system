import prisma from '../../../../db.js'

export const listPlans = async (req, res) => {
  try {
    const { section, status, date, diNo } = req.query
    const where = {}
    if (section) where.sectionType = section
    if (status) where.status = status
    if (diNo) where.diNo = { contains: diNo, mode: 'insensitive' }
    if (date) {
      const d = new Date(date)
      where.plannedDate = { gte: new Date(d.toISOString().split('T')[0] + 'T00:00:00.000Z'), lte: new Date(d.toISOString().split('T')[0] + 'T23:59:59.999Z') }
    }
    const plans = await prisma.productionPlan.findMany({ where, orderBy: [{ sectionType: 'asc' }, { plannedDate: 'asc' }] })
    const resolvedPlans = await Promise.all(plans.map(async (plan) => {
      if (plan.productCode || !plan.productName) return plan
      const pm = await prisma.productMaster.findFirst({ where: { productName: { equals: plan.productName, mode: 'insensitive' } }, select: { productCode: true } })
      if (!pm) return plan
      await prisma.productionPlan.update({ where: { id: plan.id }, data: { productCode: pm.productCode } })
      return { ...plan, productCode: pm.productCode }
    }))
    return res.json({ success: true, data: resolvedPlans })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getPlan = async (req, res) => {
  try {
    const plan = await prisma.productionPlan.findUnique({ where: { id: req.params.id } })
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found', code: 'NOT_FOUND' })
    return res.json({ success: true, data: plan })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const listLogs = async (req, res) => {
  try {
    const logs = await prisma.plannerLog.findMany({ orderBy: { runAt: 'desc' }, take: 10 })
    return res.json({ success: true, data: logs })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getDashboard = async (req, res) => {
  try {
    const sections = ['NANO', 'BOTANICAL', 'LIQUID', 'POWDER', 'GRANULES']
    const statuses = ['DRAFT', 'REVIEWED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
    const [bySectionRaw, byStatusRaw, pendingOrders, lastLog] = await Promise.all([
      Promise.all(sections.map(s => prisma.productionPlan.count({ where: { sectionType: s, status: { notIn: ['CANCELLED'] } } }).then(c => ({ section: s, count: c })))),
      Promise.all(statuses.map(s => prisma.productionPlan.count({ where: { status: s } }).then(c => ({ status: s, count: c })))),
      prisma.salesOrderItem.count({ where: { status: 'PENDING' } }),
      prisma.plannerLog.findFirst({ orderBy: { runAt: 'desc' } }),
    ])
    return res.json({ success: true, data: { bySection: bySectionRaw, byStatus: byStatusRaw, pendingOrders, lastRun: lastLog } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const listPendingOrders = async (req, res) => {
  try {
    const items = await prisma.salesOrderItem.findMany({
      where: { status: 'PENDING' },
      include: { salesOrder: { select: { soId: true, diNo: true, customerName: true, priority: true, estimatedDispatchDate: true, company: true } } },
      orderBy: { updatedAt: 'desc' },
    })
    return res.json({ success: true, data: items })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
