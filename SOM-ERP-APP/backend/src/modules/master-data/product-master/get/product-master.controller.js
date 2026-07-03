import prisma from '../../../../db.js'

export const listProducts = async (req, res) => {
  try {
    const { search } = req.query
    const where = search
      ? { OR: [
          { productCode: { contains: search, mode: 'insensitive' } },
          { productName: { contains: search, mode: 'insensitive' } },
        ]}
      : {}
    const items = await prisma.productMaster.findMany({ where, orderBy: { productName: 'asc' } })
    return res.json({ success: true, data: items })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getProduct = async (req, res) => {
  try {
    const item = await prisma.productMaster.findUnique({ where: { productCode: req.params.productCode } })
    if (!item) return res.status(404).json({ success: false, error: 'Product not found', code: 'NOT_FOUND' })
    return res.json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
