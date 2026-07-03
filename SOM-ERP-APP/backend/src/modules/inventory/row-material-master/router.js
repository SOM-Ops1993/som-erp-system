import express from 'express'
import { authenticate, authorize } from '../../../middleware/auth.js'
import { listRm, getRm, listWarehouses } from './get/rm-master.controller.js'
import { createRm } from './create/rm-master.controller.js'
import { updateRm } from './update/rm-master.controller.js'
import { deleteRm } from './delete/rm-master.controller.js'

const RmRouter = express.Router()
const managerOrAbove = authorize(['admin'])

RmRouter.get('/', authenticate, listRm)
RmRouter.get('/warehouses', authenticate, listWarehouses)
RmRouter.get('/:itemCode', authenticate, getRm)
RmRouter.post('/', authenticate, managerOrAbove, createRm)
RmRouter.put('/:itemCode', authenticate, managerOrAbove, updateRm)
RmRouter.delete('/:itemCode', authenticate, managerOrAbove, deleteRm)

export default RmRouter
