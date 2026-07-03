import express from 'express'
import { authenticate, authorize } from '../../../middleware/auth.js'
import { listLocations, getLocation, getLocationLabel, getBulkStockSummary } from './get/bulk-location.controller.js'
import { createLocation, bulkInward, bulkOutward } from './create/bulk-location.controller.js'
import { deleteLocation } from './delete/bulk-location.controller.js'

const BulkLocationRouter = express.Router()
const storeOrAbove = authorize(['store'])
const managerOrAbove = authorize(['store'])

BulkLocationRouter.get('/summary', authenticate, getBulkStockSummary)
BulkLocationRouter.get('/locations', authenticate, listLocations)
BulkLocationRouter.post('/locations', authenticate, managerOrAbove, createLocation)
BulkLocationRouter.get('/locations/:locationId/label', getLocationLabel)
BulkLocationRouter.get('/locations/:locationId', authenticate, getLocation)
BulkLocationRouter.delete('/locations/:locationId', authenticate, managerOrAbove, deleteLocation)
BulkLocationRouter.post('/inward', authenticate, storeOrAbove, bulkInward)
BulkLocationRouter.post('/outward', authenticate, storeOrAbove, bulkOutward)

export default BulkLocationRouter
