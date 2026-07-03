import { api } from '../context/context.jsx'


export const microbialSfgApi = {
  // Microbe master
  listMicrobes:       ()        => api.get('/microbial-sfg/masters/microbes'),
  createMicrobe:      (data)    => api.post('/microbial-sfg/masters/microbes', data),
  updateMicrobe:      (id, d)   => api.put(`/microbial-sfg/masters/microbes/${id}`, d),
  deleteMicrobe:      (id)      => api.delete(`/microbial-sfg/masters/microbes/${id}`),
  importMicrobes:     (rows)    => api.post('/microbial-sfg/masters/microbes/import', { rows }),
  // Containers
  listContainers:     (params)  => api.get('/microbial-sfg/inward/containers', { params }),
  availableContainers:(params)  => api.get('/microbial-sfg/inward/containers/available', { params }),
  nextContainerCode:  (params)  => api.get('/microbial-sfg/inward/containers/next-code', { params }),
  containerBatches:   (id)      => api.get(`/microbial-sfg/inward/containers/${id}/batches`),
  // Inward
  listInward:         (params)  => api.get('/microbial-sfg/inward', { params }),
  createInward:       (data)    => api.post('/microbial-sfg/inward', data),
  updateInward:       (id, d)   => api.put(`/microbial-sfg/inward/${id}`, d),
  importInward:       (rows)    => api.post('/microbial-sfg/inward/import', { rows }),
  inwardSummary:      ()        => api.get('/microbial-sfg/inward/summary'),
  // Planning integration
  checkPlanMicrobes:  (planId, mf) =>
    api.get(`/microbial-sfg/planning/check/${planId}`, { params: { multiplication_factor: mf } }),
  allocate:           (data)    => api.post('/microbial-sfg/planning/allocate', data),
  listAllocations:    (planId)  => api.get(`/microbial-sfg/planning/allocations/${planId}`),
  cancelAllocation:   (id)      => api.delete(`/microbial-sfg/planning/allocations/${id}`),
}


export const microbialApi = {
  containers:      (params)     => api.get('/microbial/containers', { params }),
  getContainer:    (id)         => api.get(`/microbial/containers/${id}`),
  createContainer: (data)       => api.post('/microbial/containers', data),
  updateContainer: (id, data)   => api.patch(`/microbial/containers/${id}`, data),
  allocate:        (data)       => api.post('/microbial/allocate', data),
  createTx:        (data)       => api.post('/microbial/transactions', data),
  confirmReceipt:  (id, data)   => api.patch(`/microbial/transactions/${id}/confirm-receipt`, data),
  transactions:    (params)     => api.get('/microbial/transactions', { params }),
  decayReport:     ()           => api.get('/microbial/decay-report'),
}
