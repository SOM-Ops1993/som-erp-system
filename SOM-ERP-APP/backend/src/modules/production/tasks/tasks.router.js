import express from 'express'
import { authenticate } from '../../../middleware/auth.js'
import {
  listTasks, createTask, updateTask, deleteTask, sendSchedule,
  searchSalesOrders, getSalesOrderItems, searchProducts, listEquipmentByPlant,
} from './tasks.controller.js'

const TasksRouter = express.Router()

TasksRouter.get   ('/plan-tasks',                 authenticate, listTasks)
TasksRouter.post  ('/plan-tasks',                 authenticate, createTask)
TasksRouter.put   ('/plan-tasks/:id',             authenticate, updateTask)
TasksRouter.delete('/plan-tasks/:id',             authenticate, deleteTask)
TasksRouter.post  ('/plan-tasks/send-schedule',   authenticate, sendSchedule)

// Lookup endpoints (for form autocomplete)
TasksRouter.get('/plan-tasks/search/sales-orders',       authenticate, searchSalesOrders)
TasksRouter.get('/plan-tasks/search/sales-order-items',  authenticate, getSalesOrderItems)
TasksRouter.get('/plan-tasks/search/products',           authenticate, searchProducts)
TasksRouter.get('/plan-tasks/search/equipment',          authenticate, listEquipmentByPlant)

export default TasksRouter
