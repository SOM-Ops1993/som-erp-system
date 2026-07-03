import { createInwardSession, scanPackForSession, submitInwardSession } from '../../../../../services/inward-service.js'
import { checkAndUnblockPendingIndents } from '../../../../production/indent/create/indent.controller.js'

export const createSession = async (req, res) => {
  try {
    const { itemCode, lotNo, warehouse } = req.body
    if (!itemCode || !lotNo || !warehouse)
      return res.status(400).json({ success: false, error: 'itemCode, lotNo, warehouse required', code: 'VALIDATION_ERROR' })
    const result = await createInwardSession({ itemCode, lotNo, warehouse })
    return res.status(201).json(result)
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}

export const scanPack = async (req, res) => {
  try {
    const result = await scanPackForSession(req.params.sessionId, req.body.packId, req.body.warehouse)
    return res.json(result)
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}

export const submitSession = async (req, res) => {
  try {
    const result = await submitInwardSession(req.params.sessionId, req.body.transactedBy)
    if (result?.inwarded?.length > 0) {
      const itemCodes = [...new Set(result.inwarded.map(r => r.itemCode).filter(Boolean))]
      if (itemCodes.length > 0) {
        try {
          const nowReady = await checkAndUnblockPendingIndents(itemCodes)
          if (nowReady.length > 0) {
            return res.json({ ...result, nowReadyIndents: nowReady })
          }
        } catch (unblockErr) {
          console.warn('checkAndUnblockPendingIndents error (non-critical):', unblockErr.message)
        }
      }
    }
    return res.json(result)
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}
