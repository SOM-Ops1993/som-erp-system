import { api, erpApi } from '../context/context.jsx'

// ── Legacy unauthenticated master APIs ────────────────────────────────────────

export const productApi = {
  list:   (params)     => erpApi.get('/products', { params }),
  get:    (code)       => erpApi.get(`/products/${encodeURIComponent(code)}`),
  create: (data)       => erpApi.post('/products', data),
  update: (code, data) => erpApi.put(`/products/${encodeURIComponent(code)}`, data),
  delete: (code)       => erpApi.delete(`/products/${encodeURIComponent(code)}`),
}

export const equipmentApi = {
  list:   ()           => api.get('/equipment'),
  create: (data)       => api.post('/equipment', data),
  update: (id, data)   => api.put(`/equipment/${id}`, data),
  delete: (id)         => api.delete(`/equipment/${id}`),
}

export const packingMaterialApi = {
  list:   ()           => api.get('/packing-materials'),
  create: (data)       => api.post('/packing-materials', data),
  update: (id, data)   => api.put(`/packing-materials/${id}`, data),
  delete: (id)         => api.delete(`/packing-materials/${id}`),
}

export const recipeApi = {
  list:           (params)   => erpApi.get('/recipe', { params }),
  products:       ()         => erpApi.get('/recipe/products'),
  bulkSave:       (rows)     => erpApi.post('/recipe/bulk-save', { rows }),
  deleteRow:      (id)       => erpApi.delete(`/recipe/${id}`),
  deleteProduct:  (code)     => erpApi.delete(`/recipe/product/${code}`),
  checkRmMapping: ()         => erpApi.get('/recipe/check-rm-mapping'),
  fixRmMapping:   (mappings) => erpApi.post('/recipe/fix-rm-mapping', { mappings }),
}

// ── ERP master data (authenticated) ──────────────────────────────────────────

export const erpItemsApi = {
  list:   (params)     => erpApi.get('/erp/masters/items', { params }),
  get:    (code)       => erpApi.get(`/erp/masters/items/${encodeURIComponent(code)}`),
  create: (data)       => erpApi.post('/erp/masters/items', data),
  update: (code, data) => erpApi.put(`/erp/masters/items/${encodeURIComponent(code)}`, data),
}

export const erpSuppliersApi = {
  list:   ()           => erpApi.get('/erp/masters/suppliers'),
  create: (data)       => erpApi.post('/erp/masters/suppliers', data),
  update: (id, data)   => erpApi.put(`/erp/masters/suppliers/${id}`, data),
}

export const erpPlantsApi = {
  list:   () => erpApi.get('/erp/masters/plants'),
  create: (data) => erpApi.post('/erp/masters/plants', data),
}

export const erpEquipmentApi = {
  list:   (params)   => erpApi.get('/erp/masters/equipment', { params }),
  create: (data)     => erpApi.post('/erp/masters/equipment', data),
  patch:  (id, data) => erpApi.patch(`/erp/masters/equipment/${id}`, data),
}

export const erpProductsApi = {
  list:   (params) => erpApi.get('/erp/masters/erp-products', { params }),
  create: (data)   => erpApi.post('/erp/masters/erp-products', data),
}

export const erpBomApi = {
  list:   (params) => erpApi.get('/erp/masters/bom', { params }),
  get:    (id)     => erpApi.get(`/erp/masters/bom/${id}`),
  create: (data)   => erpApi.post('/erp/masters/bom', data),
}

export const erpStrainsApi = {
  list:   ()     => erpApi.get('/erp/masters/strains'),
  create: (data) => erpApi.post('/erp/masters/strains', data),
}

export const erpCustomersApi = {
  list:   ()     => erpApi.get('/erp/masters/customers'),
  create: (data) => erpApi.post('/erp/masters/customers', data),
}

export const erpReasonCodesApi = {
  list: (params) => erpApi.get('/erp/masters/reason-codes', { params }),
}

export const erpContainersApi = {
  list:   (params) => erpApi.get('/erp/masters/containers', { params }),
  create: (data)   => erpApi.post('/erp/masters/containers', data),
}
