import prisma from '../../../../db.js'

export const cancelPlan = async (req, res) => {
  try {
    const plan = await prisma.productionPlan.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } })
    if (plan.salesOrderItemId) await prisma.salesOrderItem.update({ where: { id: plan.salesOrderItemId }, data: { status: 'PENDING' } }).catch(() => {})
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
