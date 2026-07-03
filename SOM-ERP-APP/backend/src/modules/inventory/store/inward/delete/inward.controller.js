import { removeScanFromSession } from '../../../../../services/inward-service.js'

export const removeScan = async (req, res) => {
  try {
    const result = await removeScanFromSession(req.params.sessionId, decodeURIComponent(req.params.packId))
    return res.json(result)
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}
