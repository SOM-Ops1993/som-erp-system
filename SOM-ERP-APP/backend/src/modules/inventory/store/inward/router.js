import express from 'express'
import { authenticate, authorize } from '../../../../middleware/auth.js'
import {
  getPendingInwardGroups, getNextLotNumber, listPacks, getPackById,
  getPackLabel, getBatchLabels, generatePacks,
  listInward, listActiveSessions, getSession
} from './get/inward.controller.js'
import { createSession, scanPack, submitSession } from './create/inward.controller.js'
import { removeScan } from './delete/inward.controller.js'

const InwardRouter = express.Router()
const storeOrAbove = authorize(['store'])

// ── Pack / Print Master ────────────────────────────────────────────────────────
InwardRouter.get('/packs/pending-inward', authenticate, getPendingInwardGroups)
InwardRouter.get('/packs/next-lot/:itemCode', authenticate, getNextLotNumber)
InwardRouter.get('/packs/label/:packId', getPackLabel)
InwardRouter.get('/packs/labels/lot/:itemCode/:lotNo', getBatchLabels)
InwardRouter.get('/packs/:packId', authenticate, getPackById)
InwardRouter.get('/packs', authenticate, listPacks)
InwardRouter.post('/packs/generate', authenticate, storeOrAbove, generatePacks)

// ── Inward records ─────────────────────────────────────────────────────────────
InwardRouter.get('/inward', authenticate, listInward)
InwardRouter.get('/inward/sessions', authenticate, listActiveSessions)
InwardRouter.post('/inward/sessions', authenticate, storeOrAbove, createSession)
InwardRouter.get('/inward/sessions/:sessionId', authenticate, getSession)
InwardRouter.post('/inward/sessions/:sessionId/scan', authenticate, storeOrAbove, scanPack)
InwardRouter.delete('/inward/sessions/:sessionId/scan/:packId', authenticate, storeOrAbove, removeScan)
InwardRouter.post('/inward/sessions/:sessionId/submit', authenticate, storeOrAbove, submitSession)

export default InwardRouter
