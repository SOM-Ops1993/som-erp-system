import prisma from '../../../../db.js'

export const listGrn = async (req, res) => {
  try {
    const packs = await prisma.printMaster.findMany({
      where: { invoiceNo: { not: null } },
      orderBy: { createdAt: 'desc' },
    })
    const groups = {}
    for (const p of packs) {
      const key = `${p.invoiceNo || 'NO-INV'}__${p.supplier || 'Unknown'}`
      if (!groups[key]) {
        groups[key] = {
          grnKey: key,
          invoiceNo: p.invoiceNo || '—',
          supplier: p.supplier || 'Unknown',
          receivedDate: p.receivedDate,
          totalPacks: 0,
          totalQty: 0,
          items: new Set(),
          createdAt: p.createdAt,
        }
      }
      groups[key].totalPacks++
      groups[key].totalQty += Number(p.packQty)
      groups[key].items.add(p.itemName)
      if (!groups[key].receivedDate && p.receivedDate) groups[key].receivedDate = p.receivedDate
    }
    const result = Object.values(groups).map(g => ({
      ...g, items: [...g.items], uniqueItems: g.items.size,
    }))
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return res.json({ success: true, data: result })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getGrnDetail = async (req, res) => {
  try {
    const { invoiceNo, supplier } = req.query
    if (!invoiceNo) return res.status(400).json({ success: false, error: 'invoiceNo required', code: 'VALIDATION_ERROR' })
    const where = { invoiceNo }
    if (supplier) where.supplier = supplier
    const packs = await prisma.printMaster.findMany({
      where, orderBy: [{ itemCode: 'asc' }, { bagNo: 'asc' }],
    })
    if (packs.length === 0) return res.status(404).json({ success: false, error: 'No packs found for this invoice', code: 'NOT_FOUND' })
    const itemMap = {}
    for (const p of packs) {
      if (!itemMap[p.itemCode]) {
        itemMap[p.itemCode] = {
          itemCode: p.itemCode, itemName: p.itemName, uom: p.uom,
          totalBags: 0, totalQty: 0, packQty: Number(p.packQty),
          lotNo: p.lotNo, receivedDate: p.receivedDate,
        }
      }
      itemMap[p.itemCode].totalBags++
      itemMap[p.itemCode].totalQty += Number(p.packQty)
    }
    return res.json({
      success: true,
      data: {
        invoiceNo, supplier: packs[0].supplier || 'Unknown', receivedDate: packs[0].receivedDate,
        items: Object.values(itemMap), allPacks: packs,
        totalPacks: packs.length, totalQty: packs.reduce((s, p) => s + Number(p.packQty), 0),
      }
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
