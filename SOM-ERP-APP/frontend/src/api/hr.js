import { api } from '../context/context.jsx'

export const employeeApi = {
  list:            (params)             => api.get('/employees', { params }),
  get:             (id)                 => api.get(`/employees/${id}`),
  create:          (data)               => api.post('/employees', data),
  update:          (id, data)           => api.put(`/employees/${id}`, data),
  remove:          (id)                 => api.delete(`/employees/${id}`),
  listPages:       ()                   => api.get('/employees/pages'),
  roleDefaults:    ()                   => api.get('/employees/role-defaults'),
  getPermissions:  (role)               => api.get(`/employees/permissions/${role}`),
  savePermissions: (role, pagePaths)    => api.post('/employees/permissions/save', { role, pagePaths }),
  seedDefaults:    ()                   => api.post('/employees/permissions/seed-defaults'),
  listCompanies:   ()                   => api.get('/employees/companies/list'),
  addCompany:      (data)               => api.post('/employees/companies', data),
}
