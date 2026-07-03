import prisma from '../../../../../db.js'

export const deleteMicrobe = async (req, res) => {
  try {
    await prisma.microbeMaster.delete({ where: { microbeId: req.params.id } })
    return res.json({ success: true })
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ success: false, error: 'Microbe not found', code: 'NOT_FOUND' })
    return res.status(500).json({ success: false, error: e.message, code: 'INTERNAL_ERROR' })
  }
}
