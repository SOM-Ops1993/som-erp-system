import prisma from '../../../../db.js'

export const listRm = async (req, res) => {
  const { search } = req.query
  const where = search
    ? {
        OR: [
          { itemCode: { contains: search, mode: 'insensitive' } },
          { itemName: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {}
  const items = await prisma.rmMaster.findMany({
    where,
    orderBy: { itemName: 'asc' },
  })
  return res.json({ success: true, data: items })
}

// NOTE: static paths like /meta/warehouses MUST come before /:itemCode
// otherwise Express matches "meta" as the itemCode param
export const getWarehouses = async (req, res) => {
  const rows = await prisma.inward.findMany({
    distinct: ['warehouse'],
    select: { warehouse: true },
  })
  return res.json({ success: true, data: rows.map((r) => r.warehouse) })
}

export const getRm = async (req, res) => {
  const item = await prisma.rmMaster.findUnique({
    where: { itemCode: req.params.itemCode },
  })
  if (!item)
    return res.status(404).json({ success: false, error: 'RM not found', code: 'NOT_FOUND' })
  return res.json({ success: true, data: item })
}
