import prisma from '../../../db.js'

export async function listRm(req, res) {
  try {
    const { search } = req.query
    const where = search ? { OR: [
      { itemCode: { contains: search, mode: 'insensitive' } },
      { itemName: { contains: search, mode: 'insensitive' } },
    ]} : {}
    const items = await prisma.rmMaster.findMany({ where, orderBy: { itemName: 'asc' } })
    return res.json({ success: true, data: items })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getRm(req, res) {
  try {
    const item = await prisma.rmMaster.findUnique({ where: { itemCode: req.params.itemCode } })
    if (!item) return res.status(404).json({ success: false, error: 'RM not found' })
    return res.json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createRm(req, res) {
  try {
    const { itemCode, itemName, uom, trackingType } = req.body
    if (!itemCode || !itemName || !uom)
      return res.status(400).json({ success: false, error: 'itemCode, itemName and uom are required' })
    const existing = await prisma.rmMaster.findFirst({ where: { OR: [{ itemCode }, { itemName }] } })
    if (existing) return res.status(409).json({ success: false, error: 'Item code or name already exists' })
    const item = await prisma.rmMaster.create({
      data: { itemCode, itemName, uom, trackingType: trackingType || 'PACK' }
    })
    return res.status(201).json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function updateRm(req, res) {
  try {
    const { itemName, uom, trackingType } = req.body
    const data = { itemName, uom }
    if (trackingType) data.trackingType = trackingType
    const item = await prisma.rmMaster.update({ where: { itemCode: req.params.itemCode }, data })
    return res.json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function deleteRm(req, res) {
  try {
    await prisma.rmMaster.delete({ where: { itemCode: req.params.itemCode } })
    return res.json({ success: true, message: 'Deleted' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listWarehouses(req, res) {
  try {
    const rows = await prisma.inward.findMany({ distinct: ['warehouse'], select: { warehouse: true } })
    return res.json({ success: true, data: rows.map(r => r.warehouse) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
