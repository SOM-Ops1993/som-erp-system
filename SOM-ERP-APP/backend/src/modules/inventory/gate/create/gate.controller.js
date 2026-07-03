import prisma from '../../../../../config/db.js'

const createGateInward = async (req, res) => {
  try {
    const { supplier_name, invoice_no, vehicle_no } = req.body || {}
    if (!supplier_name?.trim())
      return res.status(400).json({ success: false, error: 'supplier_name is required', code: 'VALIDATION_ERROR' })

    const row = await prisma.gateInward.create({
      data: {
        supplierName: supplier_name.trim(),
        invoiceNo:    invoice_no?.trim()  || null,
        vehicleNo:    vehicle_no?.trim()  || null,
        status:       'pending',
        createdBy:    req.user?.user_id   || null,
      },
    })
    return res.status(201).json({ success: true, data: row })
  } catch (err) {
    console.error('createGateInward error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

const createGateOutward = async (req, res) => {
  try {
    const { receiver_name, invoice_no, vehicle_no } = req.body || {}

    const row = await prisma.gateOutward.create({
      data: {
        receiverName: receiver_name?.trim() || null,
        invoiceNo:    invoice_no?.trim()    || null,
        vehicleNo:    vehicle_no?.trim()    || null,
        status:       'pending',
        createdBy:    req.user?.user_id     || null,
      },
    })
    return res.status(201).json({ success: true, data: row })
  } catch (err) {
    console.error('createGateOutward error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export { createGateInward, createGateOutward }
