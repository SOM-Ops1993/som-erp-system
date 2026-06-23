import prisma from '../../../../db.js'

const VALID_STATUSES = ['pending', 'approved', 'rejected']

// ── Request-delete (gate person marks a record for admin to delete) ───────────

export async function requestDeleteGateInward(req, res) {
  try {
    const rows = await prisma.$queryRaw`
      UPDATE gate_inward
      SET    request_delete = true, updated_at = NOW()
      WHERE  inward_id = ${req.params.id}::uuid
      RETURNING inward_id, supplier_name, request_delete, updated_at
    `
    if (!rows.length)
      return res.status(404).json({ success: false, error: 'Gate inward not found' })
    return res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('requestDeleteGateInward error:', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function requestDeleteGateOutward(req, res) {
  try {
    const rows = await prisma.$queryRaw`
      UPDATE gate_outward
      SET    request_delete = true, updated_at = NOW()
      WHERE  outward_id = ${req.params.id}::uuid
      RETURNING outward_id, receiver_name, request_delete, updated_at
    `
    if (!rows.length)
      return res.status(404).json({ success: false, error: 'Gate outward not found' })
    return res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('requestDeleteGateOutward error:', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ── Status updates ────────────────────────────────────────────────────────────

export async function updateGateInwardStatus(req, res) {
  try {
    const { status } = req.body || {}
    if (!status || !VALID_STATUSES.includes(status))
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      })

    const rows = await prisma.$queryRaw`
      UPDATE gate_inward
      SET    status = ${status}, updated_at = NOW()
      WHERE  inward_id = ${req.params.id}::uuid
      RETURNING inward_id, supplier_name, invoice_no, vehicle_no, status, created_at, updated_at
    `
    if (!rows.length)
      return res.status(404).json({ success: false, error: 'Gate inward not found' })
    return res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('updateGateInwardStatus error:', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function updateGateOutwardStatus(req, res) {
  try {
    const { status } = req.body || {}
    if (!status || !VALID_STATUSES.includes(status))
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      })

    const rows = await prisma.$queryRaw`
      UPDATE gate_outward
      SET    status = ${status}
      WHERE  outward_id = ${req.params.id}::uuid
      RETURNING outward_id, receiver_name, invoice_no, vehicle_no, status, created_at
    `
    if (!rows.length)
      return res.status(404).json({ success: false, error: 'Gate outward not found' })
    return res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('updateGateOutwardStatus error:', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
}
