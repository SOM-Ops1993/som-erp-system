import prisma from '../../../../../db.js'

export const createContainer = async (req, res) => {
  try {
    const { itemCode, itemName, capacity, uom } = req.body
    if (!itemCode || !itemName || !capacity || !uom)
      return res.status(400).json({ success: false, error: 'itemCode, itemName, capacity, uom are required', code: 'VALIDATION_ERROR' })
    const alreadyExists = await prisma.containerMaster.findUnique({ where: { itemCode } })
    if (alreadyExists) return res.status(409).json({ success: false, error: `Container already exists for ${itemCode}: ${alreadyExists.containerId}` , code: 'CONFLICT' })
    const lbl = itemName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()
    const containerId = `CONT-${lbl}-${itemCode}`
    const container = await prisma.containerMaster.create({
      data: { containerId, itemCode, itemName, capacity: parseFloat(capacity), currentQty: 0, uom }
    })
    return res.status(201).json({ success: true, data: container })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const fillContainer = async (req, res) => {
  const { containerId } = req.params
  const { packId, qty } = req.body
  if (!packId || !qty)
    return res.status(400).json({ success: false, error: 'packId and qty required', code: 'VALIDATION_ERROR' })
  try {
    const container = await prisma.containerMaster.findUnique({ where: { containerId: decodeURIComponent(containerId) } })
    if (!container) return res.status(404).json({ success: false, error: 'Container not found', code: 'NOT_FOUND' })

    const packBalance = await prisma.packBalance.findUnique({ where: { packId } })
    if (!packBalance) return res.status(404).json({ success: false, error: 'Pack not found or not yet inwarded', code: 'NOT_FOUND' })

    const fill = parseFloat(qty)
    if (fill <= 0) return res.status(400).json({ success: false, error: 'Qty must be positive', code: 'VALIDATION_ERROR' })
    if (fill > packBalance.remainingQty)
      return res.status(400).json({ success: false, error: `Qty exceeds pack balance (${packBalance.remainingQty})` , code: 'VALIDATION_ERROR' })

    const spaceLeft = container.capacity - container.currentQty
    if (fill > spaceLeft)
      return res.status(400).json({ success: false, error: `Container only has ${spaceLeft.toFixed(3)} space remaining (capacity: ${container.capacity})` , code: 'VALIDATION_ERROR' })

    await prisma.$transaction(async (tx) => {
      await tx.packBalance.update({
        where: { packId },
        data: { remainingQty: packBalance.remainingQty - fill }
      })
      await tx.containerMaster.update({
        where: { containerId: container.containerId },
        data: { currentQty: { increment: fill } }
      })
      await tx.outward.create({
        data: { sourceId: packId, sourceType: 'PACK_REDUCTION', rmCode: container.itemCode, qtyIssued: fill }
      })
      const prevLedger = await tx.stockLedger.findFirst({
        where: { itemCode: container.itemCode }, orderBy: { timestamp: 'desc' }
      })
      await tx.stockLedger.create({
        data: {
          itemCode: container.itemCode, sourceId: container.containerId,
          transactionType: 'PACK_TO_CONTAINER', inQty: fill, outQty: 0,
          balance: prevLedger?.balance || 0,
          reference: `Pack ${packId} → Container ${container.containerId}`
        }
      })
    })

    const updated = await prisma.containerMaster.findUnique({ where: { containerId: container.containerId } })
    return res.json({ success: true, data: updated, filled: fill })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const issueFromContainer = async (req, res) => {
  const { containerId } = req.params
  const { qty, indentId, remarks } = req.body
  if (!qty) return res.status(400).json({ success: false, error: 'qty required', code: 'VALIDATION_ERROR' })
  try {
    const container = await prisma.containerMaster.findUnique({ where: { containerId: decodeURIComponent(containerId) } })
    if (!container) return res.status(404).json({ success: false, error: 'Container not found', code: 'NOT_FOUND' })

    const issue = parseFloat(qty)
    if (issue <= 0) return res.status(400).json({ success: false, error: 'Qty must be positive', code: 'VALIDATION_ERROR' })
    if (issue > container.currentQty)
      return res.status(400).json({ success: false, error: `Qty exceeds container balance (${container.currentQty})` , code: 'VALIDATION_ERROR' })

    await prisma.$transaction(async (tx) => {
      await tx.containerMaster.update({
        where: { containerId: container.containerId },
        data: { currentQty: { decrement: issue } }
      })

      if (indentId) {
        const detail = await tx.indentDetails.findFirst({
          where: { indentId, rmCode: container.itemCode }
        })
        if (detail) {
          await tx.indentDetails.update({
            where: { id: detail.id },
            data: {
              issuedQty: { increment: issue },
              balanceQty: Math.max(0, detail.balanceQty - issue)
            }
          })
        }
      }

      await tx.outward.create({
        data: {
          indentId: indentId || null,
          sourceId: container.containerId,
          sourceType: 'CONTAINER_ISSUE',
          rmCode: container.itemCode,
          qtyIssued: issue,
          remarks: remarks || null
        }
      })

      const prevLedger = await tx.stockLedger.findFirst({
        where: { itemCode: container.itemCode }, orderBy: { timestamp: 'desc' }
      })
      await tx.stockLedger.create({
        data: {
          itemCode: container.itemCode, sourceId: container.containerId,
          transactionType: 'CONTAINER_ISSUE', inQty: 0, outQty: issue,
          balance: (prevLedger?.balance || 0) - issue,
          reference: `Container ${container.containerId}${indentId ? ` → Indent ${indentId}` : ' → Plant'}`
        }
      })
    })

    const updated = await prisma.containerMaster.findUnique({ where: { containerId: container.containerId } })
    return res.json({ success: true, data: updated, issued: issue })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
