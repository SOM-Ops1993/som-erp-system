import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'
import { createNotification } from '../../../../services/notification-service.js'

export const issueItem = async (req, res) => {
  try {
    const { job_id, item_code, pack_id, required_qty, issued_qty } = req.body || {}
    if (!job_id || !item_code || !pack_id || issued_qty === undefined)
      return res.status(400).json({ success: false, error: 'job_id, item_code, pack_id, issued_qty required', code: 'VALIDATION_ERROR' })

    const job = await prisma.erpProductionJob.findUnique({
      where: { jobId: job_id },
      include: { plan: { select: { status: true, planId: true, bomId: true, bomVersion: true } } },
    })
    if (!job || job.plan?.status !== 'published')
      return res.status(404).json({ success: false, error: 'Job not found or plan not published', code: 'NOT_FOUND' })

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
      return res.status(404).json({ success: false, error: 'Pack not found or item code mismatch', code: 'NOT_FOUND' })
    if (!pack.qrConfirmed)
      return res.status(400).json({ success: false, error: 'Cannot issue from unconfirmed pack (quarantine)', code: 'VALIDATION_ERROR' })
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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const scrapBatch = async (req, res) => {
  try {
    const { reason_code, notes } = req.body || {}
    if (!reason_code) return res.status(400).json({ success: false, error: 'reason_code required for scrap', code: 'VALIDATION_ERROR' })

    const job = await prisma.erpProductionJob.findUnique({ where: { jobId: req.params.id } })
    if (!job) return res.status(404).json({ success: false, error: 'Job not found', code: 'NOT_FOUND' })

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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const reprocessBatch = async (req, res) => {
  try {
    const origJob = await prisma.erpProductionJob.findUnique({ where: { jobId: req.params.id } })
    if (!origJob) return res.status(404).json({ success: false, error: 'Job not found', code: 'NOT_FOUND' })

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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
