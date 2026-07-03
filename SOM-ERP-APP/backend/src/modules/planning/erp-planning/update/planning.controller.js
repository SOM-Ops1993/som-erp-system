import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'
import { createNotification } from '../../../../services/notification-service.js'

export const submitPlan = async (req, res) => {
  try {
    const plan = await prisma.erpProductionPlan.findUnique({ where: { planId: req.params.id } })
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found', code: 'NOT_FOUND' })
    if (plan.status !== 'draft') return res.status(400).json({ success: false, error: 'Only draft plans can be submitted', code: 'VALIDATION_ERROR' })

    await prisma.erpProductionPlan.update({
      where: { planId: req.params.id },
      data: { status: 'submitted', submittedBy: req.user?.user_id || null, submittedAt: new Date() },
    })
    await writeAudit({ ...auditUser(req), action: 'SUBMIT', tableName: 'production_plans', recordId: req.params.id })
    return res.json({ success: true, message: 'Plan submitted for planning manager review' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const publishPlan = async (req, res) => {
  try {
    const plan = await prisma.erpProductionPlan.findUnique({ where: { planId: req.params.id } })
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found', code: 'NOT_FOUND' })
    if (plan.status !== 'submitted') return res.status(400).json({ success: false, error: 'Only submitted plans can be published', code: 'VALIDATION_ERROR' })

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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const startJob = async (req, res) => {
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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const delayJob = async (req, res) => {
  try {
    const { delay_reason_code, delay_notes } = req.body || {}
    if (!delay_reason_code) return res.status(400).json({ success: false, error: 'delay_reason_code required', code: 'VALIDATION_ERROR' })

    await prisma.erpProductionJob.update({
      where: { jobId: req.params.id },
      data: { delayReasonCode: delay_reason_code, delayNotes: delay_notes || null },
    })
    await writeAudit({ ...auditUser(req), action: 'DELAY', tableName: 'production_jobs', recordId: req.params.id, newValue: req.body })
    return res.json({ success: true, message: 'Delay reason logged' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
