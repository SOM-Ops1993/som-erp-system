import { api } from '../context/context.jsx'

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  me:    ()     => api.get('/auth/me'),
}
