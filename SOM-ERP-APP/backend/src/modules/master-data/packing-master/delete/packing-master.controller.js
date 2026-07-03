import prisma from '../../../../db.js'

export const deletePackingMaterial = async (req, res) => {
  try {
    await prisma.packingMaterial.update({
      where: { id: req.params.id },
      data: { isActive: false },
    })
    return res.json({ success: true, message: 'Deleted' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
