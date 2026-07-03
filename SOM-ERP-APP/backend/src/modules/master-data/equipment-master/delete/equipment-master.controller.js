import prisma from '../../../../db.js'

export const deleteEquipment = async (req, res) => {
  try {
    await prisma.equipmentMaster.delete({ where: { equipId: req.params.equipId } })
    return res.json({ success: true, message: 'Deleted' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
