import { erpApi as api } from '../context/context.jsx'

export const authApi = {
  login:          (data)     => api.post('/auth/login', data),
  pinLogin:       (data)     => api.post('/auth/pin-login', data),
  me:             ()         => api.get('/auth/me'),
  users:          ()         => api.get('/auth/users'),
  createUser:     (data)     => api.post('/auth/users', data),
  updateUser:     (id, data) => api.patch(`/auth/users/${id}`, data),
  changePassword: (data)     => api.post('/auth/change-password', data),
  roles:          ()         => api.get('/auth/roles'),
}
