import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'

export const checkFifo = async (req, res) => {
  const { item_code, selected_pack_id } = req.body || {}
  if (!item_code || !selected_pack_id)
    return res.status(400).json({ success: false, error: 'item_code and selected_pack_id required', code: 'VALIDATION_ERROR' })

  try {
    const oldest = await prisma.erpPack.findFirst({
      where: {
        itemCode: item_code,
        qrConfirmed: true,
        status: { in: ['active', 'partial'] },
        qtyRemaining: { gt: 0 },
      },
      select: { packId: true, lotNumber: true, qtyRemaining: true, inwardDate: true },
      orderBy: [{ inwardDate: 'asc' }, { createdAt: 'asc' }],
    })

    if (!oldest) return res.json({ success: true, fifo_ok: true })
    if (oldest.packId.toString() === selected_pack_id.toString())
      return res.json({ success: true, fifo_ok: true })

    return res.json({
      success: true,
      fifo_ok: false,
      oldest_lot: oldest.lotNumber,
      oldest_qty: oldest.qtyRemaining,
      oldest_inward_date: oldest.inwardDate,
      oldest_pack_id: oldest.packId,
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};

export const createFifoOverride = async (req, res) => {
  const { job_id, item_code, older_lot, older_qty, selected_lot, reason } = req.body || {}
  if (!reason) return res.status(400).json({ success: false, error: 'reason is mandatory for FIFO override', code: 'VALIDATION_ERROR' })

  try {
    const row = await prisma.fifoOverrideLog.create({
      data: {
        jobId: job_id || null,
        itemCode: item_code || null,
        olderLot: older_lot || null,
        olderQty: older_qty || null,
        selectedLot: selected_lot || null,
        overrideBy: req.user?.user_id || null,
        reason,
      },
    })
    await writeAudit({
      ...auditUser(req),
      action: 'FIFO_OVERRIDE',
      tableName: 'fifo_override_log',
      recordId: row.id,
      newValue: req.body,
    })
    return res.status(201).json({ success: true, data: row, message: 'FIFO override logged. You may proceed with selected lot.' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};
