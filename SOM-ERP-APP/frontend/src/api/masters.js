import { api } from '../context/context.jsx'


export const productApi = {
  list:   (params)     => api.get('/products', { params }),
  get:    (code)       => api.get(`/products/${encodeURIComponent(code)}`),
  create: (data)       => api.post('/products', data),
  update: (code, data) => api.put(`/products/${encodeURIComponent(code)}`, data),
  delete: (code)       => api.delete(`/products/${encodeURIComponent(code)}`),
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
  list:           (params)   => api.get('/recipe', { params }),
  products:       ()         => api.get('/recipe/products'),
  bulkSave:       (rows)     => api.post('/recipe/bulk-save', { rows }),
  deleteRow:      (id)       => api.delete(`/recipe/${id}`),
  deleteProduct:  (code)     => api.delete(`/recipe/product/${code}`),
  checkRmMapping: ()         => api.get('/recipe/check-rm-mapping'),
  fixRmMapping:   (mappings) => api.post('/recipe/fix-rm-mapping', { mappings }),
}


export const erpItemsApi = {
  list:   (params)     => api.get('/masters/items', { params }),
  get:    (code)       => api.get(`/masters/items/${encodeURIComponent(code)}`),
  create: (data)       => api.post('/masters/items', data),
  update: (code, data) => api.put(`/masters/items/${encodeURIComponent(code)}`, data),
}

export const erpSuppliersApi = {
  list:   ()           => api.get('/masters/suppliers'),
  create: (data)       => api.post('/masters/suppliers', data),
  update: (id, data)   => api.put(`/masters/suppliers/${id}`, data),
}

export const erpPlantsApi = {
  list:   () => api.get('/masters/plants'),
  create: (data) => api.post('/masters/plants', data),
}

export const erpEquipmentApi = {
  list:   (params)   => api.get('/masters/equipment', { params }),
  create: (data)     => api.post('/masters/equipment', data),
  patch:  (id, data) => api.patch(`/masters/equipment/${id}`, data),
}

export const erpProductsApi = {
  list:   (params) => api.get('/masters/erp-products', { params }),
  create: (data)   => api.post('/masters/erp-products', data),
}

export const erpBomApi = {
  list:   (params) => api.get('/masters/bom', { params }),
  get:    (id)     => api.get(`/masters/bom/${id}`),
  create: (data)   => api.post('/masters/bom', data),
}

export const erpStrainsApi = {
  list:   ()     => api.get('/masters/strains'),
  create: (data) => api.post('/masters/strains', data),
}

export const erpCustomersApi = {
  list:   ()     => api.get('/masters/customers'),
  create: (data) => api.post('/masters/customers', data),
}

export const erpReasonCodesApi = {
  list: (params) => api.get('/masters/reason-codes', { params }),
}

export const erpContainersApi = {
  list:   (params) => api.get('/masters/containers', { params }),
  create: (data)   => api.post('/masters/containers', data),
}
