import prisma from '../../../../db.js'

export const updateRm = async (req, res) => {
  try {
    const { itemName, uom, trackingType } = req.body
    const data = { itemName, uom }
    if (trackingType) data.trackingType = trackingType
    const item = await prisma.rmMaster.update({ where: { itemCode: req.params.itemCode }, data })
    return res.json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
