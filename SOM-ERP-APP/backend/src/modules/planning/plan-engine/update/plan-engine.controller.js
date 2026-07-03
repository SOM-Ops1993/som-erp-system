import prisma from '../../../../db.js'

export const patchPlan = async (req, res) => {
  try {
    const allowed = ['status','shift','batchIncharge','equipment','location','batchCode','plannedDate','carrier','specs','process','stageInfo','unitPackQty','noOfUnits','pp1','pp2','sp1','noOfSp','labels','packingSpec','perDayCompletion','femaleWorkers','maleWorkers','remarks','eqpCheckStatus','noOfCycles','cycleBatchSize']
    const intFields = new Set(['noOfUnits','noOfSp','perDayCompletion','femaleWorkers','maleWorkers','noOfCycles'])
    const floatFields = new Set(['unitPackQty','cycleBatchSize'])
    const data = {}
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        if (k === 'plannedDate') data[k] = req.body[k] ? new Date(req.body[k]) : null
        else if (intFields.has(k)) data[k] = req.body[k] !== null && req.body[k] !== '' ? parseInt(req.body[k]) : null
        else if (floatFields.has(k)) data[k] = req.body[k] !== null && req.body[k] !== '' ? parseFloat(req.body[k]) : null
        else data[k] = req.body[k]
      }
    }
    const plan = await prisma.productionPlan.update({ where: { id: req.params.id }, data })
    if (data.status === 'IN_PROGRESS' && plan.salesOrderItemId) await prisma.salesOrderItem.update({ where: { id: plan.salesOrderItemId }, data: { status: 'UNDER_PRODUCTION' } }).catch(() => {})
    if (data.status === 'COMPLETED' && plan.salesOrderItemId) await prisma.salesOrderItem.update({ where: { id: plan.salesOrderItemId }, data: { status: 'PACKED' } }).catch(() => {})
    return res.json({ success: true, data: plan })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
