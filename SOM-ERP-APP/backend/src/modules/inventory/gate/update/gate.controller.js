import prisma from '../../../../db.js'

const VALID_STATUSES = ['pending', 'approved', 'rejected']

export const requestDeleteGateInward = async (req, res) => {
  try {
    const row = await prisma.gateInward.update({
      where: { inwardId: req.params.id },
      data: { requestDelete: true },
    })
    return res.json({ success: true, data: row })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate inward not found', code: 'NOT_FOUND' })
    console.error('requestDeleteGateInward error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const requestDeleteGateOutward = async (req, res) => {
  try {
    const row = await prisma.gateOutward.update({
      where: { outwardId: req.params.id },
      data: { requestDelete: true },
    })
    return res.json({ success: true, data: row })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate outward not found', code: 'NOT_FOUND' })
    console.error('requestDeleteGateOutward error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const updateGateInwardStatus = async (req, res) => {
  try {
    const { status } = req.body || {}
    if (!status || !VALID_STATUSES.includes(status))
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
        code: 'VALIDATION_ERROR',
      })

    const row = await prisma.gateInward.update({
      where: { inwardId: req.params.id },
      data: { status },
    })
    return res.json({ success: true, data: row })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate inward not found', code: 'NOT_FOUND' })
    console.error('updateGateInwardStatus error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const updateGateOutwardStatus = async (req, res) => {
  try {
    const { status } = req.body || {}
    if (!status || !VALID_STATUSES.includes(status))
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
        code: 'VALIDATION_ERROR',
      })

    const row = await prisma.gateOutward.update({
      where: { outwardId: req.params.id },
      data: { status },
    })
    return res.json({ success: true, data: row })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate outward not found', code: 'NOT_FOUND' })
    console.error('updateGateOutwardStatus error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
