import prisma from '../../../../db.js'

export const listSfg = async (req, res) => {
  try {
    const { productCode, status, showAll } = req.query
    const where = {}
    if (productCode) where.productCode = productCode
    if (status) where.status = status
    if (showAll !== 'true') {
      const closedIndents = await prisma.indentMaster.findMany({ where: { status: 'CLOSED' }, select: { indentId: true } })
      const closedIds = closedIndents.map(i => i.indentId)
      if (closedIds.length === 0) return res.json({ success: true, data: [] })
      where.indentId = { in: closedIds }
    }
    const entries = await prisma.sfgMaster.findMany({ where, orderBy: { createdAt: 'desc' } })
    return res.json({ success: true, data: entries })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getSfgSummary = async (req, res) => {
  try {
    const entries = await prisma.sfgMaster.findMany({ where: { sfgQty: { gt: 0 } } })
    const summary = {}
    for (const e of entries) {
      if (!summary[e.productCode]) summary[e.productCode] = { productCode: e.productCode, productName: e.productName, totalSfgQty: 0, entries: [] }
      summary[e.productCode].totalSfgQty += e.sfgQty
      summary[e.productCode].entries.push(e)
    }
    return res.json({ success: true, data: Object.values(summary) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getSfg = async (req, res) => {
  try {
    const sfg = await prisma.sfgMaster.findUnique({ where: { sfgId: req.params.sfgId } })
    if (!sfg) return res.status(404).json({ success: false, error: 'Not found', code: 'NOT_FOUND' })
    const indent = await prisma.indentMaster.findUnique({ where: { indentId: sfg.indentId }, include: { details: true } })
    return res.json({ success: true, data: { ...sfg, indent } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
