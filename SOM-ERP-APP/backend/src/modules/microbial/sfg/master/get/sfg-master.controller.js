import prisma from '../../../../../db.js'

export const listMicrobes = async (req, res) => {
  try {
    const rows = await prisma.microbeMaster.findMany({ orderBy: { microbeName: 'asc' } })
    return res.json({ success: true, data: rows })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getMicrobe = async (req, res) => {
  try {
    const row = await prisma.microbeMaster.findUnique({ where: { microbeId: req.params.id } })
    if (!row) return res.status(404).json({ success: false, error: 'Microbe not found', code: 'NOT_FOUND' })
    return res.json({ success: true, data: row })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
