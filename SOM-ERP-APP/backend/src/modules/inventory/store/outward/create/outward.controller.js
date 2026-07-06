import prisma from '../../../../../db.js'

const bomScan = async (req, res) => {
  const { indentId, rmCode, packId } = req.body
  if (!indentId || !rmCode || !packId)
    return res.status(400).json({ success: false, error: 'indentId, rmCode, packId required', code: 'VALIDATION_ERROR' })
  try {
    const result = await _issuePack({ indentId, rmCode, packId })
    return res.json(result)
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}

const bomManual = async (req, res) => {
  const { indentId, rmCode, packId, qtyToIssue } = req.body
  if (!indentId || !rmCode || !packId || !qtyToIssue)
    return res.status(400).json({ success: false, error: 'indentId, rmCode, packId, qtyToIssue required', code: 'VALIDATION_ERROR' })
  try {
    const result = await _issuePack({ indentId, rmCode, packId, forcedQty: parseFloat(qtyToIssue) })
    return res.json(result)
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}

const packReduction = async (req, res) => {
  const { packId, qty } = req.body
  if (!packId || !qty) return res.status(400).json({ success: false, error: 'packId and qty required', code: 'VALIDATION_ERROR' })
  try {
    const packBalance = await prisma.packBalance.findUnique({ where: { packId } })
    if (!packBalance) return res.status(404).json({ success: false, error: 'Pack not found', code: 'NOT_FOUND' })
    const deduct = parseFloat(qty)
    if (deduct > packBalance.remainingQty)
      return res.status(400).json({ success: false, error: 'Qty exceeds pack balance', code: 'VALIDATION_ERROR' })
    const pack = await prisma.printMaster.findUnique({ where: { packId } })
    const itemCode = pack.itemCode
    const containerId = `${pack.itemName.replace(/[^a-zA-Z0-9]/g,'').slice(0,3).toUpperCase()}-${itemCode}-CONT001`
    await prisma.$transaction(async (tx) => {
      await tx.packBalance.update({ where: { packId }, data: { remainingQty: packBalance.remainingQty - deduct } })
      await tx.containerMaster.upsert({
        where: { itemCode },
        create: { containerId, itemCode, itemName: pack.itemName, capacity: 10000, currentQty: deduct, uom: pack.uom },
        update: { currentQty: { increment: deduct } }
      })
      await tx.outward.create({ data: { sourceId: packId, sourceType: 'PACK_REDUCTION', rmCode: itemCode, qtyIssued: deduct } })
      const prevLedger = await tx.stockLedger.findFirst({ where: { itemCode }, orderBy: { timestamp: 'desc' } })
      await tx.stockLedger.create({ data: { itemCode, sourceId: containerId, transactionType: 'PACK_TO_CONTAINER', inQty: deduct, balance: (prevLedger?.balance || 0), reference: `Pack ${packId} → Container` } })
    })
    return res.json({ success: true, deducted: deduct, containerId })
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}

const bagLossAdjustment = async (req, res) => {
  const { packId, lossQty, reason } = req.body
  if (!packId || !lossQty || !reason || reason.trim().length < 3)
    return res.status(400).json({ success: false, error: 'packId, lossQty, and reason (min 3 chars) required', code: 'VALIDATION_ERROR' })
  try {
    const loss = parseFloat(lossQty)
    if (isNaN(loss) || loss <= 0)
      return res.status(400).json({ success: false, error: 'lossQty must be a positive number', code: 'VALIDATION_ERROR' })

    const [packBalance, pack] = await Promise.all([
      prisma.packBalance.findUnique({ where: { packId } }),
      prisma.printMaster.findUnique({ where: { packId } }),
    ])
    if (!packBalance) return res.status(404).json({ success: false, error: 'Pack not found or not inwarded', code: 'NOT_FOUND' })
    if (!pack)        return res.status(404).json({ success: false, error: 'Pack not found in print master', code: 'NOT_FOUND' })
    if (loss > packBalance.remainingQty)
      return res.status(400).json({ success: false, error: `Loss (${loss}) exceeds remaining qty (${packBalance.remainingQty})` , code: 'VALIDATION_ERROR' })

    const newRemaining = packBalance.remainingQty - loss
    const newStatus    = newRemaining <= 0 ? 'EXHAUSTED' : 'PARTIALLY_ISSUED'

    await prisma.$transaction(async (tx) => {
      await tx.packBalance.update({ where: { packId }, data: { remainingQty: newRemaining } })
      await tx.printMaster.update({ where: { packId }, data: { status: newStatus } })
      await tx.outward.create({
        data: { sourceId: packId, sourceType: 'STOCK_ADJUSTMENT', rmCode: pack.itemCode, qtyIssued: loss, remarks: reason.trim() }
      })
      const prev = await tx.stockLedger.findFirst({ where: { itemCode: pack.itemCode }, orderBy: { timestamp: 'desc' } })
      await tx.stockLedger.create({
        data: {
          itemCode: pack.itemCode, sourceId: packId, transactionType: 'STOCK_RECON',
          outQty: loss, balance: (prev?.balance || 0) - loss, reference: `Loss: ${reason.trim()}`
        }
      })
    })

    return res.json({ success: true, packId, lossDeducted: loss, newRemaining, newStatus })
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}

const stockAdjustment = async (req, res) => {
  const { itemCode, adjustmentQty, remarks } = req.body
  if (!itemCode || adjustmentQty === undefined || !remarks || remarks.length < 5)
    return res.status(400).json({ success: false, error: 'itemCode, adjustmentQty, and remarks (min 5 chars) required', code: 'VALIDATION_ERROR' })
  try {
    const adj = parseFloat(adjustmentQty)
    const prevLedger = await prisma.stockLedger.findFirst({ where: { itemCode }, orderBy: { timestamp: 'desc' } })
    const newBal = (prevLedger?.balance || 0) + adj
    await prisma.stockLedger.create({
      data: {
        itemCode, sourceId: `ADJ-${Date.now()}`, transactionType: 'STOCK_RECON',
        inQty: adj > 0 ? adj : 0, outQty: adj < 0 ? Math.abs(adj) : 0,
        balance: newBal, reference: remarks
      }
    })
    return res.json({ success: true, newBalance: newBal })
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}

const warehouseTransfer = async (req, res) => {
  const { packId, fromWarehouse, toWarehouse, remarks } = req.body
  if (!packId || !toWarehouse)
    return res.status(400).json({ success: false, error: 'packId and toWarehouse required', code: 'VALIDATION_ERROR' })
  try {
    const pack = await prisma.printMaster.findUnique({ where: { packId } })
    if (!pack) return res.status(404).json({ success: false, error: 'Pack not found', code: 'NOT_FOUND' })
    const packBalance = await prisma.packBalance.findUnique({ where: { packId } })
    if (!packBalance || packBalance.remainingQty <= 0)
      return res.status(400).json({ success: false, error: 'Pack is exhausted or not inwarded', code: 'VALIDATION_ERROR' })
    await prisma.inward.updateMany({ where: { packId }, data: { warehouse: toWarehouse } })
    const prevLedger = await prisma.stockLedger.findFirst({ where: { itemCode: pack.itemCode }, orderBy: { timestamp: 'desc' } })
    await prisma.stockLedger.create({
      data: {
        itemCode: pack.itemCode, sourceId: packId, transactionType: 'WAREHOUSE_TRANSFER',
        inQty: 0, outQty: 0, balance: prevLedger?.balance || 0,
        reference: `${fromWarehouse || 'Warehouse'} → ${toWarehouse} | Pack: ${packId}${remarks ? ' | ' + remarks : ''}`
      }
    })
    return res.json({ success: true, message: `Pack ${packId} transferred to ${toWarehouse}` })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

const directIssue = async (req, res) => {
  const { packId, qty, plant, remarks } = req.body
  if (!packId || !qty || !plant)
    return res.status(400).json({ success: false, error: 'packId, qty, plant required', code: 'VALIDATION_ERROR' })
  try {
    const packBalance = await prisma.packBalance.findUnique({ where: { packId } })
    if (!packBalance) return res.status(404).json({ success: false, error: 'Pack not found or not inwarded', code: 'NOT_FOUND' })
    const issue = parseFloat(qty)
    if (issue <= 0) return res.status(400).json({ success: false, error: 'Qty must be positive', code: 'VALIDATION_ERROR' })
    if (issue > packBalance.remainingQty)
      return res.status(400).json({ success: false, error: `Qty exceeds pack balance (${packBalance.remainingQty})` , code: 'VALIDATION_ERROR' })
    const pack = await prisma.printMaster.findUnique({ where: { packId } })
    await prisma.$transaction(async (tx) => {
      await tx.packBalance.update({ where: { packId }, data: { remainingQty: packBalance.remainingQty - issue } })
      await tx.outward.create({
        data: { sourceId: packId, sourceType: 'DIRECT_ISSUE', rmCode: pack.itemCode, qtyIssued: issue, remarks: `To: ${plant}${remarks ? ' | ' + remarks : ''}` }
      })
      const prevLedger = await tx.stockLedger.findFirst({ where: { itemCode: pack.itemCode }, orderBy: { timestamp: 'desc' } })
      await tx.stockLedger.create({
        data: {
          itemCode: pack.itemCode, sourceId: packId, transactionType: 'DIRECT_ISSUE',
          inQty: 0, outQty: issue, balance: (prevLedger?.balance || 0) - issue,
          reference: `Direct issue to ${plant}`
        }
      })
    })
    return res.json({ success: true, issued: issue, remainingQty: packBalance.remainingQty - issue })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

const bomDirectIssue = async (req, res) => {
  const { source, sourceId, qty, rmCode, productCode, productName, batchSize, batchRef } = req.body
  if (!source || !sourceId || !qty || !rmCode)
    return res.status(400).json({ success: false, error: 'source, sourceId, qty, rmCode required', code: 'VALIDATION_ERROR' })
  if (!['pack', 'container'].includes(source))
    return res.status(400).json({ success: false, error: 'source must be "pack" or "container"', code: 'VALIDATION_ERROR' })
  try {
    const issue = parseFloat(qty)
    if (issue <= 0) return res.status(400).json({ success: false, error: 'Qty must be positive', code: 'VALIDATION_ERROR' })
    const ref = `BOM: ${productName || productCode || ''}${batchSize ? ' | Batch: ' + batchSize + ' kg' : ''}${batchRef ? ' | Ref: ' + batchRef : ''}`

    if (source === 'pack') {
      const packBalance = await prisma.packBalance.findUnique({ where: { packId: sourceId } })
      if (!packBalance) return res.status(404).json({ success: false, error: 'Pack not found or not inwarded', code: 'NOT_FOUND' })
      if (packBalance.itemCode !== rmCode)
        return res.status(400).json({ success: false, error: `Pack item code (${packBalance.itemCode}) does not match RM (${rmCode})` , code: 'VALIDATION_ERROR' })
      if (issue > packBalance.remainingQty)
        return res.status(400).json({ success: false, error: `Qty (${issue}) exceeds pack balance (${packBalance.remainingQty})` , code: 'VALIDATION_ERROR' })

      await prisma.$transaction(async (tx) => {
        await tx.packBalance.update({ where: { packId: sourceId }, data: { remainingQty: packBalance.remainingQty - issue } })
        await tx.outward.create({ data: { sourceId, sourceType: 'BOM_ISSUANCE', rmCode, qtyIssued: issue, remarks: ref } })
        const prev = await tx.stockLedger.findFirst({ where: { itemCode: rmCode }, orderBy: { timestamp: 'desc' } })
        await tx.stockLedger.create({ data: { itemCode: rmCode, sourceId, transactionType: 'BOM_ISSUANCE', outQty: issue, balance: (prev?.balance || 0) - issue, reference: ref } })
      })
      return res.json({ success: true, issued: issue, remaining: packBalance.remainingQty - issue })
    }

    // source === 'container'
    const container = await prisma.containerMaster.findUnique({ where: { containerId: sourceId } })
    if (!container) return res.status(404).json({ success: false, error: 'Container not found', code: 'NOT_FOUND' })
    if (container.itemCode !== rmCode)
      return res.status(400).json({ success: false, error: `Container item code (${container.itemCode}) does not match RM (${rmCode})` , code: 'VALIDATION_ERROR' })
    if (issue > container.currentQty)
      return res.status(400).json({ success: false, error: `Qty (${issue}) exceeds container balance (${container.currentQty})` , code: 'VALIDATION_ERROR' })

    await prisma.$transaction(async (tx) => {
      await tx.containerMaster.update({ where: { containerId: sourceId }, data: { currentQty: { decrement: issue } } })
      await tx.outward.create({ data: { sourceId, sourceType: 'BOM_ISSUANCE', rmCode, qtyIssued: issue, remarks: ref } })
      const prev = await tx.stockLedger.findFirst({ where: { itemCode: rmCode }, orderBy: { timestamp: 'desc' } })
      await tx.stockLedger.create({ data: { itemCode: rmCode, sourceId, transactionType: 'BOM_ISSUANCE', outQty: issue, balance: (prev?.balance || 0) - issue, reference: ref } })
    })
    return res.json({ success: true, issued: issue, remaining: container.currentQty - issue })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

const _issuePack = async ({ indentId, rmCode, packId, forcedQty }) => {
  const detail = await prisma.indentDetails.findFirst({ where: { indentId, rmCode } })
  if (!detail) throw new Error('RM not found in indent')
  if (detail.balanceQty <= 0) throw new Error('RM already fully issued')

  const packBalance = await prisma.packBalance.findUnique({ where: { packId } })
  if (!packBalance) throw new Error('Pack not inwarded or not found')
  if (packBalance.remainingQty <= 0) throw new Error('Pack exhausted (no remaining qty)')
  if (packBalance.itemCode !== rmCode) throw new Error(`Pack item code (${packBalance.itemCode}) does not match RM (${rmCode})`)

  const deduct = forcedQty !== undefined
    ? Math.min(forcedQty, packBalance.remainingQty, detail.balanceQty)
    : Math.min(packBalance.remainingQty, detail.balanceQty)

  if (deduct <= 0) throw new Error('Nothing to deduct')

  await prisma.$transaction(async (tx) => {
    await tx.packBalance.update({ where: { packId }, data: { remainingQty: packBalance.remainingQty - deduct } })
    await tx.indentDetails.update({
      where: { id: detail.id },
      data: { issuedQty: detail.issuedQty + deduct, balanceQty: detail.balanceQty - deduct }
    })
    await tx.outward.create({ data: { indentId, sourceId: packId, sourceType: 'BOM_ISSUANCE', rmCode, qtyIssued: deduct } })
    const prevLedger = await tx.stockLedger.findFirst({ where: { itemCode: rmCode }, orderBy: { timestamp: 'desc' } })
    const newBal = (prevLedger?.balance || 0) - deduct
    await tx.stockLedger.create({ data: { itemCode: rmCode, sourceId: packId, transactionType: 'BOM_ISSUANCE', outQty: deduct, balance: newBal, reference: `Indent ${indentId}` } })

    const allDetails = await tx.indentDetails.findMany({ where: { indentId } })
    const allDone = allDetails.every(d => d.balanceQty <= 0 || (d.rmCode === rmCode && detail.balanceQty - deduct <= 0))
    if (allDone) {
      const indent = await tx.indentMaster.update({ where: { indentId }, data: { status: 'CLOSED' } })
      await tx.sfgMaster.updateMany({
        where: { indentId, formulatedQty: 0 },
        data: { formulatedQty: indent.batchSize, sfgQty: indent.batchSize, status: 'PARTIAL' }
      })
    }
  })

  return { success: true, deducted: deduct, remaining: detail.balanceQty - deduct }
}


export {
  bomScan,
  bomManual,
  packReduction,
  bagLossAdjustment,
  stockAdjustment,
  warehouseTransfer,
  directIssue,
  bomDirectIssue
}