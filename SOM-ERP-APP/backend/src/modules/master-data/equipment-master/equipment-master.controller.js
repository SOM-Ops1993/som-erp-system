import prisma from '../../../db.js'

export async function listEquipment(req, res) {
  try {
    const items = await prisma.equipmentMaster.findMany({ orderBy: { equipName: 'asc' } })
    return res.json({ success: true, data: items })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createEquipment(req, res) {
  try {
    const { equipName, plant, workingVolume, operation } = req.body
    if (!equipName) return res.status(400).json({ success: false, error: 'equipName is required' })
    const existing = await prisma.equipmentMaster.findUnique({ where: { equipName } })
    if (existing) return res.status(409).json({ success: false, error: 'Equipment already exists' })
    const item = await prisma.equipmentMaster.create({
      data: { equipName, plant: plant || '', workingVolume: workingVolume ? parseFloat(workingVolume) : null, operation: operation || '' }
    })
    return res.status(201).json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function updateEquipment(req, res) {
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
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function deleteEquipment(req, res) {
  try {
    await prisma.equipmentMaster.delete({ where: { equipId: req.params.equipId } })
    return res.json({ success: true, message: 'Deleted' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
