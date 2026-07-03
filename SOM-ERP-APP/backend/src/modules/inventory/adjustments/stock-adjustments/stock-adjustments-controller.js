import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'
import { createNotification } from '../../../../services/notification-service.js'

export const createStockAdjustment = async (req, res) => {
  const { pack_id, reason_code, qty_after, notes } = req.body || {}
  if (!pack_id || !reason_code || qty_after === undefined)
    return res.status(400).json({ success: false, error: 'pack_id, reason_code, qty_after required', code: 'VALIDATION_ERROR' })

  try {
    const rc = await prisma.reasonCode.findFirst({
      where: { category: 'stock_adjustment', code: reason_code, isActive: true },
    })
    if (!rc)
      return res.status(400).json({ success: false, error: `Invalid reason_code: ${reason_code}. Must be from predefined list.`, code: 'VALIDATION_ERROR' })

    const pack = await prisma.erpPack.findUnique({ where: { packId: pack_id } })
    if (!pack) return res.status(404).json({ success: false, error: 'Pack not found', code: 'NOT_FOUND' })
    if (!pack.qrConfirmed) return res.status(400).json({ success: false, error: 'Cannot adjust pack without QR confirmation', code: 'VALIDATION_ERROR' })

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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};

export const approveStockAdjustment = async (req, res) => {
  try {
    const adj = await prisma.stockAdjustment.findUnique({ where: { adjustmentId: req.params.id } })
    if (!adj) return res.status(404).json({ success: false, error: 'Adjustment not found', code: 'NOT_FOUND' })
    if (adj.status !== 'pending') return res.status(400).json({ success: false, error: 'Adjustment is not pending', code: 'VALIDATION_ERROR' })
    if (adj.raisedBy?.toString() === req.user?.user_id?.toString())
      return res.status(403).json({ success: false, error: 'Cannot approve your own adjustment. Two separate logins required.', code: 'FORBIDDEN' })

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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};

export const rejectStockAdjustment = async (req, res) => {
  try {
    const adj = await prisma.stockAdjustment.findFirst({
      where: { adjustmentId: req.params.id, status: 'pending' },
      select: { notes: true },
    })
    if (!adj) return res.status(404).json({ success: false, error: 'Adjustment not found or not pending', code: 'NOT_FOUND' })

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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};

export const listStockAdjustments = async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query

    const adjs = await prisma.stockAdjustment.findMany({
      where:   status ? { status } : {},
      include: { pack: { select: { lotNumber: true, itemCode: true } } },
      orderBy: { raisedAt: 'desc' },
      take:    Number(limit),
      skip:    Number(offset),
    })

    const userIds = [...new Set([...adjs.map(a => a.raisedBy), ...adjs.map(a => a.approvedBy)].filter(Boolean))]
    const users   = userIds.length
      ? await prisma.user.findMany({ where: { userId: { in: userIds } }, select: { userId: true, fullName: true } })
      : []
    const userMap = Object.fromEntries(users.map(u => [u.userId, u.fullName]))

    const data = adjs.map(a => ({
      ...a,
      lot_number:       a.pack?.lotNumber   ?? null,
      item_code:        a.pack?.itemCode    ?? null,
      raised_by_name:   userMap[a.raisedBy]   ?? null,
      approved_by_name: userMap[a.approvedBy] ?? null,
      pack: undefined,
    }))

    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};
