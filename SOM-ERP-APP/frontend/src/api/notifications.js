import { api } from '../context/context.jsx'

export const notifApi = {
  list:        (params) => api.get('/notifications', { params }),
  markRead:    (id)     => api.patch(`/notifications/${id}/read`),
  markReadAll: ()       => api.patch('/notifications/read-all'),
  action:      (id)     => api.patch(`/notifications/${id}/action`),
  unreadCount: ()       => api.get('/notifications/unread-count'),
  adminAll:    (params) => api.get('/notifications/admin/all', { params }),
  deliveryLog: (params) => api.get('/notifications/delivery-log', { params }),
}
