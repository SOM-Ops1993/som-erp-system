import prisma from '../../../../../db.js'

export const updateSfgInward = async (req, res) => {
  try {
    const { remaining_qty_kg, fill_status, status, location, moisture, shelf_life_days } = req.body || {}
    const data = {}
    if (remaining_qty_kg !== undefined) data.remainingQtyKg = Number(remaining_qty_kg)
    if (fill_status !== undefined)      data.fillStatus     = fill_status
    if (status !== undefined)           data.status         = status
    if (location !== undefined)         data.location       = location
    if (moisture !== undefined)         data.moisture       = Number(moisture)
    if (shelf_life_days !== undefined)  data.shelfLifeDays  = Number(shelf_life_days)

    const row = await prisma.microbialSfgInward.update({
      where: { inwardId: req.params.id },
      data,
    })
    return res.json({ success: true, data: row })
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ success: false, error: 'Inward record not found', code: 'NOT_FOUND' })
    return res.status(500).json({ success: false, error: e.message, code: 'INTERNAL_ERROR' })
  }
}
