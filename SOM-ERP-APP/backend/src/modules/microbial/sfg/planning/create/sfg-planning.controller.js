import prisma from '../../../../../db.js'
import { createNotification } from '../../../../../services/notification-service.js'

export const allocateSfg = async (req, res) => {
  try {
    const { plan_id, microbe_code, microbe_name, microbe_type, multiplication_factor, required_cfu_per_g, order_qty_kg, picks } = req.body || {}
    if (!plan_id || !picks?.length) return res.status(400).json({ success: false, error: 'plan_id and picks[] required', code: 'VALIDATION_ERROR' })

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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
