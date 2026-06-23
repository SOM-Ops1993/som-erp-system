import prisma from "../../../../db.js";

export async function getStockSummary(req, res) {
  try {
    const data = await prisma.$queryRaw`
      SELECT
        p.item_code,
        i.item_name,
        i.item_category,
        i.uom,
        i.reorder_level,
        i.warehouse_zone,
        COUNT(p.pack_id) AS pack_count,
        SUM(p.qty_remaining) AS total_qty,
        MIN(p.inward_date) AS oldest_lot_date,
        COUNT(p.pack_id) FILTER (WHERE p.status = 'quarantine') AS quarantine_count
      FROM erp_packs p
      JOIN erp_items i ON i.item_code = p.item_code
      WHERE p.qty_remaining > 0 AND p.status != 'exhausted'
      GROUP BY p.item_code, i.item_name, i.item_category, i.uom, i.reorder_level, i.warehouse_zone
      ORDER BY i.item_category, i.item_name
    `;
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
