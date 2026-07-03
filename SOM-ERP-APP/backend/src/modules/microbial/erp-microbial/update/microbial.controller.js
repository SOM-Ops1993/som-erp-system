import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'

export const patchContainer = async (req, res) => {
  try {
    const { location_room, location_position, storage_temp_c, status, notes } = req.body || {}

    const data = {}
    if (location_room !== undefined)    data.locationRoom     = location_room
    if (location_position !== undefined) data.locationPosition = location_position
    if (storage_temp_c !== undefined)   data.storageTempC     = storage_temp_c
    if (status !== undefined)           data.status           = status
    if (notes !== undefined)            data.notes            = notes

    await prisma.microbialContainer.update({
      where: { containerId: req.params.id },
      data,
    })

    await writeAudit({ ...auditUser(req), action: 'UPDATE', tableName: 'microbial_containers', recordId: req.params.id, newValue: req.body })
    return res.json({ success: true, message: 'Container updated' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};

export const confirmReceipt = async (req, res) => {
  try {
    const { actual_cfu_on_receipt, receipt_notes } = req.body || {}

    await prisma.microbialTransaction.update({
      where: { id: req.params.id },
      data: {
        receiptConfirmed: true,
        receiptConfirmedAt: new Date(),
        actualCfuOnReceipt: actual_cfu_on_receipt || null,
        receiptNotes: receipt_notes || null,
      },
    })

    await writeAudit({ ...auditUser(req), action: 'CONFIRM_RECEIPT', tableName: 'microbial_transactions', recordId: req.params.id })
    return res.json({ success: true, message: 'Receipt confirmed' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};
