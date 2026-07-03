import prisma from '../../../../db.js'

export const deleteFormulationCycle = async (req, res) => {
  try {
    await prisma.formulationCycle.delete({ where: { id: req.params.cycleId } })
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};
