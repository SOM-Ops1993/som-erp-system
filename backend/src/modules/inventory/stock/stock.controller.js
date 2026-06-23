import prisma from '../../../db.js'

export async function listStock(req, res) {
  try {
    const { search } = req.query
    const rms = await prisma.rmMaster.findMany({
      where: search ? { OR: [
        { itemCode: { contains: search, mode: 'insensitive' } },
        { itemName: { contains: search, mode: 'insensitive' } },
      ]} : {},
      orderBy: { itemName: 'asc' }
    })
    const stockData = await Promise.all(rms.map(async (rm) => {
      const packStock = await prisma.packBalance.aggregate({
        where: { itemCode: rm.itemCode, remainingQty: { gt: 0 } },
        _sum: { remainingQty: true },
        _count: { packId: true }
      })
      const container = await prisma.containerMaster.findUnique({ where: { itemCode: rm.itemCode } })
      return {
        itemCode: rm.itemCode,
        itemName: rm.itemName,
        uom: rm.uom,
        stockInPacks: packStock._sum.remainingQty || 0,
        activePacks: packStock._count.packId || 0,
        stockInContainer: container?.currentQty || 0,
        totalStock: (packStock._sum.remainingQty || 0) + (container?.currentQty || 0),
      }
    }))
    return res.json({ success: true, data: stockData })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listContainers(req, res) {
  try {
    const containers = await prisma.containerMaster.findMany({ orderBy: { itemName: 'asc' } })
    return res.json({ success: true, data: containers })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getItemStock(req, res) {
  try {
    const rm = await prisma.rmMaster.findUnique({ where: { itemCode: req.params.itemCode } })
    if (!rm) return res.status(404).json({ success: false, error: 'Item not found' })
    const packs = await prisma.packBalance.findMany({
      where: { itemCode: rm.itemCode, remainingQty: { gt: 0 } }
    })
    return res.json({ success: true, data: { rm, packs } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getRmHistory(req, res) {
  try {
    const { itemCode } = req.params
    const [rm, packs, balances] = await Promise.all([
      prisma.rmMaster.findUnique({ where: { itemCode } }),
      prisma.printMaster.findMany({ where: { itemCode }, orderBy: { createdAt: 'desc' } }),
      prisma.packBalance.findMany({ where: { itemCode } }),
    ])
    if (!rm) return res.status(404).json({ success: false, error: 'Item not found' })
    const balMap = new Map(balances.map(b => [b.packId, b]))
    const merged = packs.map(p => ({
      ...p,
      remainingQty:    balMap.get(p.packId)?.remainingQty ?? null,
      balanceTotalQty: balMap.get(p.packId)?.totalQty     ?? null,
    }))
    return res.json({ success: true, data: { rm, packs: merged } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
