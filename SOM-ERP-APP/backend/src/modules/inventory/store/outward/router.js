import express from 'express'
import { authenticate, authorize } from '../../../../middleware/auth.js'
import { listOutward, getAvailablePacks, getPackDetail } from './get/outward.controller.js'
import { bomScan, bomManual, packReduction, stockAdjustment, bagLossAdjustment, warehouseTransfer, directIssue, bomDirectIssue } from './create/outward.controller.js'

const OutwardRouter = express.Router()
const storeOrAbove = authorize(['store'])
const managerOrAbove = authorize(['store'])

OutwardRouter.get('/', authenticate, listOutward)
OutwardRouter.get('/pack/:packId', authenticate, getPackDetail)
OutwardRouter.get('/available/:rmCode', authenticate, getAvailablePacks)
OutwardRouter.post('/bom-scan', authenticate, storeOrAbove, bomScan)
OutwardRouter.post('/bom-manual', authenticate, storeOrAbove, bomManual)
OutwardRouter.post('/pack-reduction', authenticate, storeOrAbove, packReduction)
OutwardRouter.post('/stock-adjustment', authenticate, managerOrAbove, stockAdjustment)
OutwardRouter.post('/loss-adjustment', authenticate, storeOrAbove, bagLossAdjustment)
OutwardRouter.post('/warehouse-transfer', authenticate, storeOrAbove, warehouseTransfer)
OutwardRouter.post('/direct-issue', authenticate, storeOrAbove, directIssue)
OutwardRouter.post('/bom-direct', authenticate, storeOrAbove, bomDirectIssue)

export default OutwardRouter
