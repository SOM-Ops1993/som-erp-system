import prisma from '../../../../db.js'

export const updateProduct = async (req, res) => {
  try {
    const { productName, plant } = req.body
    const item = await prisma.productMaster.update({
      where: { productCode: req.params.productCode },
      data: { productName, plant },
    })
    return res.json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
