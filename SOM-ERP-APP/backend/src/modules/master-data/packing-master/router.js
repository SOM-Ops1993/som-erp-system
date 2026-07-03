import express from 'express'
import { authenticate, authorize } from '../../../middleware/auth.js'
import { listPackingMaterials } from './get/packing-master.controller.js'
import { createPackingMaterial } from './create/packing-master.controller.js'
import { updatePackingMaterial } from './update/packing-master.controller.js'
import { deletePackingMaterial } from './delete/packing-master.controller.js'

const PackingMasterRouter = express.Router()
const adminOnly    = authorize(['admin'])

PackingMasterRouter.get('/packing-materials', authenticate, listPackingMaterials)
PackingMasterRouter.post('/packing-materials', authenticate, adminOnly, createPackingMaterial)
PackingMasterRouter.put('/packing-materials/:id', authenticate, adminOnly, updatePackingMaterial)
PackingMasterRouter.delete('/packing-materials/:id', authenticate, adminOnly, deletePackingMaterial)

export default PackingMasterRouter
