import { api } from '../context/context.jsx'


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


// ── Plant scheduling tasks (planning/production pages) ────────────────────────
export const planTasksApi = {
  list:         (params) => api.get('/plan-tasks', { params }),
  create:       (data)   => api.post('/plan-tasks', data),
  update:       (id, data) => api.put(`/plan-tasks/${id}`, data),
  delete:       (id)     => api.delete(`/plan-tasks/${id}`),
  sendSchedule: (date)   => api.post('/plan-tasks/send-schedule', { date }),
  // Autocomplete lookups
  searchSalesOrders:    (q)      => api.get('/plan-tasks/search/sales-orders',      { params: { q } }),
  getSalesOrderItems:   (diNo)   => api.get('/plan-tasks/search/sales-order-items', { params: { diNo } }),
  searchProducts:       (q, plant) => api.get('/plan-tasks/search/products',        { params: { q, plant } }),
  searchEquipment:      (plant)   => api.get('/plan-tasks/search/equipment',        { params: { plant } }),
}

export const bomIssuanceApi = {
  pendingJobs:  ()         => api.get('/bom-issuance/pending-jobs'),
  getJob:       (id)       => api.get(`/bom-issuance/job/${id}`),
  issue:        (data)     => api.post('/bom-issuance/issue', data),
  scrapJob:     (id, data) => api.post(`/bom-issuance/jobs/${id}/scrap`, data),
  reprocessJob: (id)       => api.post(`/bom-issuance/jobs/${id}/reprocess`),
  history:      (params)   => api.get('/bom-issuance/history', { params }),
}
