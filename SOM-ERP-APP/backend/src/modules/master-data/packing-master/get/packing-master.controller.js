import prisma from '../../../../db.js'

export const listPackingMaterials = async (req, res) => {
  try {
    const items = await prisma.packingMaterial.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { itemName: 'asc' }],
    })

    // Aggregate live stock from packBalance for each item code
    const itemCodes = items.map(i => i.itemCode)
    const balances = await prisma.packBalance.groupBy({
      by: ['itemCode'],
      where: { itemCode: { in: itemCodes }, remainingQty: { gt: 0 } },
      _sum: { remainingQty: true },
    })
    const balMap = new Map(balances.map(b => [b.itemCode, b._sum.remainingQty || 0]))

    const data = items.map(i => ({ ...i, quantity: balMap.get(i.itemCode) || 0 }))
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
