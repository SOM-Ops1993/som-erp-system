import express from 'express'
import { authenticate, authorize } from '../../../middleware/auth.js'
import { createGateInward, createGateOutward } from './create/gate.controller.js'
import { listGateInward, getGateInward, listGateOutward, getGateOutward } from './get/gate.controller.js'
import { updateGateInwardStatus, updateGateOutwardStatus, requestDeleteGateInward, requestDeleteGateOutward } from './update/gate.controller.js'
import { deleteGateInward, deleteGateOutward } from './delete/gate.controller.js'

const GateRouter = express.Router()

// authorize() already calls authenticate() internally — no need for both
const gateOrAbove    = authorize(['gate'])
const managerOrAbove = authorize(['gate'])

// ── Gate Inward ───────────────────────────────────────────────────────────────
GateRouter.post('/inward',                      gateOrAbove,    createGateInward)  // create inward record
GateRouter.get('/inward',                       authenticate,   listGateInward)    // get list of records  
GateRouter.get('/inward/:id',                   authenticate,   getGateInward)     // get one recode by Id
GateRouter.patch('/inward/:id/status',          managerOrAbove, updateGateInwardStatus) // update ineward status
GateRouter.patch('/inward/:id/request-delete',  gateOrAbove,    requestDeleteGateInward)  // send request for delete inward records by gate person
GateRouter.delete('/inward/:id',                managerOrAbove, deleteGateInward)  // delete record by admin user

// ── Gate Outward ──────────────────────────────────────────────────────────────
GateRouter.post('/outward',                      gateOrAbove,    createGateOutward) // create inward record
GateRouter.get('/outward',                       authenticate,   listGateOutward)   // get list of records  
GateRouter.get('/outward/:id',                   authenticate,   getGateOutward)    // get one recode by Id
GateRouter.patch('/outward/:id/status',          managerOrAbove, updateGateOutwardStatus)  // update ineward status
GateRouter.patch('/outward/:id/request-delete',  gateOrAbove,    requestDeleteGateOutward)  // send request for delete inward records by gate person
GateRouter.delete('/outward/:id',                managerOrAbove, deleteGateOutward)  // delete record by admin user


export default GateRouter
