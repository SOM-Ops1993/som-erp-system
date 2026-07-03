import prisma from '../../../../db.js'
import { generateBatchNo } from '../../../../services/lot-generator.js'

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

export const stockCheck = async (req, res) => {
  try {
    const { productCode, batchSize } = req.query
    if (!productCode || !batchSize) return res.status(400).json({ success: false, error: 'productCode and batchSize required', code: 'VALIDATION_ERROR' })
    const recipe = await prisma.recipeDb.findMany({ where: { productCode } })
    if (!recipe.length) return res.status(400).json({ success: false, error: 'No recipe found for this product', code: 'VALIDATION_ERROR' })
    const checks = await getStockChecks(productCode, batchSize)
    const allOk = checks.every(c => c.ok)
    return res.json({ success: true, data: { allOk, checks } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getNextBatchNo = async (req, res) => {
  try {
    const { productCode } = req.query
    if (!productCode) return res.status(400).json({ success: false, error: 'productCode required', code: 'VALIDATION_ERROR' })
    const batchNo = await generateBatchNo(productCode)
    return res.json({ success: true, data: { batchNo } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getSfgAvailable = async (req, res) => {
  try {
    const { productCode } = req.query
    if (!productCode) return res.json({ success: true, data: { totalSfg: 0, entries: [] } })
    const entries = await prisma.sfgMaster.findMany({ where: { productCode, sfgQty: { gt: 0 } }, orderBy: { createdAt: 'desc' } })
    const totalSfg = entries.reduce((sum, e) => sum + e.sfgQty, 0)
    return res.json({ success: true, data: { totalSfg, entries } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const listProducts = async (req, res) => {
  try {
    const products = await prisma.recipeDb.findMany({ distinct: ['productCode'], select: { productCode: true, productName: true } })
    return res.json({ success: true, data: products })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getPurchaseSummary = async (req, res) => {
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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getIndent = async (req, res) => {
  try {
    const indent = await prisma.indentMaster.findUnique({ where: { indentId: req.params.indentId }, include: { details: true } })
    if (!indent) return res.status(404).json({ success: false, error: 'Indent not found', code: 'NOT_FOUND' })
    return res.json({ success: true, data: indent })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const listIndents = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query
    const where = status ? { status } : {}
    const [total, indents] = await Promise.all([
      prisma.indentMaster.count({ where }),
      prisma.indentMaster.findMany({ where, include: { details: true }, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], skip: (page - 1) * limit, take: parseInt(limit) })
    ])
    return res.json({ success: true, data: indents, total })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
