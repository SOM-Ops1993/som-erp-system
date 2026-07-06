import prisma from '../../../../db.js'



// Gate Inward delete controller
const deleteGateInward = async (req, res) => {
  const { id } = req.params

  try {

    await prisma.gateInward.delete({ where: { inwardId: id } })
    return res.json({ success: true, message: 'Gate inward deleted' })

  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate inward not found', code: 'NOT_FOUND' })
    console.error('deleteGateInward error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }

}

// ----------------   Gate Outward deletion

const deleteGateOutward = async (req, res) => {
  const { id } = req.params

  try {
    await prisma.gateOutward.delete({ where: { outwardId: id } })
    return res.json({ success: true, message: 'Gate outward deleted' })

  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate outward not found', code: 'NOT_FOUND' })
    console.error('deleteGateOutward error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}


export { deleteGateInward, deleteGateOutward }
