import prisma from '../../../../db.js'

const VALID_STATUSES = ['pending', 'approved', 'rejected']

const requestDeleteGateInward = async (req, res) => {
  const {id} = req.params
  try {
    const row = await prisma.gateInward.update({
      where: { inwardId: id },
      data: { requestDelete: true },
    })
    return res.json({ success: true, data: row })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate inward not found', code: 'NOT_FOUND' })
    console.error('requestDeleteGateInward error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

const requestDeleteGateOutward = async (req, res) => {
  const {id} = req.params
  try {

    const row = await prisma.gateOutward.update({
      where: { outwardId: id },
      data: { requestDelete: true },
    })
    return res.json({ success: true, data: row })

  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate outward not found', code: 'NOT_FOUND' })
    console.error('requestDeleteGateOutward error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

const updateGateInwardStatus = async (req, res) => {
  const { status } = req.body || {}
  try {

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

const updateGateOutwardStatus = async (req, res) => {
  const { status } = req.body || {}
  const { id } = req.params
  try {

     if (!status || !VALID_STATUSES.includes(status))
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
        code: 'VALIDATION_ERROR',
      })

    const row = await prisma.gateOutward.update({
      where: { outwardId: id },
      data: { status },
    })

    return res.json({ success: true, data: row })

  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate outward not found', code: 'NOT_FOUND' })
    console.error('updateGateOutwardStatus error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}



export {
  requestDeleteGateInward,
  requestDeleteGateOutward,
  updateGateInwardStatus,
  updateGateOutwardStatus,
}