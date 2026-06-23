import prisma from '../../../../db.js'

export async function deleteGateInward(req, res) {
  try {
    const rows = await prisma.$queryRaw`
      DELETE FROM gate_inward
      WHERE inward_id = ${req.params.id}::uuid
      RETURNING inward_id
    `
    if (!rows.length)
      return res.status(404).json({ success: false, error: 'Gate inward not found' })
    return res.json({ success: true, message: 'Gate inward deleted' })
  } catch (err) {
    console.error('deleteGateInward error:', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function deleteGateOutward(req, res) {
  try {
    const rows = await prisma.$queryRaw`
      DELETE FROM gate_outward
      WHERE outward_id = ${req.params.id}::uuid
      RETURNING outward_id
    `
    if (!rows.length)
      return res.status(404).json({ success: false, error: 'Gate outward not found' })
    return res.json({ success: true, message: 'Gate outward deleted' })
  } catch (err) {
    console.error('deleteGateOutward error:', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
}
