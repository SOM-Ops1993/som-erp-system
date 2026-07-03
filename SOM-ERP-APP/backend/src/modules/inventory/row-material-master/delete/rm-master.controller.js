import prisma from '../../../../db.js'

export const deleteRm = async (req, res) => {
  try {
    await prisma.rmMaster.delete({ where: { itemCode: req.params.itemCode } })
    return res.json({ success: true, message: 'Deleted' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
