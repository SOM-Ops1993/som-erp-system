import prisma from "../../../../db.js";

export const getStockSummary = async (req, res) => {
  try {
    const [items, packs] = await Promise.all([
      prisma.erpItem.findMany({
        select: { itemCode: true, itemName: true, itemCategory: true, uom: true, reorderLevel: true, warehouseZone: true },
      }),
      prisma.erpPack.findMany({
        where:  { qtyRemaining: { gt: 0 }, status: { not: 'exhausted' } },
        select: { packId: true, itemCode: true, qtyRemaining: true, inwardDate: true, status: true },
      }),
    ])

    const itemMap = Object.fromEntries(items.map(i => [i.itemCode, i]))

    const grouped = {}
    for (const p of packs) {
      const code = p.itemCode
      if (!grouped[code]) {
        const item = itemMap[code] || {}
        grouped[code] = {
          item_code:       code,
          item_name:       item.itemName       ?? null,
          item_category:   item.itemCategory   ?? null,
          uom:             item.uom             ?? null,
          reorder_level:   item.reorderLevel    ?? null,
          warehouse_zone:  item.warehouseZone   ?? null,
          pack_count:      0,
          total_qty:       0,
          oldest_lot_date: null,
          quarantine_count: 0,
        }
      }
      const g = grouped[code]
      g.pack_count++
      g.total_qty += Number(p.qtyRemaining)
      if (!g.oldest_lot_date || (p.inwardDate && new Date(p.inwardDate) < new Date(g.oldest_lot_date))) {
        g.oldest_lot_date = p.inwardDate
      }
      if (p.status === 'quarantine') g.quarantine_count++
    }

    const data = Object.values(grouped).sort((a, b) => {
      const catCmp = (a.item_category ?? '').localeCompare(b.item_category ?? '')
      return catCmp !== 0 ? catCmp : (a.item_name ?? '').localeCompare(b.item_name ?? '')
    })

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}
