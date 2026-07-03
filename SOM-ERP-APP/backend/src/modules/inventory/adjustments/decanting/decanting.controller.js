import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'
import { createNotification } from '../../../../services/notification-service.js'

export const createDecanting = async (req, res) => {
  const { source_pack_id, target_container_id, qty_to_transfer, qty_actual } = req.body || {}
  if (!source_pack_id || !target_container_id || qty_to_transfer === undefined) {
    return res.status(400).json({ success: false, error: 'source_pack_id, target_container_id, qty_to_transfer required', code: 'VALIDATION_ERROR' })
  }

  try {
    const pack = await prisma.erpPack.findUnique({ where: { packId: source_pack_id } })
    if (!pack) return res.status(404).json({ success: false, error: 'Source pack not found', code: 'NOT_FOUND' })
    if (!pack.qrConfirmed) return res.status(400).json({ success: false, error: 'Source pack not QR confirmed', code: 'VALIDATION_ERROR' })
    if (Number(pack.qtyRemaining) < Number(qty_to_transfer))
      return res.status(400).json({ success: false, error: `Insufficient qty. Available: ${pack.qtyRemaining}`, code: 'VALIDATION_ERROR' })

    const container = await prisma.erpContainer.findUnique({ where: { containerId: target_container_id } })
    if (!container) return res.status(404).json({ success: false, error: 'Target container not found', code: 'NOT_FOUND' })
    if (container.itemCode !== pack.itemCode)
      return res.status(400).json({ success: false, error: `Container is for ${container.itemCode}, pack is ${pack.itemCode}. Item mismatch.`, code: 'VALIDATION_ERROR' })

    const actualQty = qty_actual !== undefined ? Number(qty_actual) : Number(qty_to_transfer)

    const item = await prisma.erpItem.findUnique({
      where: { itemCode: pack.itemCode },
      select: { decantingTolerancePct: true },
    })
    const tolerancePct = Number(item?.decantingTolerancePct || 0.5)
    const variancePct = (Math.abs(actualQty - Number(qty_to_transfer)) / Number(qty_to_transfer)) * 100
    const needsApproval = variancePct > tolerancePct

    if (needsApproval && !req.body.supervisor_approved) {
      return res.status(422).json({
        success: false,
        needs_approval: true,
        variance_pct: variancePct.toFixed(3),
        tolerance_pct: tolerancePct,
        message: `Actual qty (${actualQty}) differs from entered qty (${qty_to_transfer}) by ${variancePct.toFixed(2)}%, which exceeds tolerance of ${tolerancePct}%. Supervisor approval required.`,
      })
    }

    const newPackQty = Number(pack.qtyRemaining) - actualQty
    const newContainerQty = Number(container.currentQty) + actualQty

    if (newContainerQty > Number(container.maxCapacity)) {
      return res.status(400).json({ success: false, error: `Container overflow. Max capacity: ${container.maxCapacity}, current: ${container.currentQty}, adding: ${actualQty}`, code: 'VALIDATION_ERROR' })
    }

    await prisma.erpPack.update({
      where: { packId: source_pack_id },
      data: { qtyRemaining: newPackQty, status: newPackQty === 0 ? 'exhausted' : 'partial' },
    })
    await prisma.erpContainer.update({
      where: { containerId: target_container_id },
      data: { currentQty: newContainerQty, lastReplenishedAt: new Date() },
    })

    const approvedBy = req.body.supervisor_approved ? (req.user?.user_id || null) : null
    const log = await prisma.decantingLog.create({
      data: {
        sourcePackId: source_pack_id,
        targetContainer: target_container_id,
        qtyEntered: qty_to_transfer,
        qtyActual: actualQty,
        variancePct,
        tolerancePct,
        needsApproval,
        approvedBy,
        approvedAt: approvedBy ? new Date() : null,
        performedBy: req.user?.user_id || null,
        status: 'completed',
      },
    })

    if (newContainerQty <= Number(container.lowStockThreshold)) {
      await createNotification({
        type: 'rm_reorder',
        title: `Container Low Stock: ${container.containerId}`,
        message: `Container ${container.containerId} (${pack.itemCode}) is at ${newContainerQty} ${pack.unit}, below threshold of ${container.lowStockThreshold}. Replenishment needed.`,
        targetRole: 'store_manager',
        refType: 'erp_container',
        refId: target_container_id,
      })
    }

    await writeAudit({ ...auditUser(req), action: 'DECANT', tableName: 'decanting_log', recordId: log.id, newValue: req.body })
    return res.status(201).json({ success: true, data: log })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};

export const listDecanting = async (req, res) => {
  try {
    const { pack_id, limit = 50, offset = 0 } = req.query

    const logs = await prisma.decantingLog.findMany({
      where: pack_id ? { sourcePackId: pack_id } : {},
      include: {
        sourcePack: { select: { lotNumber: true, itemCode: true } },
      },
      orderBy: { createdAt: 'desc' },
      take:    Number(limit),
      skip:    Number(offset),
    })

    // Resolve performed-by names in one batch query
    const userIds = [...new Set(logs.map(l => l.performedBy).filter(Boolean))]
    const users   = userIds.length
      ? await prisma.user.findMany({ where: { userId: { in: userIds } }, select: { userId: true, fullName: true } })
      : []
    const userMap = Object.fromEntries(users.map(u => [u.userId, u.fullName]))

    const data = logs.map(l => ({
      ...l,
      lot_number:          l.sourcePack?.lotNumber  ?? null,
      item_code:           l.sourcePack?.itemCode   ?? null,
      performed_by_name:   userMap[l.performedBy]   ?? null,
      sourcePack: undefined,
    }))

    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};
