import { erpApi as api } from '../context/context.jsx'

export const notifApi = {
  list:        (params) => api.get('/erp/notifications', { params }),
  markRead:    (id)     => api.patch(`/erp/notifications/${id}/read`),
  markReadAll: ()       => api.patch('/erp/notifications/read-all'),
  action:      (id)     => api.patch(`/erp/notifications/${id}/action`),
  unreadCount: ()       => api.get('/erp/notifications/unread-count'),
  adminAll:    (params) => api.get('/erp/notifications/admin/all', { params }),
  deliveryLog: (params) => api.get('/erp/notifications/delivery-log', { params }),
}
