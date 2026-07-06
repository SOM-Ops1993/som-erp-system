import { removeScanFromSession } from '../../../../../services/inward-service.js'

const removeScan = async (req, res) => { 
  const { sessionId, packId } = req.params 
  try {

    const result = await removeScanFromSession(sessionId, decodeURIComponent(packId))
    return res.json(result)

  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}


export { removeScan }