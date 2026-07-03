import prisma from '../../../../db.js'

export const updateRm = async (req, res) => {
  const { itemName, uom, trackingType } = req.body
  const data = { itemName, uom }
  if (trackingType) data.trackingType = trackingType
  const item = await prisma.rmMaster.update({
    where: { itemCode: req.params.itemCode },
    data,
  })
  return res.json({ success: true, data: item })
}
