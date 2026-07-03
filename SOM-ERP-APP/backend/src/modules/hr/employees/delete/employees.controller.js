import prisma from '../../../../db.js'

export const deleteEmployee = async (req, res) => {
  try {
    await prisma.employeeMaster.update({ where: { id: req.params.id }, data: { isActive: false } })
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const deleteCompany = async (req, res) => {
  try {
    await prisma.companyMaster.update({ where: { code: req.params.code }, data: { isActive: false } })
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
