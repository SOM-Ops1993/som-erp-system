import express from 'express'
import { authenticate, authorize } from '../../../../middleware/auth.js'
import { listContainers, getContainer, getContainerLabel } from './get/containers.controller.js'
import { createContainer, fillContainer, issueFromContainer } from './create/containers.controller.js'

const ContainersRouter = express.Router()
const storeOrAbove = authorize(['store'])

ContainersRouter.get('/', authenticate, listContainers)
ContainersRouter.post('/', authenticate, storeOrAbove, createContainer)
ContainersRouter.get('/:containerId/label', getContainerLabel)
ContainersRouter.get('/:containerId', authenticate, getContainer)
ContainersRouter.post('/:containerId/fill', authenticate, storeOrAbove, fillContainer)
ContainersRouter.post('/:containerId/issue', authenticate, storeOrAbove, issueFromContainer)

export default ContainersRouter
