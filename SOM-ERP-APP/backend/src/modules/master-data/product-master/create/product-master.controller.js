import prisma from '../../../../db.js'

export const createProduct = async (req, res) => {
  try {
    const { productCode, productName, plant } = req.body
    if (!productCode || !productName)
      return res.status(400).json({ success: false, error: 'productCode and productName are required', code: 'VALIDATION_ERROR' })
    const existing = await prisma.productMaster.findFirst({ where: { OR: [{ productCode }, { productName }] } })
    if (existing) return res.status(409).json({ success: false, error: 'Product code or name already exists', code: 'CONFLICT' })
    const item = await prisma.productMaster.create({ data: { productCode, productName, plant: plant || '' } })
    return res.status(201).json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
