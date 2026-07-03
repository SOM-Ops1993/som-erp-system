import express from 'express'
import { authenticate, authorize } from '../../../middleware/auth.js'
import { listEquipment } from './get/equipment-master.controller.js'
import { createEquipment } from './create/equipment-master.controller.js'
import { updateEquipment } from './update/equipment-master.controller.js'
import { deleteEquipment } from './delete/equipment-master.controller.js'

const EquipmentMasterRouter = express.Router()
const adminOnly = authorize(['admin'])

EquipmentMasterRouter.get('/equipment', authenticate, listEquipment)
EquipmentMasterRouter.post('/equipment', authenticate, adminOnly, createEquipment)
EquipmentMasterRouter.put('/equipment/:equipId', authenticate, adminOnly, updateEquipment)
EquipmentMasterRouter.delete('/equipment/:equipId', authenticate, adminOnly, deleteEquipment)

export default EquipmentMasterRouter
