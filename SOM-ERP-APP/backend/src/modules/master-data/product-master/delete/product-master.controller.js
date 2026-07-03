import prisma from '../../../../db.js'

export const deleteProduct = async (req, res) => {
  try {
    await prisma.productMaster.delete({ where: { productCode: req.params.productCode } })
    return res.json({ success: true, message: 'Deleted' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
