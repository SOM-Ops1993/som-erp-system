import prisma from '../../db.js'
import { writeAudit, auditUser } from '../../middleware/audit.js'
import { createNotification } from '../../services/notification-service.js'

export async function analyseOrder(req, res) {
  try {
    const { di_number, horizon_days = 3 } = req.body || {}
    if (!di_number) return res.status(400).json({ success: false, error: 'di_number required' })

    // Keep JOIN as raw — merges sales_orders + erp_products into one flat object
    const order = await prisma.$queryRaw`
      SELECT so.*, ep.is_microbial, ep.microbial_strain_id, ep.consolidation_window_days,
             ep.plant_id, ep.shelf_life_days, ep.status AS product_status
      FROM sales_orders so LEFT JOIN erp_products ep ON ep.product_code = so.product_code
      WHERE so.di_number = ${di_number}
    `
    if (!order[0]) return res.status(404).json({ success: false, error: 'Sales order not found' })
    const o = order[0]
    if (o.status !== 'confirmed')
      return res.status(400).json({ success: false, error: `Order must be confirmed. Current status: ${o.status}` })

    const analysis = {}

    // Step 1: FG stock
    const fgAgg = await prisma.erpPack.aggregate({
      where: { itemCode: o.product_code, status: { in: ['active', 'partial'] }, qrConfirmed: true },
      _sum: { qtyRemaining: true },
    })
    const fgStock = Number(fgAgg._sum.qtyRemaining || 0)
    analysis.step1_fg = {
      available_fg: fgStock,
      order_qty: Number(o.order_qty),
      can_fulfil_from_fg: fgStock >= Number(o.order_qty),
      suggestion: fgStock >= Number(o.order_qty)
        ? `Fulfilled from FG stock (${fgStock} available). No production needed.`
        : `FG stock insufficient (${fgStock} / ${o.order_qty}). Production required.`,
    }

    // Step 2: Consolidation window
    const consolidationDays = Number(o.consolidation_window_days || 3)
    const etdTo = new Date(new Date(o.etd).getTime() + consolidationDays * 86400000)
    const consolidatableOrders = await prisma.erpSalesOrder.findMany({
      where: {
        productCode: o.product_code,
        status: 'confirmed',
        diNumber: { not: di_number },
        etd: { gte: new Date(o.etd), lte: etdTo },
      },
      select: { diNumber: true, orderQty: true, qtyUnit: true, etd: true },
    })
    analysis.step2_consolidation = {
      consolidatable_orders: consolidatableOrders,
      suggestion: consolidatableOrders.length
        ? `Can combine with ${consolidatableOrders.map(x => x.diNumber).join(', ')} (ETD within ${consolidationDays} days).`
        : 'No other orders to consolidate.',
    }

    // Step 3: BOM & RM availability
    const bom = await prisma.erpBomHeader.findFirst({
      where: { productCode: o.product_code, status: 'active' },
      orderBy: { effectiveDate: 'desc' },
    })
    if (!bom) {
      analysis.step3_rm = { error: 'No active BOM found for this product' }
    } else {
      const yieldFactor = Number(bom.yieldPct) / 100
      const requiredQty = Number(o.order_qty) / yieldFactor

      const formLines = await prisma.erpBomLineFormulation.findMany({
        where: { bomId: bom.bomId },
        include: { item: { select: { itemName: true, uom: true, reorderLevel: true } } },
      })
      const packLines = await prisma.erpBomLinePacking.findMany({
        where: { bomId: bom.bomId },
        include: { item: { select: { itemName: true, uom: true } } },
      })

      const formIds = new Set(formLines.map(l => l.id))
      const allLines = [...formLines, ...packLines]
      const rmCheck = []
      let anyShort = false

      for (const line of allLines) {
        const needed = Number(line.qtyPerUnit) * requiredQty
        const stockAgg = await prisma.erpPack.aggregate({
          where: { itemCode: line.itemCode, qrConfirmed: true, status: { in: ['active', 'partial'] } },
          _sum: { qtyRemaining: true },
        })
        const available = Number(stockAgg._sum.qtyRemaining || 0)
        const statusColor = available >= needed ? 'green' : available >= needed * 0.5 ? 'amber' : 'red'
        if (statusColor !== 'green') anyShort = true
        rmCheck.push({
          item_code: line.itemCode,
          item_name: line.item?.itemName ?? null,
          needed: Number(needed.toFixed(4)),
          available,
          shortage: Math.max(0, needed - available),
          status: statusColor,
          is_critical: line.isCritical || false,
          line_type: formIds.has(line.id) ? 'formulation' : 'packing',
        })
      }

      analysis.step3_rm = {
        bom_id: bom.bomId,
        bom_version: bom.bomVersion,
        yield_pct: bom.yieldPct,
        required_qty: requiredQty,
        lines: rmCheck,
        any_short: anyShort,
      }
      analysis.bom_id = bom.bomId
      analysis.bom_version = bom.bomVersion
    }

    // Step 4: Microbial (keep raw — complex JOIN + computed CFU)
    if (o.is_microbial && o.microbial_strain_id) {
      const strain = await prisma.$queryRaw`SELECT * FROM microbial_strains WHERE strain_id = ${o.microbial_strain_id}::uuid`
      const containers = await prisma.$queryRaw`
        SELECT mc.*, ms.decay_k FROM microbial_containers mc
        JOIN microbial_strains ms ON ms.strain_id = mc.strain_id
        WHERE mc.strain_id = ${o.microbial_strain_id}::uuid AND mc.status IN ('healthy','watch') AND mc.expiry_date > NOW()
        ORDER BY mc.mfg_date DESC
      `
      const minCfu = Number(strain[0]?.min_viable_cfu_per_ml || 1e8)
      const cfuDemand = minCfu * Number(o.order_qty) * 1000 * 1.20
      let cfuTotal = 0
      const allocation = []
      for (const c of containers) {
        if (cfuTotal >= cfuDemand) break
        const daysSince = (Date.now() - new Date(c.mfg_date).getTime()) / 86400000
        const currentCfu = Number(c.mfg_cfu_per_ml) * Math.exp(-Number(c.decay_k) * daysSince)
        const useVol = Math.min(Number(c.volume_litres), (cfuDemand - cfuTotal) / (currentCfu * 1000))
        cfuTotal += currentCfu * useVol * 1000
        allocation.push({
          container_id: c.container_id,
          current_cfu_per_ml: currentCfu.toFixed(2),
          volume_to_use: useVol.toFixed(3),
          cfu_contribution: (currentCfu * useVol * 1000).toExponential(2),
        })
      }
      analysis.step4_microbial = {
        cfu_demand: cfuDemand.toExponential(2),
        cfu_available: cfuTotal.toExponential(2),
        sufficient: cfuTotal >= cfuDemand,
        allocation,
      }
    } else {
      analysis.step4_microbial = { applicable: false }
    }

    // Steps 5–7: Equipment & scheduling
    if (o.plant_id) {
      const equipment = await prisma.erpEquipment.findFirst({
        where: { plantId: o.plant_id, status: 'active' },
        orderBy: { workingVolume: 'desc' },
      })
      if (equipment) {
        const conflictJobs = await prisma.erpProductionJob.findMany({
          where: {
            equipmentId: equipment.equipmentId,
            status: { in: ['pending', 'in_progress'] },
            expectedEndTime: { gt: new Date() },
          },
          select: { jobId: true, batchCode: true, expectedStartTime: true, expectedEndTime: true },
          orderBy: { expectedStartTime: 'asc' },
          take: 3,
        })
        analysis.step5_equipment = {
          equipment_id: equipment.equipmentId,
          equipment_name: equipment.equipmentName,
          working_volume: equipment.workingVolume,
          working_volume_unit: equipment.workingVolumeUnit,
          cleaning_time_hrs: equipment.cleaningTimeHrs,
          conflicts: conflictJobs,
          next_available: conflictJobs[0]?.expectedEndTime || 'Now',
        }
        analysis.equipment_id = equipment.equipmentId

        const workVol = Number(equipment.workingVolume || o.order_qty)
        const batchCount = Math.ceil(Number(o.order_qty) / workVol)
        analysis.step6_batches = {
          batch_count: batchCount,
          qty_per_batch: (Number(o.order_qty) / batchCount).toFixed(3),
          working_volume: workVol,
        }

        // time_motion_model has no Prisma model — must stay raw
        const tmm = await prisma.$queryRaw`
          SELECT * FROM time_motion_model
          WHERE product_code = ${o.product_code} AND equipment_id = ${equipment.equipmentId}::uuid
        `
        if (tmm.length) {
          const totalMins = tmm.reduce((sum, row) => sum + Number(row.avg_mins_per_unit) * Number(o.order_qty), 0)
          analysis.step7_time_motion = {
            estimate_hrs: (totalMins / 60).toFixed(1),
            stages: tmm.map(r => ({
              stage: r.operation_stage,
              avg_mins_per_unit: r.avg_mins_per_unit,
              confidence: r.confidence,
              observations: Number(r.observation_count),
            })),
          }
        } else {
          analysis.step7_time_motion = { estimate_hrs: null, message: 'No time-motion data available yet' }
        }
      } else {
        analysis.step5_equipment = { error: 'No active equipment found for this plant' }
      }
    } else {
      analysis.step5_equipment = { error: 'No plant assigned to product' }
    }

    return res.json({ success: true, data: { order: o, analysis } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createPlan(req, res) {
  try {
    const {
      di_number, product_code, bom_id, planned_qty, equipment_id, batch_count,
      planned_start_date, planned_end_date, fg_stock_used, consolidation_group,
      is_urgent, urgent_reason,
    } = req.body || {}

    if (!di_number || !product_code || !bom_id || !planned_qty || !equipment_id || !batch_count)
      return res.status(400).json({ success: false, error: 'di_number, product_code, bom_id, planned_qty, equipment_id, batch_count required' })
    if (is_urgent && req.user?.role === 'planner')
      return res.status(403).json({ success: false, error: 'Urgent orders can only be inserted by planning_manager' })

    const bom = await prisma.erpBomHeader.findUnique({
      where: { bomId: bom_id },
      select: { bomId: true, bomVersion: true },
    })
    if (!bom) return res.status(404).json({ success: false, error: 'BOM not found' })

    const plan = await prisma.erpProductionPlan.create({
      data: {
        diNumber: di_number,
        productCode: product_code,
        bomId: bom.bomId,
        bomVersion: bom.bomVersion,
        plannedQty: planned_qty,
        equipmentId: equipment_id,
        batchCount: Number(batch_count),
        plannedStartDate: planned_start_date ? new Date(planned_start_date) : null,
        plannedEndDate: planned_end_date ? new Date(planned_end_date) : null,
        fgStockUsed: fg_stock_used || 0,
        consolidationGroup: consolidation_group || null,
        isUrgent: is_urgent || false,
        urgentReason: urgent_reason || null,
        status: 'draft',
        createdBy: req.user?.user_id || null,
      },
    })

    const qtyPerBatch = Number(planned_qty) / Number(batch_count)
    const jobs = []
    for (let i = 1; i <= Number(batch_count); i++) {
      const job = await prisma.erpProductionJob.create({
        data: {
          planId: plan.planId,
          batchNo: i,
          batchCode: `${product_code}-BATCH-${String(i).padStart(2, '0')}`,
          productCode: product_code,
          equipmentId: equipment_id,
          batchQty: qtyPerBatch,
          status: 'pending',
        },
      })
      jobs.push(job)
    }

    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'production_plans', recordId: plan.planId, newValue: req.body })
    return res.status(201).json({ success: true, data: { ...plan, jobs } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listErpPlans(req, res) {
  try {
    const { status, product_code, limit = 50, offset = 0 } = req.query
    // Multi-table JOIN with user names — keep as raw
    const data = await prisma.$queryRaw`
      SELECT pp.*, so.customer_name, so.etd, so.priority,
             u1.full_name AS created_by_name, u2.full_name AS published_by_name
      FROM production_plans pp
      LEFT JOIN sales_orders so ON so.di_number = pp.di_number
      LEFT JOIN users u1 ON u1.user_id = pp.created_by
      LEFT JOIN users u2 ON u2.user_id = pp.published_by
      WHERE (${status || null}::text IS NULL OR pp.status = ${status || null})
        AND (${product_code || null}::text IS NULL OR pp.product_code = ${product_code || null})
      ORDER BY pp.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getErpPlan(req, res) {
  try {
    const plan = await prisma.erpProductionPlan.findUnique({ where: { planId: req.params.id } })
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' })

    const jobs = await prisma.erpProductionJob.findMany({
      where: { planId: req.params.id },
      include: { equipment: { select: { equipmentName: true } } },
      orderBy: { batchNo: 'asc' },
    })
    const jobsFlat = jobs.map(j => ({
      ...j,
      equipment_name: j.equipment?.equipmentName ?? null,
      equipment: undefined,
    }))
    return res.json({ success: true, data: { ...plan, jobs: jobsFlat } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function submitPlan(req, res) {
  try {
    const plan = await prisma.erpProductionPlan.findUnique({ where: { planId: req.params.id } })
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' })
    if (plan.status !== 'draft') return res.status(400).json({ success: false, error: 'Only draft plans can be submitted' })

    await prisma.erpProductionPlan.update({
      where: { planId: req.params.id },
      data: { status: 'submitted', submittedBy: req.user?.user_id || null, submittedAt: new Date() },
    })
    await writeAudit({ ...auditUser(req), action: 'SUBMIT', tableName: 'production_plans', recordId: req.params.id })
    return res.json({ success: true, message: 'Plan submitted for planning manager review' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function publishPlan(req, res) {
  try {
    const plan = await prisma.erpProductionPlan.findUnique({ where: { planId: req.params.id } })
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' })
    if (plan.status !== 'submitted') return res.status(400).json({ success: false, error: 'Only submitted plans can be published' })

    await prisma.erpProductionPlan.update({
      where: { planId: req.params.id },
      data: { status: 'published', publishedBy: req.user?.user_id || null, publishedAt: new Date() },
    })
    if (plan.diNumber) {
      await prisma.erpSalesOrder.update({ where: { diNumber: plan.diNumber }, data: { status: 'planned' } })
    }

    const jobs = await prisma.erpProductionJob.findMany({
      where: { planId: req.params.id },
      orderBy: { batchNo: 'asc' },
    })

    await createNotification({ type: 'bom_published', title: `Production Plan Published: ${plan.productCode}`, message: `BOM issued for ${plan.productCode}, ${jobs.length} batches planned. Action required for material issuance.`, targetRole: 'store_person', refType: 'production_plan', refId: plan.planId })
    await createNotification({ type: 'bom_published', title: `Production Plan Published: ${plan.productCode}`, message: `Production plan published for ${plan.productCode}, ${jobs.length} batches.`, targetRole: 'plant_supervisor', refType: 'production_plan', refId: plan.planId })
    if (plan.isUrgent) await createNotification({ type: 'urgent_order', title: `URGENT Production Plan: ${plan.productCode}`, message: `Urgent production order inserted: ${plan.productCode}. Reason: ${plan.urgentReason || 'not specified'}`, targetRole: 'plant_supervisor', refType: 'production_plan', refId: plan.planId })

    await writeAudit({ ...auditUser(req), action: 'PUBLISH', tableName: 'production_plans', recordId: req.params.id })
    return res.json({ success: true, message: 'Plan published. Plant and store teams notified.' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function startJob(req, res) {
  try {
    await prisma.erpProductionJob.updateMany({
      where: { jobId: req.params.id, status: 'pending' },
      data: { status: 'in_progress', actualStartTime: new Date() },
    })
    const job = await prisma.erpProductionJob.findUnique({
      where: { jobId: req.params.id },
      select: { planId: true },
    })
    if (job?.planId) {
      const plan = await prisma.erpProductionPlan.findUnique({
        where: { planId: job.planId },
        select: { diNumber: true, status: true },
      })
      if (plan?.status === 'published') {
        await prisma.erpProductionPlan.update({ where: { planId: job.planId }, data: { status: 'in_production' } })
      }
      if (plan?.diNumber) {
        await prisma.erpSalesOrder.update({ where: { diNumber: plan.diNumber }, data: { status: 'in_production' } })
      }
    }
    await writeAudit({ ...auditUser(req), action: 'START', tableName: 'production_jobs', recordId: req.params.id })
    return res.json({ success: true, message: 'Batch started' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function delayJob(req, res) {
  try {
    const { delay_reason_code, delay_notes } = req.body || {}
    if (!delay_reason_code) return res.status(400).json({ success: false, error: 'delay_reason_code required' })

    await prisma.erpProductionJob.update({
      where: { jobId: req.params.id },
      data: { delayReasonCode: delay_reason_code, delayNotes: delay_notes || null },
    })
    await writeAudit({ ...auditUser(req), action: 'DELAY', tableName: 'production_jobs', recordId: req.params.id, newValue: req.body })
    return res.json({ success: true, message: 'Delay reason logged' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function recordQc(req, res) {
  try {
    const { result, cfu_count, moisture_pct, ph_value, notes, action_taken } = req.body || {}
    if (!result) return res.status(400).json({ success: false, error: 'result required (pass/fail/hold)' })

    const qc = await prisma.batchQcRecord.create({
      data: {
        jobId: req.params.id,
        qcPersonId: req.user?.user_id || null,
        result,
        cfuCount: cfu_count || null,
        moisturePct: moisture_pct || null,
        phValue: ph_value || null,
        notes: notes || null,
        actionTaken: action_taken || null,
      },
    })

    if (result === 'pass') {
      await prisma.erpProductionJob.update({ where: { jobId: req.params.id }, data: { status: 'qc_passed', actualEndTime: new Date() } })
    } else if (result === 'fail') {
      await prisma.erpProductionJob.update({ where: { jobId: req.params.id }, data: { status: 'qc_failed', actualEndTime: new Date() } })
    }

    await writeAudit({ ...auditUser(req), action: 'QC_RECORD', tableName: 'batch_qc_records', recordId: qc.qcId, newValue: req.body })
    return res.status(201).json({ success: true, data: qc })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function logTimeMotion(req, res) {
  try {
    const { product_code, equipment_id, operation_stage, qty_produced, time_hrs, workers_deployed, shift, notes } = req.body || {}
    if (!product_code || !operation_stage || !qty_produced || !time_hrs)
      return res.status(400).json({ success: false, error: 'product_code, operation_stage, qty_produced, time_hrs required' })

    const row = await prisma.timeMotionLog.create({
      data: {
        productCode: product_code,
        equipmentId: equipment_id || null,
        operationStage: operation_stage,
        qtyProduced: qty_produced,
        timeHrs: time_hrs,
        workersDeployed: workers_deployed || null,
        shift: shift || null,
        supervisorId: req.user?.user_id || null,
        notes: notes || null,
      },
    })
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'time_motion_logs', recordId: row.id, newValue: req.body })
    return res.status(201).json({ success: true, data: row })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listTimeMotion(req, res) {
  try {
    const { product_code, equipment_id } = req.query
    // time_motion_model is an aggregated view with no Prisma model — must stay raw
    const data = await prisma.$queryRaw`
      SELECT tmm.*, ep.product_name, ee.equipment_name
      FROM time_motion_model tmm
      LEFT JOIN erp_products ep ON ep.product_code = tmm.product_code
      LEFT JOIN erp_equipment ee ON ee.equipment_id = tmm.equipment_id
      WHERE (${product_code || null}::text IS NULL OR tmm.product_code = ${product_code || null})
        AND (${equipment_id || null}::uuid IS NULL OR tmm.equipment_id = ${equipment_id || null}::uuid)
      ORDER BY tmm.product_code, tmm.operation_stage
    `
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
