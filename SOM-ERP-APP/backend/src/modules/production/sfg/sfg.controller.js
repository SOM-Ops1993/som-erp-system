import prisma from '../../../db.js'

export async function listSfg(req, res) {
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
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getSfgSummary(req, res) {
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
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getSfg(req, res) {
  try {
    const sfg = await prisma.sfgMaster.findUnique({ where: { sfgId: req.params.sfgId } })
    if (!sfg) return res.status(404).json({ success: false, error: 'Not found' })
    const indent = await prisma.indentMaster.findUnique({ where: { indentId: sfg.indentId }, include: { details: true } })
    return res.json({ success: true, data: { ...sfg, indent } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function updateSfg(req, res) {
  try {
    const { formulatedQty, packedQty, sfgQty: manualSfgQty, remarks } = req.body
    const existing = await prisma.sfgMaster.findUnique({ where: { sfgId: req.params.sfgId } })
    if (!existing) return res.status(404).json({ success: false, error: 'SFG entry not found' })
    const fq = formulatedQty !== undefined ? parseFloat(formulatedQty) : existing.formulatedQty
    const pq = packedQty !== undefined ? parseFloat(packedQty) : existing.packedQty
    const sfgBalance = manualSfgQty !== undefined ? parseFloat(manualSfgQty) : Math.max(0, fq - pq)
    const status = sfgBalance <= 0 && fq > 0 ? 'COMPLETE' : sfgBalance > 0 ? 'PARTIAL' : 'OPEN'
    const updated = await prisma.sfgMaster.update({ where: { sfgId: req.params.sfgId }, data: { formulatedQty: fq, packedQty: pq, sfgQty: sfgBalance, status, remarks: remarks !== undefined ? remarks : existing.remarks } })
    return res.json({ success: true, data: updated })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
