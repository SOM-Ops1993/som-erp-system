// ─────────────────────────────────────────────────────────────────────────────
// TEMPORARY credential store — flat-file accounts, no database, no schema.
//
// This replaces the old Prisma `User`-table login system for now. Each account
// belongs to one "operation" and has a role of 'admin' (full access — create,
// read, update, delete, approve) or 'employee' (read-only). Production accounts
// additionally carry a `plant` tag (Microbial / Nano / Botanical / Liquid /
// Powder / Granules) for future per-plant filtering — route-level access today
// is gated by `operation` only, not by individual plant.
//
// Swap this file (and middleware/auth.js's use of it) for a real user/role
// table + hashed passwords when a proper auth system replaces this one.
// ─────────────────────────────────────────────────────────────────────────────

export const OPERATIONS = ['gate', 'store', 'production', 'admin']
export const PRODUCTION_PLANTS = ['Microbial', 'Nano', 'Botanical', 'Liquid', 'Powder', 'Granules']

function account(email, password, operation, role, plant = null) {
  return { email, password, operation, role, plant, fullName: email.split('@')[0] }
}

export const accounts = [
  // ── Gate ──
  account('gate@agrilife.com', 'gate123', 'gate', 'admin'),
  account('gateemployee@agrilife.com', 'gateemployee123', 'gate', 'employee'),

  // ── Store ──
  account('store@agrilife.com', 'store123', 'store', 'admin'),
  account('storeemployee@agrilife.com', 'storeemployee123', 'store', 'employee'),

  // ── Admin (super-admin — full access to every operation) ──
  account('admin@agrilife.com', 'admin123', 'admin', 'admin'),
  account('adminemployee@agrilife.com', 'adminemployee123', 'admin', 'employee'),

  // ── Production — six plants, each its own operation-scoped account pair ──
  account('microbial@agrilife.com', 'microbial123', 'production', 'admin', 'Microbial'),
  account('microbialemployee@agrilife.com', 'microbialemployee123', 'production', 'employee', 'Microbial'),
  account('nano@agrilife.com', 'nano123', 'production', 'admin', 'Nano'),
  account('nanoemployee@agrilife.com', 'nanoemployee123', 'production', 'employee', 'Nano'),
  account('botanical@agrilife.com', 'botanical123', 'production', 'admin', 'Botanical'),
  account('botanicalemployee@agrilife.com', 'botanicalemployee123', 'production', 'employee', 'Botanical'),
  account('liquid@agrilife.com', 'liquid123', 'production', 'admin', 'Liquid'),
  account('liquidemployee@agrilife.com', 'liquidemployee123', 'production', 'employee', 'Liquid'),
  account('powder@agrilife.com', 'powder123', 'production', 'admin', 'Powder'),
  account('powderemployee@agrilife.com', 'powderemployee123', 'production', 'employee', 'Powder'),
  account('granules@agrilife.com', 'granules123', 'production', 'admin', 'Granules'),
  account('granulesemployee@agrilife.com', 'granulesemployee123', 'production', 'employee', 'Granules'),
]

export function findAccount(email) {
  const needle = String(email || '').trim().toLowerCase()
  return accounts.find(a => a.email.toLowerCase() === needle)
}
