import express from 'express'
import { authenticate, authorize } from '../../../../middleware/auth.js'
import { generatePacks } from './generate-qr/print-master.controller.js'
import { plantReturn }   from './plant-return/plant-return.controller.js'

const PrintMasterRouter = express.Router()
const storeOrAbove = authorize(['store'])

PrintMasterRouter.post('/generate',     authenticate, storeOrAbove, generatePacks)
PrintMasterRouter.post('/plant-return', authenticate, storeOrAbove, plantReturn)

export default PrintMasterRouter
