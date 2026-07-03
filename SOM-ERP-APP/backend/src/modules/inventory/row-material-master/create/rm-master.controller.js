import prisma from '../../../../db.js'

export const createRm = async (req, res) => {
  try {
    const { itemCode, itemName, uom, trackingType } = req.body
    if (!itemCode || !itemName || !uom)
      return res.status(400).json({ success: false, error: 'itemCode, itemName and uom are required', code: 'VALIDATION_ERROR' })
    const existing = await prisma.rmMaster.findFirst({ where: { OR: [{ itemCode }, { itemName }] } })
    if (existing) return res.status(409).json({ success: false, error: 'Item code or name already exists', code: 'CONFLICT' })
    const item = await prisma.rmMaster.create({
      data: { itemCode, itemName, uom, trackingType: trackingType || 'PACK' }
    })
    return res.status(201).json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
