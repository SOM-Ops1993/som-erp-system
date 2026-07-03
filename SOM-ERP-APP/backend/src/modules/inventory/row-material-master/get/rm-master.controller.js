import prisma from '../../../../db.js'

export const listRm = async (req, res) => {
  try {
    const { search } = req.query
    const where = search ? { OR: [
      { itemCode: { contains: search, mode: 'insensitive' } },
      { itemName: { contains: search, mode: 'insensitive' } },
    ]} : {}
    const items = await prisma.rmMaster.findMany({ where, orderBy: { itemName: 'asc' } })
    return res.json({ success: true, data: items })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getRm = async (req, res) => {
  try {
    const item = await prisma.rmMaster.findUnique({ where: { itemCode: req.params.itemCode } })
    if (!item) return res.status(404).json({ success: false, error: 'RM not found', code: 'NOT_FOUND' })
    return res.json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const listWarehouses = async (req, res) => {
  try {
    const rows = await prisma.inward.findMany({ distinct: ['warehouse'], select: { warehouse: true } })
    return res.json({ success: true, data: rows.map(r => r.warehouse) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
