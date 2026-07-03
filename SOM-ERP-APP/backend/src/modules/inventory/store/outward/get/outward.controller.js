import prisma from '../../../../../db.js'

export const listOutward = async (req, res) => {
  try {
    const { itemCode, page = 1, limit = 50 } = req.query
    const where = itemCode ? { rmCode: itemCode } : {}
    const [total, rows] = await Promise.all([
      prisma.outward.count({ where }),
      prisma.outward.findMany({ where, orderBy: { timestamp: 'desc' }, skip: (page-1)*parseInt(limit), take: parseInt(limit) })
    ])
    // Attach rmName from rmMaster
    const rmCodes = [...new Set(rows.map(r => r.rmCode).filter(Boolean))]
    const rmItems = await prisma.rmMaster.findMany({
      where: { itemCode: { in: rmCodes } },
      select: { itemCode: true, itemName: true }
    })
    const rmMap = Object.fromEntries(rmItems.map(r => [r.itemCode, r.itemName]))
    const data = rows.map(r => ({ ...r, rmName: rmMap[r.rmCode] || r.rmCode }))
    return res.json({ success: true, data, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getAvailablePacks = async (req, res) => {
  try {
    const packs = await prisma.packBalance.findMany({
      where: { itemCode: req.params.rmCode, remainingQty: { gt: 0 } },
      orderBy: { packId: 'asc' }
    })
    const packIds = packs.map(p => p.packId)
    const printMasters = await prisma.printMaster.findMany({ where: { packId: { in: packIds } } })
    const pmMap = Object.fromEntries(printMasters.map(p => [p.packId, p]))
    const data = packs.map(p => ({
      packId: p.packId, itemCode: p.itemCode, remainingQty: p.remainingQty, totalQty: p.totalQty,
      itemName: pmMap[p.packId]?.itemName || '', lotNo: pmMap[p.packId]?.lotNo || '',
      bagNo: pmMap[p.packId]?.bagNo || 0, supplier: pmMap[p.packId]?.supplier || '',
    }))
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
