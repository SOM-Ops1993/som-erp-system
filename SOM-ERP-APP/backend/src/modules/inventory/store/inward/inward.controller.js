import prisma from '../../../../db.js'
import { createInwardSession, scanPackForSession, removeScanFromSession, submitInwardSession } from '../../../../services/inward-service.js'
import { checkAndUnblockPendingIndents } from '../../../production/indent/indent.controller.js'

export async function createSession(req, res) {
  try {
    const { itemCode, lotNo, warehouse } = req.body
    if (!itemCode || !lotNo || !warehouse)
      return res.status(400).json({ success: false, error: 'itemCode, lotNo, warehouse required' })
    const result = await createInwardSession({ itemCode, lotNo, warehouse })
    return res.status(201).json(result)
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message })
  }
}

export async function getSession(req, res) {
  try {
    const session = await prisma.inwardSession.findUnique({ where: { sessionId: req.params.sessionId } })
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' })
    const allPacks = await prisma.printMaster.findMany({
      where: { itemCode: session.itemCode, lotNo: session.lotNo },
      orderBy: { bagNo: 'asc' }
    })
    const pendingPackIds = allPacks.filter(p => !session.scannedPackIds.includes(p.packId)).map(p => p.packId)
    return res.json({ success: true, data: { ...session, pendingPackIds } })
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message })
  }
}

export async function scanPack(req, res) {
  try {
    const result = await scanPackForSession(req.params.sessionId, req.body.packId, req.body.warehouse)
    return res.json(result)
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message })
  }
}

export async function removeScan(req, res) {
  try {
    const result = await removeScanFromSession(req.params.sessionId, decodeURIComponent(req.params.packId))
    return res.json(result)
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message })
  }
}

export async function submitSession(req, res) {
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
    return res.status(400).json({ success: false, error: e.message })
  }
}

export async function listActiveSessions(req, res) {
  try {
    const sessions = await prisma.inwardSession.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' }
    })
    return res.json({ success: true, data: sessions })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listInward(req, res) {
  try {
    const { itemCode, page = 1, limit = 50 } = req.query
    const where = itemCode ? { itemCode } : {}
    const [total, records] = await Promise.all([
      prisma.inward.count({ where }),
      prisma.inward.findMany({ where, orderBy: { inwardTime: 'desc' }, skip: (page - 1) * limit, take: parseInt(limit) })
    ])
    return res.json({ success: true, data: records, total })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
