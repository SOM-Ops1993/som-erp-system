import express from 'express'
import { authenticate } from '../../../middleware/auth.js'
import { listGrn, getGrnDetail } from './get/grn.controller.js'

const GrnRouter = express.Router()

GrnRouter.get('/', authenticate, listGrn)
GrnRouter.get('/detail', authenticate, getGrnDetail)

export default GrnRouter
