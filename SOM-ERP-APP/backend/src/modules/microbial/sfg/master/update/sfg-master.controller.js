import prisma from '../../../../../db.js'

export const updateMicrobe = async (req, res) => {
  try {
    const { microbe_name, microbe_code } = req.body || {}
    const data = {}
    if (microbe_name) data.microbeName = microbe_name
    if (microbe_code) data.microbeCode = microbe_code.toUpperCase()

    const row = await prisma.microbeMaster.update({
      where: { microbeId: req.params.id },
      data,
    })
    return res.json({ success: true, data: row })
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ success: false, error: 'Microbe not found', code: 'NOT_FOUND' })
    return res.status(500).json({ success: false, error: e.message, code: 'INTERNAL_ERROR' })
  }
}
