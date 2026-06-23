import prisma from '../../../../db.js'

// Build a parameterized WHERE clause from filter keys.
// Returns { where: string, params: any[] } — caller appends LIMIT/OFFSET params.
function buildInwardWhere({ search, status, from_date, to_date, invoice_no }) {
  const conds = []
  const params = []

  if (search?.trim()) {
    params.push(`%${search.trim()}%`)
    conds.push(`supplier_name ILIKE $${params.length}`)
  }
  if (invoice_no?.trim()) {
    params.push(`%${invoice_no.trim()}%`)
    conds.push(`invoice_no ILIKE $${params.length}`)
  }
  if (status?.trim()) {
    params.push(status.trim())
    conds.push(`status = $${params.length}`)
  }
  if (from_date?.trim()) {
    params.push(from_date.trim())
    conds.push(`created_at::date >= $${params.length}::date`)
  }
  if (to_date?.trim()) {
    params.push(to_date.trim())
    conds.push(`created_at::date <= $${params.length}::date`)
  }

  return { where: conds.length ? `WHERE ${conds.join(' AND ')}` : '', params }
}

function buildOutwardWhere({ search, status, from_date, to_date, invoice_no }) {
  const conds = []
  const params = []

  if (search?.trim()) {
    params.push(`%${search.trim()}%`)
    conds.push(`receiver_name ILIKE $${params.length}`)
  }
  if (invoice_no?.trim()) {
    params.push(`%${invoice_no.trim()}%`)
    conds.push(`invoice_no ILIKE $${params.length}`)
  }
  if (status?.trim()) {
    params.push(status.trim())
    conds.push(`status = $${params.length}`)
  }
  if (from_date?.trim()) {
    params.push(from_date.trim())
    conds.push(`created_at::date >= $${params.length}::date`)
  }
  if (to_date?.trim()) {
    params.push(to_date.trim())
    conds.push(`created_at::date <= $${params.length}::date`)
  }

  return { where: conds.length ? `WHERE ${conds.join(' AND ')}` : '', params }
}

export async function listGateInward(req, res) {
  try {
    const { search, status, from_date, to_date, invoice_no, limit = '50', offset = '0' } = req.query
    const lim = Math.min(Number(limit) || 50, 200)
    const off = Number(offset) || 0

    const { where, params } = buildInwardWhere({ search, status, from_date, to_date, invoice_no })

    const rows = await prisma.$queryRawUnsafe(
      `SELECT inward_id, supplier_name, invoice_no, vehicle_no, status, request_delete, created_at, updated_at
       FROM gate_inward
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      ...params, lim, off
    )

    const countResult = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) AS cnt FROM gate_inward ${where}`,
      ...params
    )

    return res.json({ success: true, data: rows, total: Number(countResult[0].cnt) })
  } catch (err) {
    console.error('listGateInward error:', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getGateInward(req, res) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT inward_id, supplier_name, invoice_no, vehicle_no, status, created_by, created_at, updated_at
      FROM gate_inward
      WHERE inward_id = ${req.params.id}::uuid
    `
    if (!rows.length)
      return res.status(404).json({ success: false, error: 'Gate inward not found' })
    return res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('getGateInward error:', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listGateOutward(req, res) {
  try {
    const { search, status, from_date, to_date, invoice_no, limit = '50', offset = '0' } = req.query
    const lim = Math.min(Number(limit) || 50, 200)
    const off = Number(offset) || 0

    const { where, params } = buildOutwardWhere({ search, status, from_date, to_date, invoice_no })

    const rows = await prisma.$queryRawUnsafe(
      `SELECT outward_id, receiver_name, invoice_no, vehicle_no, status, request_delete, created_at
       FROM gate_outward
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      ...params, lim, off
    )

    const countResult = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) AS cnt FROM gate_outward ${where}`,
      ...params
    )

    return res.json({ success: true, data: rows, total: Number(countResult[0].cnt) })
  } catch (err) {
    console.error('listGateOutward error:', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getGateOutward(req, res) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT outward_id, receiver_name, invoice_no, vehicle_no, status, created_by, created_at
      FROM gate_outward
      WHERE outward_id = ${req.params.id}::uuid
    `
    if (!rows.length)
      return res.status(404).json({ success: false, error: 'Gate outward not found' })
    return res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('getGateOutward error:', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
}
