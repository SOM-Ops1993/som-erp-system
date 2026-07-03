import express from 'express'
import { authenticate } from '../../../middleware/auth.js'
import { listStock, listContainers, getItemStock, getRmHistory, getDashboardStats } from './get/stock.controller.js'

const StockRouter = express.Router()

StockRouter.get('/dashboard', authenticate, getDashboardStats)
StockRouter.get('/', authenticate, listStock)
StockRouter.get('/containers', authenticate, listContainers)
StockRouter.get('/rm/:itemCode/history', authenticate, getRmHistory)
StockRouter.get('/:itemCode', authenticate, getItemStock)

export default StockRouter
