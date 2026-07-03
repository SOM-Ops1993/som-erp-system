// Maps route path prefixes to the "operation" required to view them, mirroring
// the operation gating already enforced by the backend (see backend/access.js
// and backend/src/middleware/auth.js). No entry = accessible to any
// authenticated account. The 'admin' operation is super-admin and always passes.
export const OPERATION_ROUTES = [
  { prefix: '/gate',            operation: 'gate' },
  { prefix: '/erp/gate',        operation: 'gate' },

  { prefix: '/inward',          operation: 'store' },
  { prefix: '/outward',         operation: 'store' },
  { prefix: '/containers',      operation: 'store' },
  { prefix: '/ledger',          operation: 'store' },
  { prefix: '/grn',             operation: 'store' },
  { prefix: '/location-master', operation: 'store' },
  { prefix: '/indent',          operation: 'store' },
  { prefix: '/print-master',    operation: 'store' },

  { prefix: '/erp/microbial',   operation: 'production' },
  { prefix: '/microbial-inward', operation: 'production' },
  { prefix: '/planning',        operation: 'production' },
  { prefix: '/erp/planning',    operation: 'production' },
  { prefix: '/erp/bom',         operation: 'production' },
  { prefix: '/tracker',         operation: 'production' },
  { prefix: '/production',      operation: 'production' },
  { prefix: '/sfg-store',       operation: 'production' },
  { prefix: '/sfg',             operation: 'production' },

  // Sales Orders is management's — not something the inventory/store team
  // should see or edit.
  { prefix: '/sales-orders',    operation: 'admin' },

  // Dashboard, Master Data, and Data Import are admin-only — view and edit.
  { prefix: '/stock',           operation: 'admin' },
  { prefix: '/rm-material',     operation: 'admin' },
  { prefix: '/packing-master',  operation: 'admin' },
  { prefix: '/rm-master',       operation: 'admin' },
  { prefix: '/product-master',  operation: 'admin' },
  { prefix: '/equipment-master', operation: 'admin' },
  { prefix: '/employee-master', operation: 'admin' },
  { prefix: '/recipe',          operation: 'admin' },
  { prefix: '/microbes-master', operation: 'admin' },
  { prefix: '/import',          operation: 'admin' },
]

// Longest matching prefix wins, so more specific routes (e.g. /erp/microbial)
// take priority over broader ones (e.g. /erp) if both were ever present.
export function operationForPath(pathname) {
  const hit = OPERATION_ROUTES
    .filter(r => pathname === r.prefix || pathname.startsWith(r.prefix + '/'))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0]
  return hit?.operation || null
}

// Where to land a user after login / at "/", since the shared dashboard is
// now admin-only and each operation needs its own landing page instead.
export const DEFAULT_PATH_FOR_OPERATION = {
  gate: '/gate',
  store: '/inward',
  production: '/planning',
  admin: '/stock',
}
