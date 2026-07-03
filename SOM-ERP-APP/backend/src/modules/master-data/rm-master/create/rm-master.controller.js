import prisma from '../../../../db.js'

export const createRm = async (req, res) => {
  const { itemCode, itemName, uom, trackingType } = req.body
  if (!itemCode || !itemName || !uom)
    return res
      .status(400)
      .json({
        success: false,
        error: 'itemCode, itemName and uom are required',
      })
  const existing = await prisma.rmMaster.findFirst({
    where: { OR: [{ itemCode }, { itemName }] },
  })
  if (existing)
    return res
      .status(409)
      .json({ success: false, error: 'Item code or name already exists' })
  const item = await prisma.rmMaster.create({
    data: { itemCode, itemName, uom, trackingType: trackingType || 'PACK' },
  })
  return res.status(201).json({ success: true, data: item })
}
