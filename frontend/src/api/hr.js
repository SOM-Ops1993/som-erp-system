import { api } from '../context/context.jsx'

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
