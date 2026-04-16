import prisma from '../db.js'
import { generateBatchNo } from '../services/lot-generator.js'

// Helper: check stock for a product + batchSize (reusable)
async function getStockChecks(productCode, batchSize) {
  const recipe = await prisma.recipeDb.findMany({ where: { productCode } })
  const size = parseFloat(batchSize)
  return Promise.all(recipe.map(async (r) => {
    const required = parseFloat((r.qtyPerUnit * size).toFixed(4))
    const packStock = await prisma.packBalance.aggregate({
      where: { itemCode: r.rmCode, remainingQty: { gt: 0 } },
      _sum: { remainingQty: true }
    })
    const container = await prisma.containerMaster.findUnique({ where: { itemCode: r.rmCode } }).catch(() => null)
    const available = Number(packStock._sum.remainingQty || 0) + Number(container?.currentQty || 0)
    return {
      rmCode: r.rmCode, rmName: r.rmName,
      required, available,
      shortfall: Math.max(0, required - available),
      ok: available >= required
    }
  }))
}

// Exported: called by inward route after successful submit to auto-unblock PENDING_STOCK indents
export async function checkAndUnblockPendingIndents(itemCodes) {
  const pendingIndents = await prisma.indentMaster.findMany({
    where: { status: 'PENDING_STOCK' },
    include: { details: true }
  })
  const nowReady = []
  for (const indent of pendingIndents) {
    const rmCodes = indent.details.map(d => d.rmCode)
    if (!rmCodes.some(c => itemCodes.includes(c))) continue
    const checks = await getStockChecks(indent.productCode, indent.batchSize)
    if (checks.every(c => c.ok)) {
      await prisma.indentMaster.update({
        where: { indentId: indent.indentId },
        data: { status: 'OPEN' }
      })
      nowReady.push(indent.indentId)
    }
  }
  return nowReady
}

export default async function indentRoutes(fastify) {

  // Check stock availability for a product + batch size (used by frontend before submit)
  fastify.get('/stock-check', async (req, reply) => {
    const { productCode, batchSize } = req.query
    if (!productCode || !batchSize) return reply.status(400).send({ success: false, error: 'productCode and batchSize required' })

    const recipe = await prisma.recipeDb.findMany({ where: { productCode } })
    if (!recipe.length) return reply.status(400).send({ success: false, error: 'No recipe found for this product' })

    const checks = await getStockChecks(productCode, batchSize)
    const allOk = checks.every(c => c.ok)
    return { success: true, data: { allOk, checks } }
  })

  // Preview next batch number
  fastify.get('/next-batch-no', async (req, reply) => {
    const { productCode } = req.query
    if (!productCode) return reply.status(400).send({ success: false, error: 'productCode required' })
    const batchNo = await generateBatchNo(productCode)
    return { success: true, data: { batchNo } }
  })

  // Get SFG availability for a product
  fastify.get('/sfg-available', async (req, reply) => {
    const { productCode } = req.query
    if (!productCode) return { success: true, data: { totalSfg: 0, entries: [] } }
    const entries = await prisma.sfgMaster.findMany({
      where: { productCode, sfgQty: { gt: 0 } },
      orderBy: { createdAt: 'desc' }
    })
    const totalSfg = entries.reduce((sum, e) => sum + e.sfgQty, 0)
    return { success: true, data: { totalSfg, entries } }
  })

  // Create indent (supports single or multi-cycle)
  // When cycleBatchSize is provided: creates `totalBatchSize / cycleBatchSize` cycle indents
  fastify.post('/', async (req, reply) => {
    const { productCode, productName, batchSize, batchNo, diNo, plant, equipment, cycleBatchSize } = req.body
    if (!productCode || !productName || !batchSize || !batchNo || !diNo)
      return reply.status(400).send({ success: false, error: 'productCode, productName, batchSize, batchNo, diNo are required' })

    const recipe = await prisma.recipeDb.findMany({ where: { productCode } })
    if (!recipe.length)
      return reply.status(400).send({ success: false, error: 'No recipe found for this product. Add recipe in Recipe DB first.' })

    const totalSize = parseFloat(batchSize)
    const cycleSize = cycleBatchSize ? parseFloat(cycleBatchSize) : null

    // Determine cycles
    let cycles = 1
    let sizePerIndent = totalSize
    if (cycleSize && cycleSize > 0 && cycleSize < totalSize) {
      cycles = Math.round(totalSize / cycleSize)
      sizePerIndent = cycleSize
    }

    // Stock check using per-cycle size
    const stockChecks = await getStockChecks(productCode, sizePerIndent)
    const allStockOk = stockChecks.every(c => c.ok)
    const indentStatus = allStockOk ? 'OPEN' : 'PENDING_STOCK'

    // Create all cycle indents in one transaction
    const createdIndents = await prisma.$transaction(async (tx) => {
      const results = []
      for (let c = 1; c <= cycles; c++) {
        const cycleBatchNo = cycles > 1 ? `${batchNo}-C${c}` : batchNo
        const im = await tx.indentMaster.create({
          data: {
            productCode, productName,
            batchSize: sizePerIndent,
            batchNo: cycleBatchNo,
            diNo,
            plant: plant || '',
            equipment: equipment || '',
            cycleBatchSize: cycleSize,
            cycleNo: cycles > 1 ? c : null,
            totalCycles: cycles > 1 ? cycles : null,
            status: indentStatus,
          }
        })
        await tx.indentDetails.createMany({
          data: recipe.map(r => ({
            indentId: im.indentId,
            rmCode: r.rmCode,
            rmName: r.rmName,
            requiredQty: parseFloat((r.qtyPerUnit * sizePerIndent).toFixed(4)),
            issuedQty: 0,
            balanceQty: parseFloat((r.qtyPerUnit * sizePerIndent).toFixed(4)),
          }))
        })
        await tx.sfgMaster.create({
          data: {
            indentId: im.indentId,
            productCode, productName,
            targetQty: sizePerIndent,
            formulatedQty: 0, sfgQty: 0, packedQty: 0,
            status: 'OPEN',
          }
        })
        const full = await tx.indentMaster.findUnique({ where: { indentId: im.indentId }, include: { details: true } })
        results.push(full)
      }
      return results
    })

    return reply.status(201).send({
      success: true,
      data: cycles > 1 ? createdIndents : createdIndents[0],
      cycles,
      cycleSize: sizePerIndent,
      stockOk: allStockOk,
      stockChecks: allStockOk ? [] : stockChecks.filter(c => !c.ok),
      message: cycles > 1
        ? `${cycles} cycle indents created (${sizePerIndent} kg each)${!allStockOk ? ' — PENDING STOCK' : ''}`
        : allStockOk
          ? 'Indent created successfully. Ready for issuance.'
          : `Indent created with PENDING_STOCK status. ${stockChecks.filter(c => !c.ok).length} item(s) have insufficient stock.`
    })
  })

  fastify.get('/', async (req) => {
    const { status, page = 1, limit = 20 } = req.query
    const where = status ? { status } : {}
    const [total, indents] = await Promise.all([
      prisma.indentMaster.count({ where }),
      prisma.indentMaster.findMany({
        where, include: { details: true },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit, take: parseInt(limit)
      })
    ])
    return { success: true, data: indents, total }
  })

  fastify.get('/products/list', async () => {
    const products = await prisma.recipeDb.findMany({
      distinct: ['productCode'],
      select: { productCode: true, productName: true }
    })
    return { success: true, data: products }
  })

  // Purchase indent summary — aggregate shortfall RMs across PENDING_STOCK indents
  // ?showSent=true includes indents where PO was already sent
  fastify.get('/purchase-summary', async (req) => {
    const showSent = req.query.showSent === 'true'
    const where = { status: 'PENDING_STOCK' }
    if (!showSent) where.poSentAt = null   // only unsent by default

    const pendingIndents = await prisma.indentMaster.findMany({
      where,
      include: { details: true }
    })

    if (!pendingIndents.length) return { success: true, data: [], pendingCount: 0 }

    // Get stock levels for all involved RMs
    const allRmCodes = [...new Set(pendingIndents.flatMap(i => i.details.map(d => d.rmCode)))]
    const stockMap = {}
    for (const rmCode of allRmCodes) {
      const packStock = await prisma.packBalance.aggregate({
        where: { itemCode: rmCode, remainingQty: { gt: 0 } },
        _sum: { remainingQty: true }
      })
      const container = await prisma.containerMaster.findUnique({ where: { itemCode: rmCode } }).catch(() => null)
      stockMap[rmCode] = Number(packStock._sum.remainingQty || 0) + Number(container?.currentQty || 0)
    }

    // Aggregate by RM
    const rmSummary = {}
    for (const indent of pendingIndents) {
      for (const d of indent.details) {
        if (!rmSummary[d.rmCode]) {
          rmSummary[d.rmCode] = {
            rmCode: d.rmCode, rmName: d.rmName,
            totalRequired: 0, availableQty: stockMap[d.rmCode] || 0,
            indents: []
          }
        }
        rmSummary[d.rmCode].totalRequired += Number(d.balanceQty)
        rmSummary[d.rmCode].indents.push({
          indentId: indent.indentId,
          productName: indent.productName,
          productCode: indent.productCode,
          batchNo: indent.batchNo,
          required: Number(d.balanceQty),
          poSentAt: indent.poSentAt || null
        })
      }
    }

    const result = Object.values(rmSummary)
      .map(rm => ({
        ...rm,
        shortfall: Math.max(0, rm.totalRequired - rm.availableQty),
        suggestedOrderQty: Math.max(0, rm.totalRequired - rm.availableQty)
      }))
      .filter(rm => rm.shortfall > 0)
      .sort((a, b) => b.shortfall - a.shortfall)

    return { success: true, data: result, pendingCount: pendingIndents.length }
  })

  // Mark a set of PENDING_STOCK indents as PO sent (timestamp now)
  fastify.post('/mark-po-sent', async (req, reply) => {
    const { indentIds } = req.body
    if (!Array.isArray(indentIds) || indentIds.length === 0)
      return reply.status(400).send({ success: false, error: 'indentIds array required' })
    await prisma.indentMaster.updateMany({
      where: { indentId: { in: indentIds } },
      data: { poSentAt: new Date() }
    })
    return { success: true, markedCount: indentIds.length }
  })

  fastify.get('/:indentId', async (req, reply) => {
    const indent = await prisma.indentMaster.findUnique({
      where: { indentId: req.params.indentId },
      include: { details: true }
    })
    if (!indent) return reply.status(404).send({ success: false, error: 'Indent not found' })
    return { success: true, data: indent }
  })
}
