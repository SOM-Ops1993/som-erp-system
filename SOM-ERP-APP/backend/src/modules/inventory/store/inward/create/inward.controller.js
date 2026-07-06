import { createInwardSession, scanPackForSession, submitInwardSession } from '../../../../../services/inward-service.js'
import { checkAndUnblockPendingIndents } from '../../../../production/indent/create/indent.controller.js'


const createSession = async (req, res) => {
  const { itemCode, lotNo, warehouse } = req.body
  try {

    if (!itemCode || !lotNo || !warehouse)
       return res.status(400).json({ success: false, error: 'itemCode, lotNo, warehouse required', code: 'VALIDATION_ERROR' })

    const result = await createInwardSession({ itemCode, lotNo, warehouse })
    return res.status(201).json(result)

  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}

const scanPack = async (req, res) => {
  const { sessionId } = req.params
  const { packId, warehouse } = req.body

  try {

    const result = await scanPackForSession(sessionId, packId, warehouse)
    return res.json(result)

  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}

const submitSession = async (req, res) => {
  const { sessionId } = req.params
  const { transactedBy } = req.body
  try {
    const result = await submitInwardSession(sessionId, transactedBy)

    if (result?.inwarded?.length > 0) {
      const itemCodes = [...new Set(result.inwarded.map(r => r.itemCode).filter(Boolean))]
      if (itemCodes.length > 0) {
        try { 
          const nowReady = await checkAndUnblockPendingIndents(itemCodes)
          if (nowReady.length > 0)  
             return res.json({ ...result, nowReadyIndents: nowReady })
           
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



export {
  createSession,
  scanPack,
  submitSession
}
