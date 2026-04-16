import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Network error'
    return Promise.reject(new Error(message))
  }
)

// ── RM Master ────────────────────────────────────────────────
export const rmApi = {
  list: (params) => api.get('/rm', { params }),
  get: (itemCode) => api.get(`/rm/${itemCode}`),
  create: (data) => api.post('/rm', data),
  update: (itemCode, data) => api.put(`/rm/${itemCode}`, data),
  delete: (itemCode) => api.delete(`/rm/${itemCode}`),
  warehouses: () => api.get('/rm/meta/warehouses'),
}

// ── Product Master ───────────────────────────────────────────
export const productMasterApi = {
  list: (params) => api.get('/product-master', { params }),
  get: (productCode) => api.get(`/product-master/${encodeURIComponent(productCode)}`),
  create: (data) => api.post('/product-master', data),
  update: (productCode, data) => api.put(`/product-master/${encodeURIComponent(productCode)}`, data),
  delete: (productCode) => api.delete(`/product-master/${encodeURIComponent(productCode)}`),
  syncFromRecipe: () => api.post('/product-master/sync-from-recipe'),
}

// ── Print Master ─────────────────────────────────────────────
export const packsApi = {
  generate: (data) => api.post('/packs/generate', data),
  list: (params) => api.get('/packs', { params }),
  get: (packId) => api.get(`/packs/${encodeURIComponent(packId)}`),
  nextLot: (itemCode) => api.get(`/packs/next-lot/${itemCode}`),
  pendingInward: () => api.get('/packs/pending/inward'),
  labelUrl: (packId) => `/api/packs/label/${encodeURIComponent(packId)}`,
  batchLabelsUrl: (itemCode, lotNo) => `/api/packs/labels/lot/${itemCode}/${encodeURIComponent(lotNo)}`,
}

// ── Inward ───────────────────────────────────────────────────
export const inwardApi = {
  createSession: (data) => api.post('/inward/session/create', data),
  scan: (sessionId, packId) => api.post(`/inward/session/${sessionId}/scan`, { packId }),
  removeScan: (sessionId, packId) => api.delete(`/inward/session/${sessionId}/scan/${encodeURIComponent(packId)}`),
  getSession: (sessionId) => api.get(`/inward/session/${sessionId}`),
  submit: (sessionId, transactedBy) => api.post(`/inward/session/${sessionId}/submit`, { transactedBy }),
  activeSessions: () => api.get('/inward/sessions/active'),
  history: (params) => api.get('/inward', { params }),
}

// ── Outward ──────────────────────────────────────────────────
export const outwardApi = {
  bomScan: (data) => api.post('/outward/bom/scan', data),
  packReduction: (data) => api.post('/outward/pack-reduction', data),
  stockAdjustment: (data) => api.post('/outward/stock-adjustment', data),
  warehouseTransfer: (data) => api.post('/outward/warehouse-transfer', data),
  history: (params) => api.get('/outward', { params }),
}

// ── Indent ───────────────────────────────────────────────────
export const indentApi = {
  create: (data) => api.post('/indent', data),
  list: (params) => api.get('/indent', { params }),
  get: (indentId) => api.get(`/indent/${indentId}`),
  products: () => api.get('/indent/products/list'),
  stockCheck: (productCode, batchSize) => api.get('/indent/stock-check', { params: { productCode, batchSize } }),
  nextBatchNo: (productCode) => api.get('/indent/next-batch-no', { params: { productCode } }),
  sfgAvailable: (productCode) => api.get('/indent/sfg-available', { params: { productCode } }),
  updateStatus: (indentId, status) => api.patch(`/indent/${indentId}/status`, { status }),
}

// ── SFG ──────────────────────────────────────────────────────
export const sfgApi = {
  list: (params) => api.get('/sfg', { params }),
  get: (sfgId) => api.get(`/sfg/${sfgId}`),
  summary: () => api.get('/sfg/summary'),
  update: (sfgId, data) => api.put(`/sfg/${sfgId}`, data),
}

// ── Recipe DB ────────────────────────────────────────────────
export const recipeApi = {
  list: (params) => api.get('/recipe', { params }),
  products: () => api.get('/recipe/products'),
  bulkSave: (rows) => api.post('/recipe/bulk-save', { rows }),
  deleteRow: (id) => api.delete(`/recipe/${id}`),
  deleteProduct: (productCode) => api.delete(`/recipe/product/${productCode}`),
}

// ── Stock ────────────────────────────────────────────────────
export const stockApi = {
  summary: (params) => api.get('/stock', { params }),
  item: (itemCode) => api.get(`/stock/${itemCode}`),
  containers: () => api.get('/stock/containers/all'),
}

// ── Ledger ───────────────────────────────────────────────────
export const ledgerApi = {
  item: (itemCode, params) => api.get(`/ledger/${itemCode}`, { params }),
  all: (params) => api.get('/ledger', { params }),
}

// ── Import ───────────────────────────────────────────────────
export const importApi = {
  preview: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/import/preview', form)
  },
  execute: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/import/execute', form, { timeout: 300000 })
  },
}
