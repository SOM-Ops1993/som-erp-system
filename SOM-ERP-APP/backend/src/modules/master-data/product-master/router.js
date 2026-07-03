import express from 'express'
import { authenticate, authorize } from '../../../middleware/auth.js'
import { listProducts, getProduct } from './get/product-master.controller.js'
import { createProduct } from './create/product-master.controller.js'
import { updateProduct } from './update/product-master.controller.js'
import { deleteProduct } from './delete/product-master.controller.js'

const ProductMasterRouter = express.Router()
const adminOnly = authorize(['admin'])

ProductMasterRouter.get('/products', authenticate, listProducts)
ProductMasterRouter.get('/products/:productCode', authenticate, getProduct)
ProductMasterRouter.post('/products', authenticate, adminOnly, createProduct)
ProductMasterRouter.put('/products/:productCode', authenticate, adminOnly, updateProduct)
ProductMasterRouter.delete('/products/:productCode', authenticate, adminOnly, deleteProduct)

export default ProductMasterRouter
