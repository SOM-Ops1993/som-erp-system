import prisma from '../../../../db.js'

export const deleteGateInward = async (req, res) => {
  try {
    await prisma.gateInward.delete({ where: { inwardId: req.params.id } })
    return res.json({ success: true, message: 'Gate inward deleted' })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate inward not found', code: 'NOT_FOUND' })
    console.error('deleteGateInward error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const deleteGateOutward = async (req, res) => {
  try {
    await prisma.gateOutward.delete({ where: { outwardId: req.params.id } })
    return res.json({ success: true, message: 'Gate outward deleted' })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate outward not found', code: 'NOT_FOUND' })
    console.error('deleteGateOutward error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
