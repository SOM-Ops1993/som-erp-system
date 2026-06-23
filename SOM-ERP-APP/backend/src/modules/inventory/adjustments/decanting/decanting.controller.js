import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'
import { createNotification } from '../../../../services/notification-service.js'

export async function createDecanting(req, res) {
  const { source_pack_id, target_container_id, qty_to_transfer, qty_actual } = req.body || {}
  if (!source_pack_id || !target_container_id || qty_to_transfer === undefined) {
    return res.status(400).json({ success: false, error: 'source_pack_id, target_container_id, qty_to_transfer required' })
  }

  try {
    const pack = await prisma.erpPack.findUnique({ where: { packId: source_pack_id } })
    if (!pack) return res.status(404).json({ success: false, error: 'Source pack not found' })
    if (!pack.qrConfirmed) return res.status(400).json({ success: false, error: 'Source pack not QR confirmed' })
    if (Number(pack.qtyRemaining) < Number(qty_to_transfer))
      return res.status(400).json({ success: false, error: `Insufficient qty. Available: ${pack.qtyRemaining}` })

    const container = await prisma.erpContainer.findUnique({ where: { containerId: target_container_id } })
    if (!container) return res.status(404).json({ success: false, error: 'Target container not found' })
    if (container.itemCode !== pack.itemCode)
      return res.status(400).json({ success: false, error: `Container is for ${container.itemCode}, pack is ${pack.itemCode}. Item mismatch.` })

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
      return res.status(400).json({ success: false, error: `Container overflow. Max capacity: ${container.maxCapacity}, current: ${container.currentQty}, adding: ${actualQty}` })
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
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listDecanting(req, res) {
  try {
    const { pack_id, limit = 50, offset = 0 } = req.query
    // Needs performed_by_name from users — keep as raw
    const data = await prisma.$queryRaw`
      SELECT dl.*, p.lot_number, p.item_code, u.full_name AS performed_by_name
      FROM decanting_log dl
      JOIN erp_packs p ON p.pack_id = dl.source_pack_id
      LEFT JOIN users u ON u.user_id = dl.performed_by
      WHERE (${pack_id || null}::uuid IS NULL OR dl.source_pack_id = ${pack_id || null}::uuid)
      ORDER BY dl.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
