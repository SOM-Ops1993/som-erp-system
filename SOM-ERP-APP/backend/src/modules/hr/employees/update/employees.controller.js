import prisma from '../../../../db.js'

export const updateEmployee = async (req, res) => {
  try {
    const { name, email, phone, role, section, isActive } = req.body
    const emp = await prisma.employeeMaster.update({
      where: { id: req.params.id },
      data: {
        ...(name      !== undefined && { name }),
        ...(email     !== undefined && { email: email || null }),
        ...(phone     !== undefined && { phone: phone || null }),
        ...(role      !== undefined && { role }),
        ...(section   !== undefined && { section: section || null }),
        ...(isActive  !== undefined && { isActive }),
      }
    })
    return res.json({ success: true, data: emp })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
