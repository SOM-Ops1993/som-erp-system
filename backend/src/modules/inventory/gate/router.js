import express from 'express'
import { authenticate, authorize } from '../../../middleware/auth.js'
import { createGateInward, createGateOutward } from './create/gate.controller.js'
import { listGateInward, getGateInward, listGateOutward, getGateOutward } from './get/gate.controller.js'
import { updateGateInwardStatus, updateGateOutwardStatus, requestDeleteGateInward, requestDeleteGateOutward } from './update/gate.controller.js'
import { deleteGateInward, deleteGateOutward } from './delete/gate.controller.js'

const GateRouter = express.Router()

// authorize() already calls authenticate() internally — no need for both
const gateOrAbove    = authorize(['gate_person', 'gate_manager', 'gate_staff', 'store_person', 'store_manager', 'admin'])
const managerOrAbove = authorize(['gate_manager', 'store_manager', 'admin'])

// ── Gate Inward ───────────────────────────────────────────────────────────────
GateRouter.post('/inward',                      gateOrAbove,    createGateInward)
GateRouter.get('/inward',                       authenticate,   listGateInward)
GateRouter.get('/inward/:id',                   authenticate,   getGateInward)
GateRouter.patch('/inward/:id/status',          managerOrAbove, updateGateInwardStatus)
GateRouter.patch('/inward/:id/request-delete',  gateOrAbove,    requestDeleteGateInward)
GateRouter.delete('/inward/:id',                managerOrAbove, deleteGateInward)

// ── Gate Outward ──────────────────────────────────────────────────────────────
GateRouter.post('/outward',                      gateOrAbove,    createGateOutward)
GateRouter.get('/outward',                       authenticate,   listGateOutward)
GateRouter.get('/outward/:id',                   authenticate,   getGateOutward)
GateRouter.patch('/outward/:id/status',          managerOrAbove, updateGateOutwardStatus)
GateRouter.patch('/outward/:id/request-delete',  gateOrAbove,    requestDeleteGateOutward)
GateRouter.delete('/outward/:id',                managerOrAbove, deleteGateOutward)

export default GateRouter
