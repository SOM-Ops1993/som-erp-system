import { api, erpApi } from '../context/context.jsx'

// ── Legacy plan-engine API — /plan-engine/* (unauthenticated) ─────────────────

export const planEngineApi = {
  run:           ()           => api.post('/plan-engine/run'),
  listPlans:     (params)     => api.get('/plan-engine/plans', { params }),
  getPlan:       (id)         => api.get(`/plan-engine/plans/${id}`),
  updatePlan:    (id, data)   => api.patch(`/plan-engine/plans/${id}`, data),
  cancelPlan:    (id)         => api.delete(`/plan-engine/plans/${id}`),
  dashboard:     ()           => api.get('/plan-engine/dashboard'),
  pendingOrders: ()           => api.get('/plan-engine/pending-orders'),
  logs:          ()           => api.get('/plan-engine/logs'),
}

// ── ERP planning API — /erp/planning/* (authenticated) ───────────────────────

export const planningApi = {
  analyse:       (data)       => erpApi.post('/erp/planning/analyse', data),
  createPlan:    (data)       => erpApi.post('/erp/planning/plans', data),
  listPlans:     (params)     => erpApi.get('/erp/planning/plans', { params }),
  getPlan:       (id)         => erpApi.get(`/erp/planning/plans/${id}`),
  submitPlan:    (id)         => erpApi.patch(`/erp/planning/plans/${id}/submit`),
  publishPlan:   (id)         => erpApi.patch(`/erp/planning/plans/${id}/publish`),
  startJob:      (id)         => erpApi.patch(`/erp/planning/jobs/${id}/start`),
  delayJob:      (id, data)   => erpApi.patch(`/erp/planning/jobs/${id}/delay`, data),
  recordQC:      (id, data)   => erpApi.post(`/erp/planning/jobs/${id}/qc`, data),
  logTimeMotion: (data)       => erpApi.post('/erp/planning/time-motion', data),
  timeMotion:    (params)     => erpApi.get('/erp/planning/time-motion', { params }),
}
