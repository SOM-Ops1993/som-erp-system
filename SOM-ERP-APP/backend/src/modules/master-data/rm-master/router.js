import { Router } from 'express'
import { listRm, getWarehouses, getRm } from './get/rm-master.controller.js'
import { createRm } from './create/rm-master.controller.js'
import { updateRm } from './update/rm-master.controller.js'
import { deleteRm } from './delete/rm-master.controller.js'

const RmMasterRouter = Router()

// GET /api/rm
RmMasterRouter.get('/', listRm)

// NOTE: static paths like /meta/warehouses MUST come before /:itemCode
// otherwise Express matches "meta" as the itemCode param
// GET /api/rm/meta/warehouses
RmMasterRouter.get('/meta/warehouses', getWarehouses)

// GET /api/rm/:itemCode
RmMasterRouter.get('/:itemCode', getRm)

// POST /api/rm
RmMasterRouter.post('/', createRm)

// PUT /api/rm/:itemCode
RmMasterRouter.put('/:itemCode', updateRm)

// DELETE /api/rm/:itemCode
RmMasterRouter.delete('/:itemCode', deleteRm)

export default RmMasterRouter
