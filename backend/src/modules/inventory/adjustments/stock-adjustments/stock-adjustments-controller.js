import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'
import { createNotification } from '../../../../services/notification-service.js'

export async function createStockAdjustment(req, res) {
  const { pack_id, reason_code, qty_after, notes } = req.body || {}
  if (!pack_id || !reason_code || qty_after === undefined)
    return res.status(400).json({ success: false, error: 'pack_id, reason_code, qty_after required' })

  try {
    const rc = await prisma.reasonCode.findFirst({
      where: { category: 'stock_adjustment', code: reason_code, isActive: true },
    })
    if (!rc)
      return res.status(400).json({ success: false, error: `Invalid reason_code: ${reason_code}. Must be from predefined list.` })

    const pack = await prisma.erpPack.findUnique({ where: { packId: pack_id } })
    if (!pack) return res.status(404).json({ success: false, error: 'Pack not found' })
    if (!pack.qrConfirmed) return res.status(400).json({ success: false, error: 'Cannot adjust pack without QR confirmation' })

    const qty_before = Number(pack.qtyRemaining)
    const delta = Number(qty_after) - qty_before

    const adj = await prisma.stockAdjustment.create({
      data: {
        packId: pack_id,
        itemCode: pack.itemCode,
        reasonCode: reason_code,
        qtyBefore: qty_before,
        qtyAfter: qty_after,
        delta,
        raisedBy: req.user?.user_id || null,
        status: 'pending',
        notes: notes || null,
      },
    })

    await createNotification({
      type: 'adj_pending_approval',
      title: 'Stock Adjustment Pending Approval',
      message: `Adjustment for pack ${pack.lotNumber} (${pack.itemCode}): ${qty_before} -> ${qty_after} (${delta > 0 ? '+' : ''}${delta}). Reason: ${reason_code}. Raised by: ${req.user?.full_name || req.user?.username}.`,
      targetRole: 'store_manager',
      refType: 'stock_adjustment',
      refId: adj.adjustmentId,
    })

    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'stock_adjustments', recordId: adj.adjustmentId, newValue: req.body })
    return res.status(201).json({ success: true, data: adj })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function approveStockAdjustment(req, res) {
  try {
    const adj = await prisma.stockAdjustment.findUnique({ where: { adjustmentId: req.params.id } })
    if (!adj) return res.status(404).json({ success: false, error: 'Adjustment not found' })
    if (adj.status !== 'pending') return res.status(400).json({ success: false, error: 'Adjustment is not pending' })
    if (adj.raisedBy?.toString() === req.user?.user_id?.toString())
      return res.status(403).json({ success: false, error: 'Cannot approve your own adjustment. Two separate logins required.' })

    const pack = await prisma.erpPack.findUnique({
      where: { packId: adj.packId },
      select: { qtyReceived: true, status: true },
    })

    let newStatus = pack.status
    if (Number(adj.qtyAfter) === 0) newStatus = 'exhausted'
    else if (Number(adj.qtyAfter) < Number(pack.qtyReceived)) newStatus = 'partial'

    await prisma.erpPack.update({
      where: { packId: adj.packId },
      data: { qtyRemaining: adj.qtyAfter, status: newStatus },
    })
    await prisma.stockAdjustment.update({
      where: { adjustmentId: req.params.id },
      data: { status: 'approved', approvedBy: req.user?.user_id || null, approvedAt: new Date() },
    })

    await writeAudit({ ...auditUser(req), action: 'APPROVE', tableName: 'stock_adjustments', recordId: req.params.id, newValue: { approved: true, qty_applied: adj.qtyAfter } })
    return res.json({ success: true, message: 'Adjustment approved and applied' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function rejectStockAdjustment(req, res) {
  try {
    const adj = await prisma.stockAdjustment.findFirst({
      where: { adjustmentId: req.params.id, status: 'pending' },
      select: { notes: true },
    })
    if (!adj) return res.status(404).json({ success: false, error: 'Adjustment not found or not pending' })

    const newNotes = adj.notes
      ? `${adj.notes} | Rejected: ${req.body?.reason || ''}`
      : `Rejected: ${req.body?.reason || ''}`

    await prisma.stockAdjustment.update({
      where: { adjustmentId: req.params.id },
      data: {
        status: 'rejected',
        approvedBy: req.user?.user_id || null,
        approvedAt: new Date(),
        notes: newNotes,
      },
    })
    await writeAudit({ ...auditUser(req), action: 'REJECT', tableName: 'stock_adjustments', recordId: req.params.id })
    return res.json({ success: true, message: 'Adjustment rejected' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listStockAdjustments(req, res) {
  try {
    const { status, limit = 50, offset = 0 } = req.query
    // Needs raised_by_name and approved_by_name from users — keep as raw
    const data = await prisma.$queryRaw`
      SELECT sa.*, p.lot_number, p.item_code,
             u1.full_name AS raised_by_name, u2.full_name AS approved_by_name
      FROM stock_adjustments sa
      JOIN erp_packs p ON p.pack_id = sa.pack_id
      LEFT JOIN users u1 ON u1.user_id = sa.raised_by
      LEFT JOIN users u2 ON u2.user_id = sa.approved_by
      WHERE (${status || null}::text IS NULL OR sa.status = ${status || null})
      ORDER BY sa.raised_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
