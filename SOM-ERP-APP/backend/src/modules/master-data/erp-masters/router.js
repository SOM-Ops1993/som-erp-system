import express from 'express'
import { authenticate, authorize } from '../../../middleware/auth.js'
import {
  listItems, getItem, listSuppliers, listPlants, listErpEquipment,
  listErpProducts, listBom, getBom, listStrains, listCustomers,
  listReasonCodes, listErpContainers,
} from './get/erp-masters.controller.js'
import {
  createItem, createSupplier, createPlant, createErpEquipment,
  createErpProduct, createBom, createStrain, createCustomer, createErpContainer,
} from './create/erp-masters.controller.js'
import { updateItem, updateSupplier, patchErpEquipment } from './update/erp-masters.controller.js'

const ErpMastersRouter = express.Router()
const adminOnly   = authorize(['admin'])
const storeManager = authorize(['admin', 'store'])
const plannerPlus  = authorize(['admin', 'production'])

// ── ERP Items ─────────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/items', authenticate, listItems)
ErpMastersRouter.get('/masters/items/:code', authenticate, getItem)
ErpMastersRouter.post('/masters/items', authenticate, storeManager, createItem)
ErpMastersRouter.put('/masters/items/:code', authenticate, storeManager, updateItem)

// ── ERP Suppliers ─────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/suppliers', authenticate, listSuppliers)
ErpMastersRouter.post('/masters/suppliers', authenticate, storeManager, createSupplier)
ErpMastersRouter.put('/masters/suppliers/:id', authenticate, storeManager, updateSupplier)

// ── ERP Plants ────────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/plants', authenticate, listPlants)
ErpMastersRouter.post('/masters/plants', authenticate, adminOnly, createPlant)

// ── ERP Equipment ─────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/equipment', authenticate, listErpEquipment)
ErpMastersRouter.post('/masters/equipment', authenticate, adminOnly, createErpEquipment)
ErpMastersRouter.patch('/masters/equipment/:id', authenticate, adminOnly, patchErpEquipment)

// ── ERP Products ──────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/erp-products', authenticate, listErpProducts)
ErpMastersRouter.post('/masters/erp-products', authenticate, adminOnly, createErpProduct)

// ── BOM ───────────────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/bom', authenticate, plannerPlus, listBom)
ErpMastersRouter.get('/masters/bom/:id', authenticate, getBom)
ErpMastersRouter.post('/masters/bom', authenticate, authorize(['admin', 'production']), createBom)

// ── Microbial Strains ─────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/strains', authenticate, listStrains)
ErpMastersRouter.post('/masters/strains', authenticate, adminOnly, createStrain)

// ── Customers ─────────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/customers', authenticate, listCustomers)
ErpMastersRouter.post('/masters/customers', authenticate, authorize(['admin', 'store']), createCustomer)

// ── Reason Codes ─────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/reason-codes', authenticate, listReasonCodes)

// ── Containers (for decanting) ────────────────────────────────────────────────
ErpMastersRouter.get('/masters/containers', authenticate, listErpContainers)
ErpMastersRouter.post('/masters/containers', authenticate, storeManager, createErpContainer)

export default ErpMastersRouter
