import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'
import { createNotification } from '../../../../services/notification-service.js'

export async function createWarehouseTransfer(req, res) {
  const { pack_id, transfer_type, from_location, to_location, from_plant_id, to_plant_id, notes } = req.body || {}
  if (!pack_id || !transfer_type)
    return res.status(400).json({ success: false, error: 'pack_id and transfer_type required' })

  try {
    const pack = await prisma.erpPack.findUnique({ where: { packId: pack_id } })
    if (!pack) return res.status(404).json({ success: false, error: 'Pack not found' })
    if (!pack.qrConfirmed) return res.status(400).json({ success: false, error: 'Pack must be QR-confirmed before transfer' })

    if (transfer_type === 'intra_plant') {
      await prisma.erpPack.update({ where: { packId: pack_id }, data: { location: to_location } })
      const transfer = await prisma.warehouseTransfer.create({
        data: {
          packId: pack_id,
          transferType: transfer_type,
          fromLocation: from_location || pack.location,
          toLocation: to_location,
          fromPlantId: from_plant_id || null,
          toPlantId: to_plant_id || null,
          initiatedBy: req.user?.user_id || null,
          status: 'completed',
          notes: notes || null,
        },
      })
      await writeAudit({ ...auditUser(req), action: 'TRANSFER', tableName: 'warehouse_transfers', recordId: transfer.transferId, newValue: req.body })
      return res.status(201).json({ success: true, data: transfer, message: 'Intra-plant transfer completed' })
    }

    const transfer = await prisma.warehouseTransfer.create({
      data: {
        packId: pack_id,
        transferType: transfer_type,
        fromLocation: from_location || pack.location,
        toLocation: to_location || null,
        fromPlantId: from_plant_id || null,
        toPlantId: to_plant_id || null,
        initiatedBy: req.user?.user_id || null,
        status: 'pending',
        notes: notes || null,
      },
    })
    await prisma.erpPack.update({ where: { packId: pack_id }, data: { status: 'in_transit' } })

    await createNotification({
      type: 'transfer_pending',
      title: 'Inter-plant Transfer Pending Receipt',
      message: `Pack ${pack.lotNumber} (${pack.itemCode}) transferred from ${from_location || 'current location'} to ${to_location || 'new plant'}. Please scan and accept at receiving end.`,
      targetRole: 'store_person',
      refType: 'warehouse_transfer',
      refId: transfer.transferId,
    })

    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'warehouse_transfers', recordId: transfer.transferId, newValue: req.body })
    return res.status(201).json({ success: true, data: transfer, message: 'Inter-plant transfer initiated. Pending receipt at destination.' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function receiveWarehouseTransfer(req, res) {
  try {
    const { to_location } = req.body || {}
    const transfer = await prisma.warehouseTransfer.findUnique({ where: { transferId: req.params.id } })
    if (!transfer) return res.status(404).json({ success: false, error: 'Transfer not found' })
    if (transfer.status !== 'pending') return res.status(400).json({ success: false, error: 'Transfer is not pending' })

    await prisma.erpPack.update({
      where: { packId: transfer.packId },
      data: { location: to_location || transfer.toLocation, status: 'active' },
    })
    await prisma.warehouseTransfer.update({
      where: { transferId: req.params.id },
      data: {
        status: 'completed',
        receivedBy: req.user?.user_id || null,
        receivedAt: new Date(),
        toLocation: to_location || transfer.toLocation,
      },
    })
    await writeAudit({ ...auditUser(req), action: 'RECEIVE', tableName: 'warehouse_transfers', recordId: req.params.id })
    return res.json({ success: true, message: 'Transfer received and pack is now active at new location' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listWarehouseTransfers(req, res) {
  try {
    const { status, limit = 50, offset = 0 } = req.query
    // Needs initiated_by_name from users — keep as raw
    const data = await prisma.$queryRaw`
      SELECT wt.*, p.lot_number, p.item_code, u.full_name AS initiated_by_name
      FROM warehouse_transfers wt
      JOIN erp_packs p ON p.pack_id = wt.pack_id
      LEFT JOIN users u ON u.user_id = wt.initiated_by
      WHERE (${status || null}::text IS NULL OR wt.status = ${status || null})
      ORDER BY wt.initiated_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
