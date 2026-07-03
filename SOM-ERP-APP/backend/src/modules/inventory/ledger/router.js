import express from 'express'
import { authenticate } from '../../../middleware/auth.js'
import { listLedger, getLedgerByItem, getLedgerEntry } from './get/ledger.controller.js'

const LedgerRouter = express.Router()

LedgerRouter.get('/', authenticate, listLedger)
LedgerRouter.get('/item/:itemCode', authenticate, getLedgerByItem)
LedgerRouter.get('/:id', authenticate, getLedgerEntry)

export default LedgerRouter
