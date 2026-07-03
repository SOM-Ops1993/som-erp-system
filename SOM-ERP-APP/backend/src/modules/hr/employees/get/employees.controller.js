import prisma from '../../../../db.js'

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

export const listEmployees = async (req, res) => {
  try {
    const { role, section, active } = req.query
    const where = {}
    if (role)    where.role    = role
    if (section) where.section = section
    if (active !== undefined) where.isActive = active === 'true'
    const employees = await prisma.employeeMaster.findMany({ where, orderBy: [{ role: 'asc' }, { name: 'asc' }] })
    return res.json({ success: true, data: employees })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const listPages = async (req, res) => {
  return res.json({ success: true, data: ALL_PAGES })
}

export const listRoleDefaults = async (req, res) => {
  return res.json({ success: true, data: ROLE_DEFAULTS })
}

export const getPermissionsByRole = async (req, res) => {
  try {
    const perms = await prisma.rolePermission.findMany({ where: { role: req.params.role } })
    return res.json({ success: true, data: perms })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getEmployee = async (req, res) => {
  try {
    const emp = await prisma.employeeMaster.findUnique({ where: { id: req.params.id } })
    if (!emp) return res.status(404).json({ success: false, error: 'Employee not found', code: 'NOT_FOUND' })
    return res.json({ success: true, data: emp })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const listCompanies = async (req, res) => {
  try {
    const companies = await prisma.companyMaster.findMany({ orderBy: { code: 'asc' } })
    return res.json({ success: true, data: companies })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
