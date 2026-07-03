import prisma from '../../../../db.js'

const getStockChecks = async (productCode, batchSize) => {
  const recipe = await prisma.recipeDb.findMany({ where: { productCode } })
  const size = parseFloat(batchSize)
  return Promise.all(recipe.map(async (r) => {
    const required = parseFloat((r.qtyPerUnit * size).toFixed(4))
    const packStock = await prisma.packBalance.aggregate({ where: { itemCode: r.rmCode, remainingQty: { gt: 0 } }, _sum: { remainingQty: true } })
    const container = await prisma.containerMaster.findUnique({ where: { itemCode: r.rmCode } }).catch(() => null)
    const available = Number(packStock._sum.remainingQty || 0) + Number(container?.currentQty || 0)
    return { rmCode: r.rmCode, rmName: r.rmName, required, available, shortfall: Math.max(0, required - available), ok: available >= required }
  }))
}

export const checkAndUnblockPendingIndents = async (itemCodes) => {
  const pendingIndents = await prisma.indentMaster.findMany({ where: { status: 'PENDING_STOCK' }, include: { details: true } })
  const nowReady = []
  for (const indent of pendingIndents) {
    const rmCodes = indent.details.map(d => d.rmCode)
    if (!rmCodes.some(c => itemCodes.includes(c))) continue
    const checks = await getStockChecks(indent.productCode, indent.batchSize)
    if (checks.every(c => c.ok)) {
      await prisma.indentMaster.update({ where: { indentId: indent.indentId }, data: { status: 'OPEN' } })
      nowReady.push(indent.indentId)
    }
  }
  return nowReady
}

export const createIndent = async (req, res) => {
  try {
    const { productCode, productName, batchSize, batchNo, diNo, plant, equipment, cycleBatchSize } = req.body
    if (!productCode || !productName || !batchSize || !batchNo || !diNo)
      return res.status(400).json({ success: false, error: 'productCode, productName, batchSize, batchNo, diNo are required', code: 'VALIDATION_ERROR' })

    const recipe = await prisma.recipeDb.findMany({ where: { productCode } })
    if (!recipe.length) return res.status(400).json({ success: false, error: 'No recipe found for this product. Add recipe in Recipe DB first.', code: 'VALIDATION_ERROR' })

    const totalSize = parseFloat(batchSize)
    const cycleSize = cycleBatchSize ? parseFloat(cycleBatchSize) : null
    let cycles = 1, sizePerIndent = totalSize
    if (cycleSize && cycleSize > 0 && cycleSize < totalSize) { cycles = Math.round(totalSize / cycleSize); sizePerIndent = cycleSize }

    const stockChecks = await getStockChecks(productCode, sizePerIndent)
    const allStockOk = stockChecks.every(c => c.ok)
    const indentStatus = allStockOk ? 'OPEN' : 'PENDING_STOCK'

    const createdIndents = await prisma.$transaction(async (tx) => {
      const results = []
      for (let c = 1; c <= cycles; c++) {
        const cycleBatchNo = cycles > 1 ? `${batchNo}-C${c}` : batchNo
        const im = await tx.indentMaster.create({
          data: { productCode, productName, batchSize: sizePerIndent, batchNo: cycleBatchNo, diNo, plant: plant || '', equipment: equipment || '', cycleBatchSize: cycleSize, cycleNo: cycles > 1 ? c : null, totalCycles: cycles > 1 ? cycles : null, status: indentStatus }
        })
        await tx.indentDetails.createMany({
          data: recipe.map(r => ({ indentId: im.indentId, rmCode: r.rmCode, rmName: r.rmName, requiredQty: parseFloat((r.qtyPerUnit * sizePerIndent).toFixed(4)), issuedQty: 0, balanceQty: parseFloat((r.qtyPerUnit * sizePerIndent).toFixed(4)) }))
        })
        await tx.sfgMaster.create({ data: { indentId: im.indentId, productCode, productName, targetQty: sizePerIndent, formulatedQty: 0, sfgQty: 0, packedQty: 0, status: 'OPEN' } })
        const full = await tx.indentMaster.findUnique({ where: { indentId: im.indentId }, include: { details: true } })
        results.push(full)
      }
      return results
    })

    return res.status(201).json({
      success: true,
      data: cycles > 1 ? createdIndents : createdIndents[0],
      cycles, cycleSize: sizePerIndent, stockOk: allStockOk,
      stockChecks: allStockOk ? [] : stockChecks.filter(c => !c.ok),
      message: cycles > 1
        ? `${cycles} cycle indents created (${sizePerIndent} kg each)${!allStockOk ? ' — PENDING STOCK' : ''}`
        : allStockOk ? 'Indent created successfully. Ready for issuance.'
          : `Indent created with PENDING_STOCK status. ${stockChecks.filter(c => !c.ok).length} item(s) have insufficient stock.`
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const markPoSent = async (req, res) => {
  try {
    const { indentIds } = req.body
    if (!Array.isArray(indentIds) || indentIds.length === 0) return res.status(400).json({ success: false, error: 'indentIds array required', code: 'VALIDATION_ERROR' })
    await prisma.indentMaster.updateMany({ where: { indentId: { in: indentIds } }, data: { poSentAt: new Date() } })
    return res.json({ success: true, markedCount: indentIds.length })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
