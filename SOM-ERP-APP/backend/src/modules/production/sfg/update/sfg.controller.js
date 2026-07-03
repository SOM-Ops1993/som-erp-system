import prisma from '../../../../db.js'

export const updateSfg = async (req, res) => {
  try {
    const { formulatedQty, packedQty, sfgQty: manualSfgQty, remarks } = req.body
    const existing = await prisma.sfgMaster.findUnique({ where: { sfgId: req.params.sfgId } })
    if (!existing) return res.status(404).json({ success: false, error: 'SFG entry not found', code: 'NOT_FOUND' })
    const fq = formulatedQty !== undefined ? parseFloat(formulatedQty) : existing.formulatedQty
    const pq = packedQty !== undefined ? parseFloat(packedQty) : existing.packedQty
    const sfgBalance = manualSfgQty !== undefined ? parseFloat(manualSfgQty) : Math.max(0, fq - pq)
    const status = sfgBalance <= 0 && fq > 0 ? 'COMPLETE' : sfgBalance > 0 ? 'PARTIAL' : 'OPEN'
    const updated = await prisma.sfgMaster.update({ where: { sfgId: req.params.sfgId }, data: { formulatedQty: fq, packedQty: pq, sfgQty: sfgBalance, status, remarks: remarks !== undefined ? remarks : existing.remarks } })
    return res.json({ success: true, data: updated })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
