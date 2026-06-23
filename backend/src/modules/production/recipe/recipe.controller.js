import prisma from '../../../db.js'
import { findBestRmMatch, confidenceLabel } from '../../../utils/fuzzy.js'

export async function listRecipe(req, res) {
  try {
    const { productCode } = req.query
    const where = productCode ? { productCode } : {}
    const rows = await prisma.recipeDb.findMany({ where, orderBy: [{ productCode: 'asc' }, { rmName: 'asc' }] })
    return res.json({ success: true, data: rows })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listRecipeProducts(req, res) {
  try {
    const products = await prisma.recipeDb.findMany({ distinct: ['productCode'], select: { productCode: true, productName: true } })
    return res.json({ success: true, data: products })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function bulkSaveRecipe(req, res) {
  try {
    const { rows } = req.body
    if (!rows || !Array.isArray(rows) || rows.length === 0) return res.status(400).json({ success: false, error: 'No rows provided' })
    const valid = rows.filter(r => r.productCode && r.productName && r.rmCode && r.rmName && r.qtyPerUnit && r.uom)
    if (!valid.length) return res.status(400).json({ success: false, error: 'No valid rows found' })
    let saved = 0
    for (const r of valid) {
      await prisma.recipeDb.upsert({
        where: { productCode_rmCode: { productCode: r.productCode, rmCode: r.rmCode } },
        create: { productCode: r.productCode, productName: r.productName, rmCode: r.rmCode, rmName: r.rmName, qtyPerUnit: parseFloat(r.qtyPerUnit), uom: r.uom, roleType: r.roleType || 'INGREDIENT' },
        update: { productName: r.productName, rmName: r.rmName, qtyPerUnit: parseFloat(r.qtyPerUnit), uom: r.uom, roleType: r.roleType || 'INGREDIENT' }
      })
      saved++
    }
    return res.json({ success: true, saved, message: `${saved} rows saved` })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function deleteRecipeRow(req, res) {
  try {
    await prisma.recipeDb.delete({ where: { id: req.params.id } })
    return res.json({ success: true, message: 'Row deleted' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function deleteProductRecipe(req, res) {
  try {
    const result = await prisma.recipeDb.deleteMany({ where: { productCode: req.params.productCode } })
    return res.json({ success: true, deleted: result.count })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function checkRmMapping(req, res) {
  try {
    const validRms = await prisma.rmMaster.findMany({ select: { itemCode: true, itemName: true } })
    const validCodes = new Set(validRms.map(r => r.itemCode))
    const recipeCombos = await prisma.recipeDb.findMany({ distinct: ['rmCode'], select: { rmCode: true, rmName: true } })
    const matched = [], unmatched = []
    for (const r of recipeCombos) {
      if (validCodes.has(r.rmCode)) {
        matched.push({ ...r, status: 'ok' })
      } else {
        const candidates = validRms.map(rm => ({ itemCode: rm.itemCode, itemName: rm.itemName }))
        const scored = candidates.map(c => { const res = findBestRmMatch(r.rmName, [c]); return res ? { ...c, score: res.score, method: res.method } : null }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 3)
        const suggestions = scored.map(s => { const cl = confidenceLabel(s.score); return { itemCode: s.itemCode, itemName: s.itemName, score: s.score, pct: Math.round(s.score * 100), confidence: cl.label, color: cl.color } })
        const affectedRows = await prisma.recipeDb.count({ where: { rmCode: r.rmCode } })
        unmatched.push({ recipeRmCode: r.rmCode, recipeRmName: r.rmName, affectedRows, suggestions, autoSuggest: suggestions[0]?.score >= 0.80 ? suggestions[0] : null })
      }
    }
    return res.json({ success: true, data: { unmatched, matched: matched.length, total: recipeCombos.length } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function fixRmMapping(req, res) {
  try {
    const { mappings } = req.body
    if (!Array.isArray(mappings) || mappings.length === 0) return res.status(400).json({ success: false, error: 'mappings array required' })
    let totalFixed = 0
    const log = []
    for (const m of mappings) {
      if (!m.fromCode || !m.toCode) continue
      const targetRm = await prisma.rmMaster.findUnique({ where: { itemCode: m.toCode } })
      if (!targetRm) { log.push({ from: m.fromCode, error: `Target RM ${m.toCode} not found in RM Master` }); continue }
      const affected = await prisma.recipeDb.findMany({ where: { rmCode: m.fromCode } })
      for (const row of affected) {
        try {
          const existing = await prisma.recipeDb.findUnique({ where: { productCode_rmCode: { productCode: row.productCode, rmCode: m.toCode } } })
          if (existing) {
            await prisma.recipeDb.update({ where: { productCode_rmCode: { productCode: row.productCode, rmCode: m.toCode } }, data: { qtyPerUnit: row.qtyPerUnit, uom: row.uom } })
            await prisma.recipeDb.delete({ where: { id: row.id } })
          } else {
            await prisma.recipeDb.update({ where: { id: row.id }, data: { rmCode: m.toCode, rmName: targetRm.itemName } })
          }
          totalFixed++
        } catch (e) { log.push({ from: m.fromCode, rowId: row.id, error: e.message }) }
      }
      log.push({ from: m.fromCode, to: m.toCode, fixed: affected.length })
    }
    return res.json({ success: true, totalFixed, log })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
