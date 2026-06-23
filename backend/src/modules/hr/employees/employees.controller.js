import prisma from '../../../db.js'

export const ALL_PAGES = [
  { path: '/item-master',       label: 'Item Master',       group: 'Masters' },
  { path: '/product-master',    label: 'Product Master',    group: 'Masters' },
  { path: '/equipment-master',  label: 'Equipment Master',  group: 'Masters' },
  { path: '/recipe-db',         label: 'Recipe DB',         group: 'Masters' },
  { path: '/location-master',   label: 'Location Master',   group: 'Masters' },
  { path: '/employee-master',   label: 'Employee Master',   group: 'Masters' },
  { path: '/inward',            label: 'Inward',            group: 'Warehouse' },
  { path: '/outward',           label: 'Outward',           group: 'Warehouse' },
  { path: '/stock',             label: 'Stock',             group: 'Warehouse' },
  { path: '/ledger',            label: 'Ledger',            group: 'Warehouse' },
  { path: '/indent',            label: 'Indent',            group: 'Production' },
  { path: '/production',        label: 'Production',        group: 'Production' },
  { path: '/sfg',               label: 'SFG',               group: 'Production' },
  { path: '/tracker',           label: 'Tracker',           group: 'Production' },
  { path: '/sales-orders',      label: 'Sales Orders',      group: 'Sales' },
  { path: '/planning',          label: 'Planning',          group: 'Planning' },
  { path: '/grn',               label: 'GRN',               group: 'Admin' },
  { path: '/import',            label: 'Import',            group: 'Admin' },
]

export const ROLE_DEFAULTS = {
  ADMIN:      ALL_PAGES.map(p => p.path),
  SALES:      ['/sales-orders', '/tracker', '/stock'],
  PRODUCTION: ['/indent', '/production', '/sfg', '/stock', '/outward', '/planning', '/tracker'],
  QC:         ['/production', '/sfg', '/stock', '/tracker'],
  DISPATCH:   ['/sales-orders', '/stock', '/sfg', '/tracker'],
  PLANNING:   ['/sales-orders', '/indent', '/planning', '/stock', '/recipe-db', '/tracker'],
  ACCOUNTS:   ['/sales-orders', '/grn', '/tracker'],
}

export async function listEmployees(req, res) {
  try {
    const { role, section, active } = req.query
    const where = {}
    if (role)    where.role    = role
    if (section) where.section = section
    if (active !== undefined) where.isActive = active === 'true'
    const employees = await prisma.employeeMaster.findMany({ where, orderBy: [{ role: 'asc' }, { name: 'asc' }] })
    return res.json({ success: true, data: employees })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listPages(req, res) {
  return res.json({ success: true, data: ALL_PAGES })
}

export async function listRoleDefaults(req, res) {
  return res.json({ success: true, data: ROLE_DEFAULTS })
}

export async function getPermissionsByRole(req, res) {
  try {
    const perms = await prisma.rolePermission.findMany({ where: { role: req.params.role } })
    return res.json({ success: true, data: perms })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getEmployee(req, res) {
  try {
    const emp = await prisma.employeeMaster.findUnique({ where: { id: req.params.id } })
    if (!emp) return res.status(404).json({ success: false, error: 'Employee not found' })
    return res.json({ success: true, data: emp })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createEmployee(req, res) {
  try {
    const { name, email, phone, role, section } = req.body
    if (!name || !role) return res.status(400).json({ success: false, error: 'name and role required' })
    const count = await prisma.employeeMaster.count()
    const empCode = `EMP-${String(count + 1).padStart(3, '0')}`
    const emp = await prisma.employeeMaster.create({
      data: { empCode, name, email: email || null, phone: phone || null, role, section: section || null }
    })
    return res.status(201).json({ success: true, data: emp })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function updateEmployee(req, res) {
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
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function deleteEmployee(req, res) {
  try {
    await prisma.employeeMaster.update({ where: { id: req.params.id }, data: { isActive: false } })
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function savePermissions(req, res) {
  try {
    const { role, pagePaths } = req.body
    if (!role || !Array.isArray(pagePaths))
      return res.status(400).json({ success: false, error: 'role and pagePaths required' })
    await prisma.rolePermission.deleteMany({ where: { role } })
    const pageMap = Object.fromEntries(ALL_PAGES.map(p => [p.path, p.label]))
    await prisma.rolePermission.createMany({
      data: pagePaths.map(path => ({ role, pagePath: path, pageLabel: pageMap[path] || path }))
    })
    return res.json({ success: true, message: `Permissions saved for ${role}` })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function seedDefaultPermissions(req, res) {
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
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listCompanies(req, res) {
  try {
    const companies = await prisma.companyMaster.findMany({ orderBy: { code: 'asc' } })
    return res.json({ success: true, data: companies })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function upsertCompany(req, res) {
  try {
    const { code, name } = req.body
    if (!code || !name) return res.status(400).json({ success: false, error: 'code and name required' })
    const company = await prisma.companyMaster.upsert({
      where: { code },
      create: { code: code.toUpperCase(), name },
      update: { name }
    })
    return res.json({ success: true, data: company })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function deleteCompany(req, res) {
  try {
    await prisma.companyMaster.update({ where: { code: req.params.code }, data: { isActive: false } })
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
