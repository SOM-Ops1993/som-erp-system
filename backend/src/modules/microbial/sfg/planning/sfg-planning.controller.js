import prisma from '../../../../db.js'
import { createNotification } from '../../../../services/notification-service.js'

export async function checkPlanMicrobes(req, res) {
  try {
    const { planId } = req.params
    const mf = parseFloat(req.query.multiplication_factor) || 1

    const plan = await prisma.productionPlan.findUnique({
      where: { planId },
      select: { planId: true, productCode: true, productName: true, totalQty: true, salesOrderItemId: true },
    })
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' })

    const recipe = await prisma.recipeDb.findMany({
      where: { productCode: plan.productCode, isMicrobe: true },
    })
    if (!recipe.length) return res.json({ success: true, has_microbes: false, microbes: [], plan })

    const microbeData = []
    for (const rec of recipe) {
      const requiredCfuPerG = Number(rec.requiredCfu || 0)
      const orderQtyKg = Number(plan.totalQty || 0)
      const sfgReqKg = requiredCfuPerG > 0 ? (mf * requiredCfuPerG * orderQtyKg) : null

      // Complex JOIN + conditional aggregation — kept as $queryRaw
      const stock = await prisma.$queryRaw`
        SELECT i.inward_id, i.microbe_code, i.microbe_name, i.microbe_type, i.container_code, i.container_id,
               i.inhouse_cfu_per_g, i.remaining_qty_kg, i.biomass_batch_code, i.date_of_harvest, i.location, i.moisture, i.shelf_life_days,
               c.fill_status AS container_fill_status, c.location AS container_location
        FROM microbial_sfg_inward i JOIN microbial_sfg_container c ON c.container_id = i.container_id
        WHERE (i.microbe_code = ${rec.microbeCode || null} OR LOWER(i.microbe_name) = LOWER(${rec.rmName || ''}))
          AND i.status = 'ACTIVE' AND i.remaining_qty_kg > 0
        ORDER BY i.date_of_harvest ASC, i.created_at ASC
      `

      const byType = {}
      for (const s of stock) {
        const t = s.microbe_type
        if (!byType[t]) byType[t] = { microbe_type: t, batches: [], total_available_kg: 0, avg_cfu_per_g: 0 }
        const inhouseCfu = Number(s.inhouse_cfu_per_g)
        const reqKg = inhouseCfu > 0 && requiredCfuPerG > 0 ? (mf * requiredCfuPerG * orderQtyKg) / inhouseCfu : sfgReqKg
        byType[t].batches.push({ ...s, remaining_qty_kg: Number(s.remaining_qty_kg), inhouse_cfu_per_g: inhouseCfu, required_qty_kg: reqKg ? Number(reqKg.toFixed(3)) : null })
        byType[t].total_available_kg += Number(s.remaining_qty_kg)
      }
      for (const t of Object.keys(byType)) {
        const g = byType[t]
        const totalQty = g.batches.reduce((s, b) => s + b.remaining_qty_kg, 0)
        g.avg_cfu_per_g = totalQty > 0 ? g.batches.reduce((s, b) => s + b.inhouse_cfu_per_g * b.remaining_qty_kg, 0) / totalQty : 0
        g.total_available_kg = Number(g.total_available_kg.toFixed(3))
        g.avg_cfu_per_g = Number(g.avg_cfu_per_g.toFixed(2))
        g.required_qty_kg = requiredCfuPerG > 0 && g.avg_cfu_per_g > 0 ? Number(((mf * requiredCfuPerG * orderQtyKg) / g.avg_cfu_per_g).toFixed(3)) : null
        g.is_sufficient = g.required_qty_kg != null ? g.total_available_kg >= g.required_qty_kg : null
      }

      microbeData.push({
        rm_code: rec.rmCode,
        rm_name: rec.rmName,
        microbe_code: rec.microbeCode,
        qty_per_unit: Number(rec.qtyPerUnit),
        required_cfu_per_g: requiredCfuPerG,
        order_qty_kg: orderQtyKg,
        types: Object.values(byType),
      })
    }

    return res.json({
      success: true,
      has_microbes: true,
      plan: { ...plan, total_qty: Number(plan.totalQty) },
      multiplication_factor: mf,
      microbes: microbeData,
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function allocateSfg(req, res) {
  try {
    const { plan_id, microbe_code, microbe_name, microbe_type, multiplication_factor, required_cfu_per_g, order_qty_kg, picks } = req.body || {}
    if (!plan_id || !picks?.length) return res.status(400).json({ success: false, error: 'plan_id and picks[] required' })

    const results = await prisma.$transaction(async (tx) => {
      const allocated = []
      for (const pick of picks) {
        const { inward_id, container_code, inhouse_cfu_per_g, qty_kg } = pick
        const qty = Number(qty_kg)

        const inward = await tx.microbialSfgInward.findUnique({ where: { inwardId: inward_id } })
        if (!inward || Number(inward.remainingQtyKg) < qty)
          throw new Error(`Insufficient stock in batch ${inward_id}`)

        const newRemaining = Number(inward.remainingQtyKg) - qty
        const updatedInward = await tx.microbialSfgInward.update({
          where: { inwardId: inward_id },
          data: {
            remainingQtyKg: newRemaining,
            status: newRemaining <= 0 ? 'EXHAUSTED' : 'ACTIVE',
          },
        })

        await tx.microbialSfgContainer.update({
          where: { containerId: updatedInward.containerId },
          data: {
            currentQtyKg: { decrement: qty },
          },
        })

        const alloc = await tx.microbialSfgAllocation.create({
          data: {
            planId: plan_id,
            inwardId: inward_id,
            containerCode: container_code || '',
            microbeCode: microbe_code || '',
            microbeName: microbe_name || '',
            microbeType: microbe_type || '',
            allocatedQtyKg: qty,
            multiplicationFactor: Number(multiplication_factor || 1),
            requiredCfuPerG: Number(required_cfu_per_g || 0),
            inhouseCfuPerG: Number(inhouse_cfu_per_g || 0),
            orderQtyKg: Number(order_qty_kg || 0),
          },
        })
        allocated.push(alloc)
      }
      return allocated
    })

    try {
      const picksText = picks.map(p => `• ${p.qty_kg} kg from container ${p.container_code} (Batch: ${p.inward_id?.slice(-8)})`).join('\n')
      await createNotification({
        type: 'MICROBIAL_PICK',
        title: `Cold Room Pick — Plan ${plan_id}`,
        message: `Please pick the following microbial SFG for Plan ${plan_id} (${microbe_name || microbe_code} — ${microbe_type}):\n${picksText}`,
        targetRole: 'store_person',
        metadata: { plan_id, microbe_code, microbe_type, picks },
      })
    } catch (_) {}

    return res.status(201).json({ success: true, data: results })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getAllocationsForPlan(req, res) {
  try {
    const rows = await prisma.microbialSfgAllocation.findMany({
      where: { planId: req.params.planId },
      include: { inward: { select: { biomassBatchCode: true, dateOfHarvest: true, location: true } } },
      orderBy: { createdAt: 'asc' },
    })
    const data = rows.map(r => ({
      ...r,
      biomass_batch_code: r.inward?.biomassBatchCode ?? null,
      date_of_harvest:    r.inward?.dateOfHarvest    ?? null,
      batch_location:     r.inward?.location         ?? null,
      inward: undefined,
    }))
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function cancelAllocation(req, res) {
  try {
    const alloc = await prisma.microbialSfgAllocation.findUnique({ where: { allocationId: req.params.id } })
    if (!alloc) return res.status(404).json({ success: false, error: 'Allocation not found' })
    if (alloc.status === 'PICKED') return res.status(409).json({ success: false, error: 'Cannot cancel a PICKED allocation' })

    const qty = Number(alloc.allocatedQtyKg)

    await prisma.$transaction(async (tx) => {
      await tx.microbialSfgInward.update({
        where: { inwardId: alloc.inwardId },
        data: { remainingQtyKg: { increment: qty }, status: 'ACTIVE' },
      })
      await tx.microbialSfgContainer.update({
        where: { containerCode: alloc.containerCode },
        data: { currentQtyKg: { increment: qty }, fillStatus: 'PARTIAL' },
      })
      await tx.microbialSfgAllocation.delete({ where: { allocationId: req.params.id } })
    })

    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
