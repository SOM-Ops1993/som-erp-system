import prisma from '../../../../db.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const userUuid = (req) => UUID_RE.test(req.user?.user_id ?? '') ? req.user.user_id : null

export async function createGateInward(req, res) {
  try {
    const { supplier_name, invoice_no, vehicle_no } = req.body || {}
    if (!supplier_name?.trim())
      return res.status(400).json({ success: false, error: 'supplier_name is required' })

    const createdBy = userUuid(req)

    const rows = await prisma.$queryRaw`
      INSERT INTO gate_inward (supplier_name, invoice_no, vehicle_no, status, created_by)
      VALUES (
        ${supplier_name.trim()},
        ${invoice_no?.trim()  || null},
        ${vehicle_no?.trim()  || null},
        'pending',
        ${createdBy}::uuid
      )
      RETURNING
        inward_id,
        supplier_name,
        invoice_no,
        vehicle_no,
        status,
        created_by,
        created_at,
        updated_at
    `
    return res.status(201).json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('createGateInward error:', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createGateOutward(req, res) {
  try {
    const { receiver_name, invoice_no, vehicle_no } = req.body || {}

    const createdBy = userUuid(req)

    const rows = await prisma.$queryRaw`
      INSERT INTO gate_outward (receiver_name, invoice_no, vehicle_no, status, created_by)
      VALUES (
        ${receiver_name?.trim() || null},
        ${invoice_no?.trim()    || null},
        ${vehicle_no?.trim()    || null},
        'pending',
        ${createdBy}::uuid
      )
      RETURNING
        outward_id,
        receiver_name,
        invoice_no,
        vehicle_no,
        status,
        created_by,
        created_at
    `
    return res.status(201).json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('createGateOutward error:', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
}
