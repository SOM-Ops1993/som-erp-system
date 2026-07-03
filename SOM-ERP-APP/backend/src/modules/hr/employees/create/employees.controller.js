import prisma from '../../../../db.js'
import { ALL_PAGES, ROLE_DEFAULTS } from '../get/employees.controller.js'

export const createEmployee = async (req, res) => {
  try {
    const { name, email, phone, role, section } = req.body
    if (!name || !role) return res.status(400).json({ success: false, error: 'name and role required', code: 'VALIDATION_ERROR' })
    const count = await prisma.employeeMaster.count()
    const empCode = `EMP-${String(count + 1).padStart(3, '0')}`
    const emp = await prisma.employeeMaster.create({
      data: { empCode, name, email: email || null, phone: phone || null, role, section: section || null }
    })
    return res.status(201).json({ success: true, data: emp })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const savePermissions = async (req, res) => {
  try {
    const { role, pagePaths } = req.body
    if (!role || !Array.isArray(pagePaths))
      return res.status(400).json({ success: false, error: 'role and pagePaths required', code: 'VALIDATION_ERROR' })
    await prisma.rolePermission.deleteMany({ where: { role } })
    const pageMap = Object.fromEntries(ALL_PAGES.map(p => [p.path, p.label]))
    await prisma.rolePermission.createMany({
      data: pagePaths.map(path => ({ role, pagePath: path, pageLabel: pageMap[path] || path }))
    })
    return res.json({ success: true, message: `Permissions saved for ${role}` })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const seedDefaultPermissions = async (req, res) => {
  try {
    const pageMap = Object.fromEntries(ALL_PAGES.map(p => [p.path, p.label]))
    let total = 0
    for (const [role, paths] of Object.entries(ROLE_DEFAULTS)) {
      await prisma.rolePermission.deleteMany({ where: { role } })
      await prisma.rolePermission.createMany({
        data: paths.map(path => ({ role, pagePath: path, pageLabel: pageMap[path] || path }))
      })
      total += paths.length
    }
    return res.json({ success: true, message: `Seeded ${total} permission rows` })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const upsertCompany = async (req, res) => {
  try {
    const { code, name } = req.body
    if (!code || !name) return res.status(400).json({ success: false, error: 'code and name required', code: 'VALIDATION_ERROR' })
    const company = await prisma.companyMaster.upsert({
      where: { code },
      create: { code: code.toUpperCase(), name },
      update: { name }
    })
    return res.json({ success: true, data: company })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
