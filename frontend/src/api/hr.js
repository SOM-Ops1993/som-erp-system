import { api } from '../context/context.jsx'

export const bmrApi = {
  list:            (params)          => api.get('/bmr', { params }),
  get:             (id)              => api.get(`/bmr/${id}`),
  create:          (data)            => api.post('/bmr', data),
  saveSectionA:    (id, data)        => api.put(`/bmr/${id}/section-a`, data),
  saveSectionB:    (id, data)        => api.put(`/bmr/${id}/section-b`, data),
  saveSectionC:    (id, data)        => api.put(`/bmr/${id}/section-c`, data),
  tickChecklist:   (id, itemId, data)=> api.patch(`/bmr/${id}/section-c/checklist/${itemId}`, data),
  saveSectionD:    (id, data)        => api.put(`/bmr/${id}/section-d`, data),
  saveSectionE:    (id, data)        => api.put(`/bmr/${id}/section-e`, data),
  addDeviation:    (id, data)        => api.post(`/bmr/${id}/deviation`, data),
  addSample:       (id, data)        => api.post(`/bmr/${id}/sample`, data),
  sendToQc:        (id, sampleId, data) => api.patch(`/bmr/${id}/sample/${sampleId}/send-to-qc`, data),
  verifySample:    (id, sampleId, data) => api.patch(`/bmr/${id}/sample/${sampleId}/verify`, data),
}

export const employeeApi = {
  list:            (params)             => api.get('/erp/employees', { params }),
  get:             (id)                 => api.get(`/erp/employees/${id}`),
  create:          (data)               => api.post('/erp/employees', data),
  update:          (id, data)           => api.put(`/erp/employees/${id}`, data),
  remove:          (id)                 => api.delete(`/erp/employees/${id}`),
  listPages:       ()                   => api.get('/erp/employees/pages'),
  roleDefaults:    ()                   => api.get('/erp/employees/role-defaults'),
  getPermissions:  (role)               => api.get(`/erp/employees/permissions/${role}`),
  savePermissions: (role, pagePaths)    => api.post('/erp/employees/permissions/save', { role, pagePaths }),
  seedDefaults:    ()                   => api.post('/erp/employees/permissions/seed-defaults'),
  listCompanies:   ()                   => api.get('/erp/employees/companies/list'),
  addCompany:      (data)               => api.post('/erp/employees/companies', data),
}
