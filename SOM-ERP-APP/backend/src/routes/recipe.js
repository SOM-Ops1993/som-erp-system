import prisma from '../db.js'
import { findBestRmMatch, confidenceLabel } from '../utils/fuzzy.js'

export default async function recipeRoutes(fastify) {
  fastify.get('/', async (req) => {
    const { productCode } = req.query
    const where = productCode ? { productCode } : {}
    const rows = await prisma.recipeDb.findMany({ where, orderBy: [{ productCode: 'asc' }, { rmName: 'asc' }] })
    return { success: true, data: rows }
  })

  fastify.get('/products', async () => {
    const products = await prisma.recipeDb.findMany({
      distinct: ['productCode'],
      select: { productCode: true, productName: true }
    })
    return { success: true, data: products }
  })

  fastify.post('/bulk-save', async (req, reply) => {
    const { rows } = req.body
    if (!rows || !Array.isArray(rows) || rows.length === 0)
      return reply.status(400).send({ success: false, error: 'No rows provided' })

    const valid = rows.filter(r => r.productCode && r.productName && r.rmCode && r.rmName && r.qtyPerUnit && r.uom)
    if (!valid.length) return reply.status(400).send({ success: false, error: 'No valid rows found' })

    let saved = 0
    for (const r of valid) {
      await prisma.recipeDb.upsert({
        where: { productCode_rmCode: { productCode: r.productCode, rmCode: r.rmCode } },
        create: {
          productCode: r.productCode, productName: r.productName,
          rmCode: r.rmCode, rmName: r.rmName,
          qtyPerUnit: parseFloat(r.qtyPerUnit), uom: r.uom,
        },
        update: {
          productName: r.productName, rmName: r.rmName,
          qtyPerUnit: parseFloat(r.qtyPerUnit), uom: r.uom,
        }
      })
      saved++
    }
    return { success: true, saved, message: `${saved} rows saved` }
  })

  fastify.delete('/:id', async (req, reply) => {
    await prisma.recipeDb.delete({ where: { id: req.params.id } })
    return { success: true, message: 'Row deleted' }
  })

  fastify.delete('/product/:productCode', async (req, reply) => {
    const result = await prisma.recipeDb.deleteMany({ where: { productCode: req.params.productCode } })
    return { success: true, deleted: result.count }
  })

  // ── RM Reconciliation ────────────────────────────────────────────────────────

  /**
   * GET /api/recipe/check-rm-mapping
   * Finds all recipe rows whose rmCode does NOT exist in rm_master,
   * then runs fuzzy matching to suggest the correct RM.
   */
  fastify.get('/check-rm-mapping', async () => {
    // All RM codes that actually exist in rm_master
    const validRms = await prisma.rmMaster.findMany({
      select: { itemCode: true, itemName: true }
    })
    const validCodes = new Set(validRms.map(r => r.itemCode))

    // All distinct (rmCode, rmName) combos used in recipe
    const recipeCombos = await prisma.recipeDb.findMany({
      distinct: ['rmCode'],
      select: { rmCode: true, rmName: true }
    })

    // Split into matched / unmatched
    const matched = []
    const unmatched = []

    for (const r of recipeCombos) {
      if (validCodes.has(r.rmCode)) {
        matched.push({ ...r, status: 'ok' })
      } else {
        // Find fuzzy suggestions from valid RMs
        const suggestions = []
        const candidates = validRms.map(rm => ({ itemCode: rm.itemCode, itemName: rm.itemName }))

        // Get top 3 matches
        const scored = candidates.map(c => {
          const res = findBestRmMatch(r.rmName, [c])
          return res ? { ...c, score: res.score, method: res.method } : null
        }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 3)

        for (const s of scored) {
          const cl = confidenceLabel(s.score)
          suggestions.push({
            itemCode: s.itemCode,
            itemName: s.itemName,
            score: s.score,
            pct: Math.round(s.score * 100),
            confidence: cl.label,
            color: cl.color,
          })
        }

        // Count how many recipe rows use this bad code
        const affectedRows = await prisma.recipeDb.count({ where: { rmCode: r.rmCode } })

        unmatched.push({
          recipeRmCode: r.rmCode,
          recipeRmName: r.rmName,
          affectedRows,
          suggestions,
          autoSuggest: suggestions[0]?.score >= 0.80 ? suggestions[0] : null,
        })
      }
    }

    return {
      success: true,
      data: { unmatched, matched: matched.length, total: recipeCombos.length }
    }
  })

  /**
   * POST /api/recipe/fix-rm-mapping
   * Body: [ { fromCode, toCode, toName }, ... ]
   * Updates all recipe rows with fromCode → toCode/toName
   */
  fastify.post('/fix-rm-mapping', async (req, reply) => {
    const { mappings } = req.body
    if (!Array.isArray(mappings) || mappings.length === 0)
      return reply.status(400).send({ success: false, error: 'mappings array required' })

    let totalFixed = 0
    const log = []

    for (const m of mappings) {
      if (!m.fromCode || !m.toCode) continue

      // Verify target RM actually exists
      const targetRm = await prisma.rmMaster.findUnique({ where: { itemCode: m.toCode } })
      if (!targetRm) {
        log.push({ from: m.fromCode, error: `Target RM ${m.toCode} not found in RM Master` })
        continue
      }

      // Get all affected rows first (need IDs due to unique constraint)
      const affected = await prisma.recipeDb.findMany({ where: { rmCode: m.fromCode } })

      for (const row of affected) {
        try {
          // Check if target combo already exists (would violate unique)
          const existing = await prisma.recipeDb.findUnique({
            where: { productCode_rmCode: { productCode: row.productCode, rmCode: m.toCode } }
          })
          if (existing) {
            // Merge: update existing qty and delete this row
            await prisma.recipeDb.update({
              where: { productCode_rmCode: { productCode: row.productCode, rmCode: m.toCode } },
              data: { qtyPerUnit: row.qtyPerUnit, uom: row.uom }  // keep the remapped qty
            })
            await prisma.recipeDb.delete({ where: { id: row.id } })
          } else {
            await prisma.recipeDb.update({
              where: { id: row.id },
              data: { rmCode: m.toCode, rmName: targetRm.itemName }
            })
          }
          totalFixed++
        } catch (e) {
          log.push({ from: m.fromCode, rowId: row.id, error: e.message })
        }
      }

      log.push({ from: m.fromCode, to: m.toCode, fixed: affected.length })
    }

    return { success: true, totalFixed, log }
  })
}
