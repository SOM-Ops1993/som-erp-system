import prisma from '../../../db.js'

export async function listProducts(req, res) {
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
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getProduct(req, res) {
  try {
    const item = await prisma.productMaster.findUnique({ where: { productCode: req.params.productCode } })
    if (!item) return res.status(404).json({ success: false, error: 'Product not found' })
    return res.json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createProduct(req, res) {
  try {
    const { productCode, productName, plant } = req.body
    if (!productCode || !productName)
      return res.status(400).json({ success: false, error: 'productCode and productName are required' })
    const existing = await prisma.productMaster.findFirst({ where: { OR: [{ productCode }, { productName }] } })
    if (existing) return res.status(409).json({ success: false, error: 'Product code or name already exists' })
    const item = await prisma.productMaster.create({ data: { productCode, productName, plant: plant || '' } })
    return res.status(201).json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function updateProduct(req, res) {
  try {
    const { productName, plant } = req.body
    const item = await prisma.productMaster.update({
      where: { productCode: req.params.productCode },
      data: { productName, plant },
    })
    return res.json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function deleteProduct(req, res) {
  try {
    await prisma.productMaster.delete({ where: { productCode: req.params.productCode } })
    return res.json({ success: true, message: 'Deleted' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
