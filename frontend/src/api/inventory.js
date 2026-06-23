import { api, erpApi } from '../context/context.jsx'

// ── Legacy unauthenticated inventory APIs ─────────────────────────────────────

export const rmApi = {
  list:       (params)     => api.get('/rm', { params }),
  get:        (code)       => api.get(`/rm/${code}`),
  create:     (data)       => api.post('/rm', data),
  update:     (code, data) => api.put(`/rm/${code}`, data),
  delete:     (code)       => api.delete(`/rm/${code}`),
  warehouses: ()           => api.get('/rm/meta/warehouses'),
}

export const packsApi = {
  generate:       (data)            => api.post('/packs/generate', data),
  list:           (params)          => api.get('/packs', { params }),
  get:            (packId)          => api.get(`/packs/${encodeURIComponent(packId)}`),
  nextLot:        (itemCode)        => api.get(`/packs/next-lot/${itemCode}`),
  pendingInward:  ()                => api.get('/packs/pending-inward'),
  labelUrl:       (packId)          => `/api/packs/label/${encodeURIComponent(packId)}`,
  batchLabelsUrl: (itemCode, lotNo) => `/api/packs/labels/lot/${itemCode}/${encodeURIComponent(lotNo)}`,
}

export const inwardApi = {
  createSession:  (data)                  => api.post('/inward/sessions', data),
  scan:           (sessionId, packId, warehouse) => api.post(`/inward/sessions/${sessionId}/scan`, { packId, warehouse }),
  removeScan:     (sessionId, packId)     => api.delete(`/inward/sessions/${sessionId}/scan/${encodeURIComponent(packId)}`),
  getSession:     (sessionId)             => api.get(`/inward/sessions/${sessionId}`),
  submit:         (sessionId, transactedBy) => api.post(`/inward/sessions/${sessionId}/submit`, { transactedBy }),
  activeSessions: ()                      => api.get('/inward/sessions'),
  history:        (params)                => api.get('/inward', { params }),
}

export const outwardApi = {
  bomScan:             (data)    => api.post('/outward/bom-scan', data),
  bomManual:           (data)    => api.post('/outward/bom-manual', data),
  availablePacks:      (rmCode)  => api.get(`/outward/available/${encodeURIComponent(rmCode)}`),
  packReduction:       (data)    => api.post('/outward/pack-reduction', data),
  stockAdjustment:     (data)    => api.post('/outward/stock-adjustment', data),
  lossAdjustment:      (data)    => api.post('/outward/loss-adjustment', data),
  warehouseTransfer:   (data)    => api.post('/outward/warehouse-transfer', data),
  directIssue:         (data)    => api.post('/outward/direct-issue', data),
  bomDirect:           (data)    => api.post('/outward/bom-direct', data),
  history:             (params)  => api.get('/outward', { params }),
}

export const sfgApi = {
  list:    (params) => api.get('/sfg', { params }),
  listAll: (params) => api.get('/sfg', { params: { ...params, showAll: 'true' } }),
  get:     (sfgId)  => api.get(`/sfg/${sfgId}`),
  summary: ()       => api.get('/sfg/summary'),
  update:  (sfgId, data) => api.put(`/sfg/${sfgId}`, data),
}

export const containerApi = {
  list:       (params)      => api.get('/containers', { params }),
  get:        (id)          => api.get(`/containers/${encodeURIComponent(id)}`),
  create:     (data)        => api.post('/containers', data),
  fill:       (id, data)    => api.post(`/containers/${encodeURIComponent(id)}/fill`, data),
  issue:      (id, data)    => api.post(`/containers/${encodeURIComponent(id)}/issue`, data),
  labelUrl:   (id)          => `/api/containers/${encodeURIComponent(id)}/label`,
}

export const stockApi = {
  summary:    (params)   => api.get('/stock', { params }),
  item:       (itemCode) => api.get(`/stock/${itemCode}`),
  containers: ()         => api.get('/stock/containers'),
  dashboard:  (period)   => api.get('/stock/dashboard', { params: { period } }),
  rmHistory:  (itemCode) => api.get(`/stock/rm/${encodeURIComponent(itemCode)}/history`),
}

export const ledgerApi = {
  all:        (params)          => api.get('/ledger', { params }),
  item:       (itemCode, params) => api.get(`/ledger/item/${itemCode}`, { params }),
  entryDetail:(id)              => api.get(`/ledger/${id}`),
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

export const grnApi = {
  list:   ()                     => api.get('/grn'),
  detail: (invoiceNo, supplier)  => api.get('/grn/detail', { params: { invoiceNo, supplier } }),
}

export const bulkApi = {
  listLocations:    (params)     => api.get('/bulk/locations', { params }),
  getLocation:      (locationId) => api.get(`/bulk/locations/${encodeURIComponent(locationId)}`),
  createLocation:   (data)       => api.post('/bulk/locations', data),
  deleteLocation:   (locationId) => api.delete(`/bulk/locations/${encodeURIComponent(locationId)}`),
  locationLabelUrl: (locationId) => `/api/bulk/locations/${encodeURIComponent(locationId)}/label`,
  bulkInward:       (data)       => api.post('/bulk/inward', data),
  bulkOutward:      (data)       => api.post('/bulk/outward', data),
  stockSummary:     ()           => api.get('/bulk/summary'),
}

// ── ERP gate & inventory (authenticated) ─────────────────────────────────────

export const gateApi = {
  // Inward
  createInward:         (data)     => erpApi.post('/erp/gate/inward', data),
  inwardList:           (params)   => erpApi.get('/erp/gate/inward', { params }),
  inwardDetail:         (id)       => erpApi.get(`/erp/gate/inward/${id}`),
  updateInward:         (id, data) => erpApi.patch(`/erp/gate/inward/${id}/status`, data),
  requestDeleteInward:  (id)       => erpApi.patch(`/erp/gate/inward/${id}/request-delete`),
  deleteInward:         (id)       => erpApi.delete(`/erp/gate/inward/${id}`),
  // Outward
  createOutward:        (data)     => erpApi.post('/erp/gate/outward', data),
  outwardList:          (params)   => erpApi.get('/erp/gate/outward', { params }),
  outwardDetail:        (id)       => erpApi.get(`/erp/gate/outward/${id}`),
  updateOutward:        (id, data) => erpApi.patch(`/erp/gate/outward/${id}/status`, data),
  requestDeleteOutward: (id)       => erpApi.patch(`/erp/gate/outward/${id}/request-delete`),
  deleteOutward:        (id)       => erpApi.delete(`/erp/gate/outward/${id}`),
}

export const inventoryApi = {
  createAdj:       (data)       => erpApi.post('/erp/inventory/adjustments', data),
  approveAdj:      (id, data)   => erpApi.patch(`/erp/inventory/adjustments/${id}/approve`, data),
  rejectAdj:       (id, data)   => erpApi.patch(`/erp/inventory/adjustments/${id}/reject`, data),
  listAdj:         (params)     => erpApi.get('/erp/inventory/adjustments', { params }),
  createTransfer:  (data)       => erpApi.post('/erp/inventory/transfers', data),
  receiveTransfer: (id, data)   => erpApi.patch(`/erp/inventory/transfers/${id}/receive`, data),
  listTransfers:   (params)     => erpApi.get('/erp/inventory/transfers', { params }),
  decant:          (data)       => erpApi.post('/erp/inventory/decanting', data),
  listDecanting:   (params)     => erpApi.get('/erp/inventory/decanting', { params }),
  fifoCheck:       (data)       => erpApi.post('/erp/inventory/fifo-check', data),
  fifoOverride:    (data)       => erpApi.post('/erp/inventory/fifo-override', data),
  stockSummary:    ()           => erpApi.get('/erp/inventory/stock-summary'),
}
