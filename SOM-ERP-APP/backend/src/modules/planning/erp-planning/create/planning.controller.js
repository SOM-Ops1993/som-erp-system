import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'
import { createNotification } from '../../../../services/notification-service.js'

export const analyseOrder = async (req, res) => {
  try {
    const { di_number, horizon_days = 3 } = req.body || {}
    if (!di_number) return res.status(400).json({ success: false, error: 'di_number required', code: 'VALIDATION_ERROR' })

    const [so, ep] = await Promise.all([
      prisma.erpSalesOrder.findUnique({ where: { diNumber: di_number } }),
      prisma.erpSalesOrder.findUnique({ where: { diNumber: di_number } }).then(async s =>
        s?.productCode ? prisma.erpProduct.findUnique({ where: { productCode: s.productCode } }) : null
      ),
    ])
    if (!so) return res.status(404).json({ success: false, error: 'Sales order not found', code: 'NOT_FOUND' })
    const o = {
      ...so,
      is_microbial:              ep?.isMicrobial              ?? null,
      microbial_strain_id:       ep?.microbialStrainId        ?? null,
      consolidation_window_days: ep?.consolidationWindowDays  ?? null,
      plant_id:                  ep?.plantId                  ?? null,
      shelf_life_days:           ep?.shelfLifeDays            ?? null,
      product_status:            ep?.status                   ?? null,
      order_qty:                 so.orderQty,
      product_code:              so.productCode,
    }
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

    // Step 4: Microbial
    if (o.is_microbial && o.microbial_strain_id) {
      const strain = await prisma.microbialStrain.findUnique({ where: { strainId: o.microbial_strain_id } })
      const containers = await prisma.microbialContainer.findMany({
        where:   { strainId: o.microbial_strain_id, status: { in: ['healthy', 'watch'] }, expiryDate: { gt: new Date() } },
        include: { strain: { select: { decayK: true } } },
        orderBy: { mfgDate: 'desc' },
      })
      const minCfu = Number(strain?.minViableCfuPerMl || 1e8)
      const cfuDemand = minCfu * Number(o.order_qty) * 1000 * 1.20
      let cfuTotal = 0
      const allocation = []
      for (const c of containers) {
        if (cfuTotal >= cfuDemand) break
        const daysSince  = (Date.now() - new Date(c.mfgDate).getTime()) / 86400000
        const currentCfu = Number(c.mfgCfuPerMl) * Math.exp(-Number(c.strain.decayK) * daysSince)
        const useVol     = Math.min(Number(c.volumeLitres), (cfuDemand - cfuTotal) / (currentCfu * 1000))
        cfuTotal += currentCfu * useVol * 1000
        allocation.push({
          container_id:      c.containerId,
          current_cfu_per_ml: currentCfu.toFixed(2),
          volume_to_use:      useVol.toFixed(3),
          cfu_contribution:   (currentCfu * useVol * 1000).toExponential(2),
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

        // time_motion_model is a database VIEW with no Prisma model — must use raw SQL
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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const createPlan = async (req, res) => {
  try {
    const {
      di_number, product_code, bom_id, planned_qty, equipment_id, batch_count,
      planned_start_date, planned_end_date, fg_stock_used, consolidation_group,
      is_urgent, urgent_reason,
    } = req.body || {}

    if (!di_number || !product_code || !bom_id || !planned_qty || !equipment_id || !batch_count)
      return res.status(400).json({ success: false, error: 'di_number, product_code, bom_id, planned_qty, equipment_id, batch_count required', code: 'VALIDATION_ERROR' })
    if (is_urgent && req.user?.role === 'planner')
      return res.status(403).json({ success: false, error: 'Urgent orders can only be inserted by planning_manager', code: 'FORBIDDEN' })

    const bom = await prisma.erpBomHeader.findUnique({
      where: { bomId: bom_id },
      select: { bomId: true, bomVersion: true },
    })
    if (!bom) return res.status(404).json({ success: false, error: 'BOM not found', code: 'NOT_FOUND' })

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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const logTimeMotion = async (req, res) => {
  try {
    const { product_code, equipment_id, operation_stage, qty_produced, time_hrs, workers_deployed, shift, notes } = req.body || {}
    if (!product_code || !operation_stage || !qty_produced || !time_hrs)
      return res.status(400).json({ success: false, error: 'product_code, operation_stage, qty_produced, time_hrs required', code: 'VALIDATION_ERROR' })

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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const recordQc = async (req, res) => {
  try {
    const { result, cfu_count, moisture_pct, ph_value, notes, action_taken } = req.body || {}
    if (!result) return res.status(400).json({ success: false, error: 'result required (pass/fail/hold)', code: 'VALIDATION_ERROR' })

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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
