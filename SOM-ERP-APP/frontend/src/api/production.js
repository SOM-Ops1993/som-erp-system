import { api, erpApi } from '../context/context.jsx'

// ── Legacy unauthenticated production APIs ────────────────────────────────────

export const productionApi = {
  list:          (params)            => api.get('/production', { params }),
  get:           (id)                => api.get(`/production/${id}`),
  create:        (data)              => api.post('/production', data),
  patch:         (id, data)          => api.patch(`/production/${id}`, data),
  saveBiomass:   (id, rows)          => api.put(`/production/${id}/biomass`, { rows }),
  saveTechnical: (id, data)          => api.put(`/production/${id}/technical`, data),
  addCycle:      (id, data)          => api.post(`/production/${id}/formulation`, data),
  updateCycle:   (id, cycleId, data) => api.put(`/production/${id}/formulation/${cycleId}`, data),
  deleteCycle:   (id, cycleId)       => api.delete(`/production/${id}/formulation/${cycleId}`),
  saveUnloading: (id, data)          => api.put(`/production/${id}/unloading`, data),
  saveSieving:   (id, data)          => api.put(`/production/${id}/sieving`, data),
  savePacking:   (id, data)          => api.put(`/production/${id}/packing`, data),
  saveQC:        (id, data)          => api.put(`/production/${id}/qc`, data),
  saveInventory: (id, data)          => api.put(`/production/${id}/inventory`, data),
}

export const indentApi = {
  create:          (data)                  => api.post('/indent', data),
  list:            (params)                => api.get('/indent', { params }),
  get:             (id)                    => api.get(`/indent/${id}`),
  products:        ()                      => api.get('/indent/products/list'),
  stockCheck:      (productCode, batchSize) => api.get('/indent/stock-check', { params: { productCode, batchSize } }),
  nextBatchNo:     (productCode)           => api.get('/indent/next-batch-no', { params: { productCode } }),
  sfgAvailable:    (productCode)           => api.get('/indent/sfg-available', { params: { productCode } }),
  purchaseSummary: (params)                => api.get('/indent/purchase-summary', { params }),
  markPoSent:      (indentIds)             => api.post('/indent/mark-po-sent', { indentIds }),
}

// ── ERP BOM issuance (authenticated) ─────────────────────────────────────────

export const bomIssuanceApi = {
  pendingJobs:  ()         => erpApi.get('/erp/bom-issuance/pending-jobs'),
  getJob:       (id)       => erpApi.get(`/erp/bom-issuance/job/${id}`),
  issue:        (data)     => erpApi.post('/erp/bom-issuance/issue', data),
  scrapJob:     (id, data) => erpApi.post(`/erp/bom-issuance/jobs/${id}/scrap`, data),
  reprocessJob: (id)       => erpApi.post(`/erp/bom-issuance/jobs/${id}/reprocess`),
  history:      (params)   => erpApi.get('/erp/bom-issuance/history', { params }),
}
