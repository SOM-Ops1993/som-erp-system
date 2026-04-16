import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
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
  labelUrl: (packId) => `/api/packs/label/${encodeURIComponent(packId)}`,
  batchLabelsUrl: (itemCode, lotNo) => `/api/packs/labels/lot/${itemCode}/${encodeURIComponent(lotNo)}`,
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
  locationLabelUrl: (locationId) => `/api/bulk/${encodeURIComponent(locationId)}/label`,
  // Bulk inward
  bulkInward:       (data) => api.post('/bulk/inward', data),
  // Bulk outward
  bulkOutward:      (data) => api.post('/bulk/outward', data),
  // Stock summary
  stockSummary:     () => api.get('/bulk/stock/summary'),
}
