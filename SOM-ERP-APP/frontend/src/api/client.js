import axios from 'axios'

const BASE = ''

const api = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 30000,
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Network error'
    return Promise.reject(new Error(message))
  }
)

export const rmApi = {
  list: (params) => api.get('/rm', { params }),
  get: (code) => api.get(`/rm/${code}`),
  create: (data) => api.post('/rm', data),
  update: (code, data) => api.put(`/rm/${code}`, data),
  delete: (code) => api.delete(`/rm/${code}`),
  warehouses: () => api.get('/rm/meta/warehouses'),
}

export const productApi = {
  list: (params) => api.get('/products', { params }),
  get: (code) => api.get(`/products/${encodeURIComponent(code)}`),
  create: (data) => api.post('/products', data),
  update: (code, data) => api.put(`/products/${encodeURIComponent(code)}`, data),
  delete: (code) => api.delete(`/products/${encodeURIComponent(code)}`),
}

export const equipmentApi = {
  list: () => api.get('/equipment'),
  create: (data) => api.post('/equipment', data),
  update: (id, data) => api.put(`/equipment/${id}`, data),
  delete: (id) => api.delete(`/equipment/${id}`),
}

export const packsApi = {
  generate: (data) => api.post('/packs/generate', data),
  list: (params) => api.get('/packs', { params }),
  get: (packId) => api.get(`/packs/${encodeURIComponent(packId)}`),
  nextLot: (itemCode) => api.get(`/packs/next-lot/${itemCode}`),
  pendingInward: () => api.get('/packs/pending/inward'),
  labelUrl: (packId) => `https://som-erp-backend.onrender.com/api/packs/label/${encodeURIComponent(packId)}`,
batchLabelsUrl: (itemCode, lotNo) => `https://som-erp-backend.onrender.com/api/packs/labels/lot/${itemCode}/${encodeURIComponent(lotNo)}`,
}

export const inwardApi = {
  createSession: (data) => api.post('/inward/session/create', data),
  scan: (sessionId, packId) => api.post(`/inward/session/${sessionId}/scan`, { packId }),
  removeScan: (sessionId, packId) => api.delete(`/inward/session/${sessionId}/scan/${encodeURIComponent(packId)}`),
  getSession: (sessionId) => api.get(`/inward/session/${sessionId}`),
  submit: (sessionId, transactedBy) => api.post(`/inward/session/${sessionId}/submit`, { transactedBy }),
  activeSessions: () => api.get('/inward/sessions/active'),
  history: (params) => api.get('/inward', { params }),
}

export const outwardApi = {
  bomScan: (data) => api.post('/outward/bom/scan', data),
  bomManual: (data) => api.post('/outward/bom/manual', data),
  availablePacks: (rmCode) => api.get(`/outward/available-packs/${encodeURIComponent(rmCode)}`),
  packReduction: (data) => api.post('/outward/pack-reduction', data),
  stockAdjustment: (data) => api.post('/outward/stock-adjustment', data),
  history: (params) => api.get('/outward', { params }),
}

export const productionApi = {
  list: (params) => api.get('/production', { params }),
  get: (id) => api.get(`/production/${id}`),
  create: (data) => api.post('/production', data),
  patch: (id, data) => api.patch(`/production/${id}`, data),
  saveBiomass: (id, rows) => api.put(`/production/${id}/biomass`, { rows }),
  saveTechnical: (id, data) => api.put(`/production/${id}/technical`, data),
  addCycle: (id, data) => api.post(`/production/${id}/formulation`, data),
  updateCycle: (id, cycleId, data) => api.put(`/production/${id}/formulation/${cycleId}`, data),
  deleteCycle: (id, cycleId) => api.delete(`/production/${id}/formulation/${cycleId}`),
  saveUnloading: (id, data) => api.put(`/production/${id}/unloading`, data),
  saveSieving: (id, data) => api.put(`/production/${id}/sieving`, data),
  savePacking: (id, data) => api.put(`/production/${id}/packing`, data),
  saveQC: (id, data) => api.put(`/production/${id}/qc`, data),
  saveInventory: (id, data) => api.put(`/production/${id}/inventory`, data),
}

export const indentApi = {
  create: (data) => api.post('/indent', data),
  list: (params) => api.get('/indent', { params }),
  get: (id) => api.get(`/indent/${id}`),
  products: () => api.get('/indent/products/list'),
  stockCheck: (productCode, batchSize) =>
    api.get('/indent/stock-check', { params: { productCode, batchSize } }),
  nextBatchNo: (productCode) =>
    api.get('/indent/next-batch-no', { params: { productCode } }),
  sfgAvailable: (productCode) =>
    api.get('/indent/sfg-available', { params: { productCode } }),
  purchaseSummary: (params) => api.get('/indent/purchase-summary', { params }),
  markPoSent: (indentIds) => api.post('/indent/mark-po-sent', { indentIds }),
}

export const sfgApi = {
  list: (params) => api.get('/sfg', { params }),
  listAll: (params) => api.get('/sfg', { params: { ...params, showAll: 'true' } }),
  get: (sfgId) => api.get(`/sfg/${sfgId}`),
  summary: () => api.get('/sfg/summary'),
  update: (sfgId, data) => api.put(`/sfg/${sfgId}`, data),
}

export const recipeApi = {
  list: (params) => api.get('/recipe', { params }),
  products: () => api.get('/recipe/products'),
  bulkSave: (rows) => api.post('/recipe/bulk-save', { rows }),
  deleteRow: (id) => api.delete(`/recipe/${id}`),
  deleteProduct: (code) => api.delete(`/recipe/product/${code}`),
  checkRmMapping: () => api.get('/recipe/check-rm-mapping'),
  fixRmMapping: (mappings) => api.post('/recipe/fix-rm-mapping', { mappings }),
}

export const stockApi = {
  summary: (params) => api.get('/stock', { params }),
  item: (itemCode) => api.get(`/stock/${itemCode}`),
  containers: () => api.get('/stock/containers/all'),
}

export const ledgerApi = {
  all: (params) => api.get('/ledger', { params }),
  item: (itemCode, params) => api.get(`/ledger/${itemCode}`, { params }),
  entryDetail: (id) => api.get(`/ledger/entry/${id}`),
}

export const importApi = {
  preview: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/import/preview', form, { timeout: 60000 })
  },
  execute: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/import/execute', form, { timeout: 300000 })
  },
}

export const trackerApi = {
  searchDiNo: (diNo) => api.get('/tracker', { params: { diNo } }),
  getDetail: (indentId) => api.get('/tracker/detail', { params: { indentId } }),
}

export const grnApi = {
  list: () => api.get('/grn'),
  detail: (invoiceNo, supplier) => api.get('/grn/detail', { params: { invoiceNo, supplier } }),
}

export const bulkApi = {
  // Location master
  listLocations:    (params) => api.get('/bulk', { params }),
  getLocation:      (locationId) => api.get(`/bulk/${encodeURIComponent(locationId)}`),
  createLocation:   (data) => api.post('/bulk', data),
  deleteLocation:   (locationId) => api.delete(`/bulk/${encodeURIComponent(locationId)}`),
  locationLabelUrl: (locationId) => `https://som-erp-backend.onrender.com/api/bulk/${encodeURIComponent(locationId)}/label`,
  // Bulk inward
  bulkInward:       (data) => api.post('/bulk/inward', data),
  // Bulk outward
  bulkOutward:      (data) => api.post('/bulk/outward', data),
  // Stock summary
  stockSummary:     () => api.get('/bulk/stock/summary'),
}

// ── Microbial SFG API ─────────────────────────────────────────────────────────
export const microbialSfgApi = {
  // Microbe master
  listMicrobes:       ()       => api.get('/microbial-sfg/masters/microbes'),
  createMicrobe:      (data)   => api.post('/microbial-sfg/masters/microbes', data),
  updateMicrobe:      (id, d)  => api.put(`/microbial-sfg/masters/microbes/${id}`, d),
  deleteMicrobe:      (id)     => api.delete(`/microbial-sfg/masters/microbes/${id}`),
  importMicrobes:     (rows)   => api.post('/microbial-sfg/masters/microbes/import', { rows }),

  // Containers
  listContainers:     (params) => api.get('/microbial-sfg/inward/containers', { params }),
  availableContainers:(params) => api.get('/microbial-sfg/inward/containers/available', { params }),
  nextContainerCode:  (params) => api.get('/microbial-sfg/inward/containers/next-code', { params }),
  containerBatches:   (id)     => api.get(`/microbial-sfg/inward/containers/${id}/batches`),

  // Inward
  listInward:         (params) => api.get('/microbial-sfg/inward', { params }),
  createInward:       (data)   => api.post('/microbial-sfg/inward', data),
  updateInward:       (id, d)  => api.put(`/microbial-sfg/inward/${id}`, d),
  importInward:       (rows)   => api.post('/microbial-sfg/inward/import', { rows }),
  inwardSummary:      ()       => api.get('/microbial-sfg/inward/summary'),

  // Planning integration
  checkPlanMicrobes:  (planId, mf) =>
    api.get(`/microbial-sfg/planning/check/${planId}`, { params: { multiplication_factor: mf } }),
  allocate:           (data)   => api.post('/microbial-sfg/planning/allocate', data),
  listAllocations:    (planId) => api.get(`/microbial-sfg/planning/allocations/${planId}`),
  cancelAllocation:   (id)     => api.delete(`/microbial-sfg/planning/allocations/${id}`),
}

export const employeeApi = {
  list:             (params) => api.get('/erp/employees', { params }),
  get:              (id) => api.get(`/erp/employees/${id}`),
  create:           (data) => api.post('/erp/employees', data),
  update:           (id, data) => api.put(`/erp/employees/${id}`, data),
  remove:           (id) => api.delete(`/erp/employees/${id}`),
  listPages:        () => api.get('/erp/employees/pages'),
  roleDefaults:     () => api.get('/erp/employees/role-defaults'),
  getPermissions:   (role) => api.get(`/erp/employees/permissions/${role}`),
  savePermissions:  (role, pagePaths) => api.post('/erp/employees/permissions/save', { role, pagePaths }),
  seedDefaults:     () => api.post('/erp/employees/permissions/seed-defaults'),
  listCompanies:    () => api.get('/erp/employees/companies/list'),
  addCompany:       (data) => api.post('/erp/employees/companies', data),
}

export const salesOrderApi = {
  list:          (params) => api.get('/erp/sales-orders', { params }),
  get:           (id) => api.get(`/erp/sales-orders/${id}`),
  create:        (data) => api.post('/erp/sales-orders', data),
  update:        (id, data) => api.put(`/erp/sales-orders/${id}`, data),
  patchDispatch: (id, data) => api.patch(`/erp/sales-orders/dispatch/${id}`, data),
  remove:        (id) => api.delete(`/erp/sales-orders/${id}`),
  updateItem:    (itemId, data) => api.patch(`/erp/sales-orders/item/${itemId}`, data),
  removeItem:    (itemId) => api.delete(`/erp/sales-orders/item/${itemId}`),
  companies:     () => api.get('/erp/sales-orders/companies'),
  addCompany:    (code, name) => api.post('/erp/sales-orders/companies', { code, name }),
  dashboard:     () => api.get('/erp/sales-orders/summary/dashboard'),
  syncLog:       () => api.get('/erp/sales-orders/sync-log'),
  sheetImport:   (rows, trigger = 'MANUAL') => api.post('/erp/sales-orders/sheet-import', {
    secret: import.meta.env.VITE_SHEET_WEBHOOK_SECRET || 'som-sheet-sync-2024',
    trigger,
    rows,
  }),
}

export const planningApi = {
  run:           () => api.post('/erp/plan-engine/run'),
  listPlans:     (params) => api.get('/erp/plan-engine/plans', { params }),
  getPlan:       (id) => api.get(`/erp/plan-engine/plans/${id}`),
  updatePlan:    (id, data) => api.patch(`/erp/plan-engine/plans/${id}`, data),
  cancelPlan:    (id) => api.delete(`/erp/plan-engine/plans/${id}`),
  dashboard:     () => api.get('/erp/plan-engine/dashboard'),
  pendingOrders: () => api.get('/erp/plan-engine/pending-orders'),
  logs:          () => api.get('/erp/plan-engine/logs'),
}

export const customerProfileApi = {
  list:     ()         => api.get('/customer-profiles'),
  get:      (id)       => api.get(`/customer-profiles/${id}`),
  create:   (data)     => api.post('/customer-profiles', data),
  update:   (id, data) => api.put(`/customer-profiles/${id}`, data),
  remove:   (id)       => api.delete(`/customer-profiles/${id}`),
  upsert:   (data)     => api.post('/customer-profiles/upsert', data),
  seed:     (profiles) => api.post('/customer-profiles/seed', { profiles }),
}

export const cpProfileApi = {
  forCustomer:  (customer) => api.get('/cp-profiles', { params: { customer } }),
  create:       (data)     => api.post('/cp-profiles', data),
  update:       (id, data) => api.put(`/cp-profiles/${id}`, data),
  remove:       (id)       => api.delete(`/cp-profiles/${id}`),
  upsertMany:   (customerName, items) => api.post('/cp-profiles/upsert-many', { customerName, items }),
}

export const configurableOptionsApi = {
  list:   (category) => api.get('/config-options', { params: category ? { category } : {} }),
  create: (data)     => api.post('/config-options', data),
  update: (id, data) => api.put(`/config-options/${id}`, data),
  remove: (id)       => api.delete(`/config-options/${id}`),
}

export const bomSendApi = {
  list:             (params)   => api.get('/bom-sends', { params }),
  get:              (id)       => api.get(`/bom-sends/${id}`),
  create:           (data)     => api.post('/bom-sends', data),
  issuePack:        (id, data) => api.post(`/bom-sends/${id}/issue-pack`, data),
  updateStatus:     (id, status, remarks) => api.patch(`/bom-sends/${id}/status`, { status, remarks }),
  issueToSection:   (id, data) => api.post(`/bom-sends/${id}/issue-to-section`, data),
  acknowledge:      (id, data) => api.post(`/bom-sends/${id}/acknowledge`, data),
  remove:           (id)       => api.delete(`/bom-sends/${id}`),
}

export const bmrApi = {
  // BMR records
  list:               (params)          => api.get('/bmr', { params }),
  get:                (id)              => api.get(`/bmr/${id}`),
  create:             (data)            => api.post('/bmr', data),

  // Section saves
  saveSectionA:       (id, data)        => api.put(`/bmr/${id}/section-a`, data),
  saveSectionB:       (id, data)        => api.put(`/bmr/${id}/section-b`, data),
  saveSectionC:       (id, data)        => api.put(`/bmr/${id}/section-c`, data),
  tickChecklist:      (id, itemId, data)=> api.patch(`/bmr/${id}/section-c/checklist/${itemId}`, data),
  saveSectionD:       (id, data)        => api.put(`/bmr/${id}/section-d`, data),
  saveSectionE:       (id, data)        => api.put(`/bmr/${id}/section-e`, data),

  // Deviations
  saveDeviation:      (id, data)        => api.post(`/bmr/${id}/deviation`, data),

  // Samples
  createSample:       (id, data)        => api.post(`/bmr/${id}/sample`, data),
  sendToQc:           (id, sampleId, data) => api.patch(`/bmr/${id}/sample/${sampleId}/send-to-qc`, data),
  verifySample:       (id, sampleId, data) => api.patch(`/bmr/${id}/sample/${sampleId}/verify`, data),

  // Notifications
  notifications:      (params)          => api.get('/bmr/notifications/list', { params }),
  markRead:           (notifId)         => api.patch(`/bmr/notifications/${notifId}/read`),
  markAllRead:        (data)            => api.patch('/bmr/notifications/read-all', data),
}
