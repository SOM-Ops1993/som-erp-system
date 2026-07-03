import prisma from '../../../../db.js'

export const updateEquipment = async (req, res) => {
  try {
    const { equipName, plant, workingVolume, operation } = req.body
    const item = await prisma.equipmentMaster.update({
      where: { equipId: req.params.equipId },
      data: {
        equipName,
        plant: plant ?? '',
        workingVolume: workingVolume !== undefined ? parseFloat(workingVolume) || null : undefined,
        operation: operation ?? '',
      },
    })
    return res.json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
