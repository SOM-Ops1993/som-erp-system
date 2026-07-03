import prisma from '../../../../db.js'

export const deleteLocation = async (req, res) => {
  try {
    const active = await prisma.bulkLotEntry.count({ where: { locationId: req.params.locationId, status: 'ACTIVE', remainingQty: { gt: 0 } } })
    if (active > 0) return res.status(400).json({ success: false, error: 'Cannot delete location with active stock', code: 'VALIDATION_ERROR' })
    await prisma.bulkLocation.delete({ where: { locationId: req.params.locationId } })
    return res.json({ success: true, message: 'Deleted' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
