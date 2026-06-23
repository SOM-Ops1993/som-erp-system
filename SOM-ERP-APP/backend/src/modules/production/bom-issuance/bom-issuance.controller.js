import prisma from '../../../db.js'
import { writeAudit, auditUser } from '../../../middleware/audit.js'
import { createNotification } from '../../../services/notification-service.js'

export async function listPendingJobs(req, res) {
  try {
    // Complex 6-way JOIN with self-join for prev_batch — keep as raw
    const data = await prisma.$queryRaw`
      SELECT pj.*, pp.product_code, pp.planned_qty, pp.bom_version, pp.bom_id,
             pp.di_number, so.customer_name, so.etd, so.priority,
             ee.equipment_name,
             prev_qc.result AS prev_batch_qc,
             (pj.batch_no - 1) AS prev_batch_no
      FROM production_jobs pj
      JOIN production_plans pp ON pp.plan_id = pj.plan_id
      LEFT JOIN sales_orders so ON so.di_number = pp.di_number
      LEFT JOIN erp_equipment ee ON ee.equipment_id = pj.equipment_id
      LEFT JOIN production_jobs prev_job ON prev_job.plan_id = pj.plan_id AND prev_job.batch_no = pj.batch_no - 1
      LEFT JOIN batch_qc_records prev_qc ON prev_qc.job_id = prev_job.job_id
      WHERE pp.status = 'published' AND pj.status = 'pending'
      ORDER BY so.priority DESC, so.etd ASC, pj.batch_no ASC
    `
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getJob(req, res) {
  try {
    const job = await prisma.erpProductionJob.findUnique({
      where: { jobId: req.params.jobId },
      include: { plan: { select: { bomId: true, bomVersion: true, productCode: true, plannedQty: true, diNumber: true } } },
    })
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' })

    if (job.batchNo > 1) {
      const prevJob = await prisma.erpProductionJob.findFirst({
        where: { planId: job.planId, batchNo: job.batchNo - 1 },
        select: { jobId: true, status: true },
      })
      if (prevJob && !['qc_passed', 'scrapped'].includes(prevJob.status)) {
        return res.status(423).json({
          success: false,
          error: `Batch ${job.batchNo} is locked. Batch ${job.batchNo - 1} must be QC passed or scrapped first.`,
          prev_batch_status: prevJob.status,
        })
      }
    }

    const bom = await prisma.erpBomHeader.findUnique({ where: { bomId: job.plan.bomId } })
    const yieldFactor = Number(bom?.yieldPct || 98) / 100
    const batchQty = Number(job.batchQty)

    const formLines = await prisma.erpBomLineFormulation.findMany({
      where: { bomId: job.plan.bomId },
      include: { item: { select: { itemName: true, uom: true, isMicrobial: true } } },
      orderBy: { seqNo: 'asc' },
    })
    const packLines = await prisma.erpBomLinePacking.findMany({
      where: { bomId: job.plan.bomId },
      include: { item: { select: { itemName: true, uom: true } } },
      orderBy: { seqNo: 'asc' },
    })

    const enrichLine = async (line, lineType) => {
      const requiredQty = (Number(line.qtyPerUnit) * batchQty) / yieldFactor
      const issuedAgg = await prisma.erpBomIssuance.aggregate({
        where: { jobId: job.jobId, itemCode: line.itemCode },
        _sum: { issuedQty: true },
      })
      const totalIssued = Number(issuedAgg._sum.issuedQty || 0)
      const packs = await prisma.erpPack.findMany({
        where: {
          itemCode: line.itemCode,
          qrConfirmed: true,
          status: { in: ['active', 'partial'] },
          qtyRemaining: { gt: 0 },
        },
        select: { packId: true, lotNumber: true, qtyRemaining: true, inwardDate: true, status: true, location: true },
        orderBy: [{ inwardDate: 'asc' }, { createdAt: 'asc' }],
      })
      return {
        ...line,
        item_name: line.item?.itemName ?? null,
        uom: line.item?.uom ?? null,
        is_microbial: line.item?.isMicrobial ?? false,
        line_type: lineType,
        required_qty: Number(requiredQty.toFixed(6)),
        issued_qty: totalIssued,
        remaining_to_issue: Math.max(0, requiredQty - totalIssued),
        available_packs: packs,
        item: undefined,
      }
    }

    const allLines = [
      ...(await Promise.all(formLines.map(l => enrichLine(l, 'formulation')))),
      ...(await Promise.all(packLines.map(l => enrichLine(l, 'packing')))),
    ]

    const existingIssuances = await prisma.erpBomIssuance.findMany({
      where: { jobId: job.jobId },
      include: { pack: { select: { lotNumber: true } } },
      orderBy: { issuedAt: 'desc' },
    })
    const issuancesFlat = existingIssuances.map(bi => ({
      ...bi,
      lot_number: bi.pack?.lotNumber ?? null,
      pack: undefined,
    }))

    return res.json({ success: true, data: { ...job, bom, lines: allLines, issuances: issuancesFlat } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function issueItem(req, res) {
  try {
    const { job_id, item_code, pack_id, required_qty, issued_qty } = req.body || {}
    if (!job_id || !item_code || !pack_id || issued_qty === undefined)
      return res.status(400).json({ success: false, error: 'job_id, item_code, pack_id, issued_qty required' })

    const job = await prisma.erpProductionJob.findUnique({
      where: { jobId: job_id },
      include: { plan: { select: { status: true, planId: true, bomId: true, bomVersion: true } } },
    })
    if (!job || job.plan?.status !== 'published')
      return res.status(404).json({ success: false, error: 'Job not found or plan not published' })

    if (job.batchNo > 1) {
      const prevJob = await prisma.erpProductionJob.findFirst({
        where: { planId: job.planId, batchNo: job.batchNo - 1 },
        select: { status: true },
      })
      if (prevJob && !['qc_passed', 'scrapped'].includes(prevJob.status)) {
        return res.status(423).json({ success: false, error: `Batch ${job.batchNo - 1} must be QC released or scrapped first.` })
      }
    }

    const pack = await prisma.erpPack.findUnique({ where: { packId: pack_id } })
    if (!pack || pack.itemCode !== item_code)
      return res.status(404).json({ success: false, error: 'Pack not found or item code mismatch' })
    if (!pack.qrConfirmed)
      return res.status(400).json({ success: false, error: 'Cannot issue from unconfirmed pack (quarantine)' })
    if (Number(pack.qtyRemaining) < Number(issued_qty))
      return res.status(400).json({ success: false, error: `Insufficient stock. Available: ${pack.qtyRemaining}, Requested: ${issued_qty}` })

    const oldest = await prisma.erpPack.findFirst({
      where: { itemCode: item_code, qrConfirmed: true, status: { in: ['active', 'partial'] }, qtyRemaining: { gt: 0 } },
      select: { packId: true, lotNumber: true, qtyRemaining: true, inwardDate: true },
      orderBy: [{ inwardDate: 'asc' }, { createdAt: 'asc' }],
    })

    const isFifoViolation = oldest && oldest.packId.toString() !== pack_id.toString()
    if (isFifoViolation) {
      const overrideExists = await prisma.fifoOverrideLog.findFirst({
        where: {
          jobId: job_id,
          itemCode: item_code,
          selectedLot: pack.lotNumber,
          createdAt: { gt: new Date(Date.now() - 3600000) },
        },
      })
      if (!overrideExists) {
        return res.status(409).json({
          success: false,
          fifo_violation: true,
          error: `Older lot ${oldest.lotNumber} has ${oldest.qtyRemaining} remaining. FIFO required. Manager override needed.`,
          older_lot: oldest.lotNumber,
          older_qty: oldest.qtyRemaining,
          older_pack_id: oldest.packId,
        })
      }
    }

    const newQty = Number(pack.qtyRemaining) - Number(issued_qty)
    await prisma.erpPack.update({
      where: { packId: pack_id },
      data: { qtyRemaining: newQty, status: newQty === 0 ? 'exhausted' : 'partial' },
    })

    const issuance = await prisma.erpBomIssuance.create({
      data: {
        jobId: job_id,
        itemCode: item_code,
        packId: pack_id,
        requiredQty: required_qty || 0,
        issuedQty: issued_qty,
        issuedBy: req.user?.user_id || null,
        fifoOverride: isFifoViolation,
      },
    })

    await writeAudit({ ...auditUser(req), action: 'BOM_ISSUE', tableName: 'bom_issuance', recordId: issuance.issuanceId, newValue: { job_id, item_code, pack_id, issued_qty } })
    return res.status(201).json({ success: true, data: issuance })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function scrapBatch(req, res) {
  try {
    const { reason_code, notes } = req.body || {}
    if (!reason_code) return res.status(400).json({ success: false, error: 'reason_code required for scrap' })

    const job = await prisma.erpProductionJob.findUnique({ where: { jobId: req.params.id } })
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' })

    const issuances = await prisma.erpBomIssuance.findMany({
      where: { jobId: req.params.id },
      include: { pack: { select: { itemCode: true } } },
    })

    await prisma.productionLossLog.createMany({
      data: issuances.map(iss => ({
        jobId: req.params.id,
        itemCode: iss.pack?.itemCode ?? iss.itemCode,
        qtyLost: iss.issuedQty,
        reasonCode: reason_code,
        notes: notes || null,
        loggedBy: req.user?.user_id || null,
      })),
    })

    await prisma.erpProductionJob.update({
      where: { jobId: req.params.id },
      data: { status: 'scrapped', delayReasonCode: reason_code, delayNotes: notes || null, actualEndTime: new Date() },
    })

    await writeAudit({ ...auditUser(req), action: 'SCRAP', tableName: 'production_jobs', recordId: req.params.id, newValue: req.body })
    return res.json({ success: true, message: 'Batch scrapped. Materials written off to production_loss_log.' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function reprocessBatch(req, res) {
  try {
    const origJob = await prisma.erpProductionJob.findUnique({ where: { jobId: req.params.id } })
    if (!origJob) return res.status(404).json({ success: false, error: 'Job not found' })

    await prisma.erpProductionJob.update({
      where: { jobId: req.params.id },
      data: { status: 'failed', actualEndTime: new Date() },
    })

    const reprocessJob = await prisma.erpProductionJob.create({
      data: {
        planId: origJob.planId,
        batchNo: origJob.batchNo,
        batchCode: (origJob.batchCode || '') + '-REWORK',
        productCode: origJob.productCode,
        equipmentId: origJob.equipmentId,
        batchQty: origJob.batchQty,
        status: 'pending',
      },
    })

    await writeAudit({ ...auditUser(req), action: 'REPROCESS', tableName: 'production_jobs', recordId: req.params.id, newValue: { reprocess_job_id: reprocessJob.jobId } })
    return res.status(201).json({ success: true, data: reprocessJob, message: 'Reprocess job created. Issue BOM again for the new job.' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listHistory(req, res) {
  try {
    const { job_id, item_code, limit = 100, offset = 0 } = req.query
    const where = {}
    if (job_id) where.jobId = job_id
    if (item_code) where.itemCode = item_code

    const data = await prisma.erpBomIssuance.findMany({
      where,
      include: { pack: { select: { lotNumber: true, itemCode: true } } },
      orderBy: { issuedAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    })
    const result = data.map(b => ({
      ...b,
      lot_number: b.pack?.lotNumber ?? null,
      pack_item: b.pack?.itemCode ?? null,
      pack: undefined,
    }))
    return res.json({ success: true, data: result })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
