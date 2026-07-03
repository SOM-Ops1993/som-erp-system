import prisma from '../../../../db.js'

export const listEquipment = async (req, res) => {
  try {
    const items = await prisma.equipmentMaster.findMany({ orderBy: { equipName: 'asc' } })
    return res.json({ success: true, data: items })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
