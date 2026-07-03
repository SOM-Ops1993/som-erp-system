import { api } from '../context/context.jsx'


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


export const planningApi = {
  analyse:       (data)       => api.post('/planning/analyse', data),
  createPlan:    (data)       => api.post('/planning/plans', data),
  listPlans:     (params)     => api.get('/planning/plans', { params }),
  getPlan:       (id)         => api.get(`/planning/plans/${id}`),
  submitPlan:    (id)         => api.patch(`/planning/plans/${id}/submit`),
  publishPlan:   (id)         => api.patch(`/planning/plans/${id}/publish`),
  startJob:      (id)         => api.patch(`/planning/jobs/${id}/start`),
  delayJob:      (id, data)   => api.patch(`/planning/jobs/${id}/delay`, data),
  recordQC:      (id, data)   => api.post(`/planning/jobs/${id}/qc`, data),
  logTimeMotion: (data)       => api.post('/planning/time-motion', data),
  timeMotion:    (params)     => api.get('/planning/time-motion', { params }),
}
