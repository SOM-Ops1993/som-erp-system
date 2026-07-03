import express from 'express'
import { authenticate, authorize } from '../../middleware/auth.js'
import ProductMasterRouter from './product-master/router.js'
import EquipmentMasterRouter from './equipment-master/router.js'
import ErpMastersRouter from './erp-masters/router.js'
import PackingMasterRouter from './packing-master/router.js'
import RmMasterRouter from './rm-master/router.js'

const MasterDataRouter = express.Router()

MasterDataRouter.use('/rm', RmMasterRouter)
MasterDataRouter.use('/', ProductMasterRouter)
MasterDataRouter.use('/', EquipmentMasterRouter)
MasterDataRouter.use('/', ErpMastersRouter)
MasterDataRouter.use('/', PackingMasterRouter)

export default MasterDataRouter
