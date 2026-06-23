import prisma from '../../../db.js'
import { generateBatchNo } from '../../../services/lot-generator.js'

async function getStockChecks(productCode, batchSize) {
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

export async function checkAndUnblockPendingIndents(itemCodes) {
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

export async function stockCheck(req, res) {
  try {
    const { productCode, batchSize } = req.query
    if (!productCode || !batchSize) return res.status(400).json({ success: false, error: 'productCode and batchSize required' })
    const recipe = await prisma.recipeDb.findMany({ where: { productCode } })
    if (!recipe.length) return res.status(400).json({ success: false, error: 'No recipe found for this product' })
    const checks = await getStockChecks(productCode, batchSize)
    const allOk = checks.every(c => c.ok)
    return res.json({ success: true, data: { allOk, checks } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getNextBatchNo(req, res) {
  try {
    const { productCode } = req.query
    if (!productCode) return res.status(400).json({ success: false, error: 'productCode required' })
    const batchNo = await generateBatchNo(productCode)
    return res.json({ success: true, data: { batchNo } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getSfgAvailable(req, res) {
  try {
    const { productCode } = req.query
    if (!productCode) return res.json({ success: true, data: { totalSfg: 0, entries: [] } })
    const entries = await prisma.sfgMaster.findMany({ where: { productCode, sfgQty: { gt: 0 } }, orderBy: { createdAt: 'desc' } })
    const totalSfg = entries.reduce((sum, e) => sum + e.sfgQty, 0)
    return res.json({ success: true, data: { totalSfg, entries } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createIndent(req, res) {
  try {
    const { productCode, productName, batchSize, batchNo, diNo, plant, equipment, cycleBatchSize } = req.body
    if (!productCode || !productName || !batchSize || !batchNo || !diNo)
      return res.status(400).json({ success: false, error: 'productCode, productName, batchSize, batchNo, diNo are required' })

    const recipe = await prisma.recipeDb.findMany({ where: { productCode } })
    if (!recipe.length) return res.status(400).json({ success: false, error: 'No recipe found for this product. Add recipe in Recipe DB first.' })

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
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listIndents(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query
    const where = status ? { status } : {}
    const [total, indents] = await Promise.all([
      prisma.indentMaster.count({ where }),
      prisma.indentMaster.findMany({ where, include: { details: true }, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], skip: (page - 1) * limit, take: parseInt(limit) })
    ])
    return res.json({ success: true, data: indents, total })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listProducts(req, res) {
  try {
    const products = await prisma.recipeDb.findMany({ distinct: ['productCode'], select: { productCode: true, productName: true } })
    return res.json({ success: true, data: products })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getPurchaseSummary(req, res) {
  try {
    const showSent = req.query.showSent === 'true'
    const where = { status: 'PENDING_STOCK' }
    if (!showSent) where.poSentAt = null
    const pendingIndents = await prisma.indentMaster.findMany({ where, include: { details: true } })
    if (!pendingIndents.length) return res.json({ success: true, data: [], pendingCount: 0 })

    const allRmCodes = [...new Set(pendingIndents.flatMap(i => i.details.map(d => d.rmCode)))]
    const stockMap = {}
    for (const rmCode of allRmCodes) {
      const packStock = await prisma.packBalance.aggregate({ where: { itemCode: rmCode, remainingQty: { gt: 0 } }, _sum: { remainingQty: true } })
      const container = await prisma.containerMaster.findUnique({ where: { itemCode: rmCode } }).catch(() => null)
      stockMap[rmCode] = Number(packStock._sum.remainingQty || 0) + Number(container?.currentQty || 0)
    }
    const rmSummary = {}
    for (const indent of pendingIndents) {
      for (const d of indent.details) {
        if (!rmSummary[d.rmCode]) rmSummary[d.rmCode] = { rmCode: d.rmCode, rmName: d.rmName, totalRequired: 0, availableQty: stockMap[d.rmCode] || 0, indents: [] }
        rmSummary[d.rmCode].totalRequired += Number(d.balanceQty)
        rmSummary[d.rmCode].indents.push({ indentId: indent.indentId, productName: indent.productName, productCode: indent.productCode, batchNo: indent.batchNo, required: Number(d.balanceQty), poSentAt: indent.poSentAt || null })
      }
    }
    const result = Object.values(rmSummary).map(rm => ({ ...rm, shortfall: Math.max(0, rm.totalRequired - rm.availableQty), suggestedOrderQty: Math.max(0, rm.totalRequired - rm.availableQty) })).filter(rm => rm.shortfall > 0).sort((a, b) => b.shortfall - a.shortfall)
    return res.json({ success: true, data: result, pendingCount: pendingIndents.length })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function markPoSent(req, res) {
  try {
    const { indentIds } = req.body
    if (!Array.isArray(indentIds) || indentIds.length === 0) return res.status(400).json({ success: false, error: 'indentIds array required' })
    await prisma.indentMaster.updateMany({ where: { indentId: { in: indentIds } }, data: { poSentAt: new Date() } })
    return res.json({ success: true, markedCount: indentIds.length })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getIndent(req, res) {
  try {
    const indent = await prisma.indentMaster.findUnique({ where: { indentId: req.params.indentId }, include: { details: true } })
    if (!indent) return res.status(404).json({ success: false, error: 'Indent not found' })
    return res.json({ success: true, data: indent })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
