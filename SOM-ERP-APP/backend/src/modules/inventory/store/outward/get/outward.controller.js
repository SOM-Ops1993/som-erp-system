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

// Single-pack lookup by packId (as scanned from the pack's QR code) — combines
// printMaster (identity), packBalance (remaining qty) and the pack's most
// recent inward row (current warehouse) in one call. Used by Warehouse
// Transfer instead of guessing an RM code out of the packId string and
// fetching the wrong item's "available packs" list.
export const getPackDetail = async (req, res) => {
  try {
    const { packId } = req.params
    const [printMaster, packBalance, inwardRow] = await Promise.all([
      prisma.printMaster.findUnique({ where: { packId } }),
      prisma.packBalance.findUnique({ where: { packId } }),
      prisma.inward.findFirst({ where: { packId }, orderBy: { inwardTime: 'desc' } }),
    ])
    if (!printMaster || !packBalance) {
      return res.status(404).json({ success: false, error: `Pack "${packId}" not found or not inwarded`, code: 'NOT_FOUND' })
    }
    return res.json({
      success: true,
      data: {
        packId,
        itemCode: printMaster.itemCode,
        itemName: printMaster.itemName,
        lotNo: printMaster.lotNo,
        bagNo: printMaster.bagNo,
        uom: printMaster.uom,
        supplier: printMaster.supplier || '',
        totalQty: packBalance.totalQty,
        remainingQty: packBalance.remainingQty,
        warehouse: inwardRow?.warehouse || '',
      },
    })
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
