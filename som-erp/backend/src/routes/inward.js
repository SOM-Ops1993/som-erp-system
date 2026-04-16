import {
  createInwardSession,
  scanPackForSession,
  removePackFromSession,
  getSessionState,
  submitInwardSession,
} from '../services/inward-service.js'
import { checkAndUnblockIndents } from './indent.js'
import prisma from '../db.js'

export default async function inwardRoutes(fastify) {

  // POST create scan session
  fastify.post('/session/create', async (req, reply) => {
    const { itemCode, lotNo, warehouse, createdBy } = req.body
    if (!itemCode || !lotNo || !warehouse) {
      return reply.status(400).send({ success: false, error: 'itemCode, lotNo, warehouse required' })
    }
    const result = await createInwardSession({ itemCode, lotNo, warehouse, createdBy })
    return reply.status(201).send({ success: true, ...result })
  })

  // POST scan a pack (add to session)
  fastify.post('/session/:sessionId/scan', async (req, reply) => {
    const { packId } = req.body
    if (!packId) return reply.status(400).send({ success: false, error: 'packId required' })
    const result = await scanPackForSession(req.params.sessionId, packId.trim())
    return { success: true, ...result }
  })

  // DELETE remove a pack from session (undo)
  fastify.delete('/session/:sessionId/scan/:packId', async (req, reply) => {
    const result = await removePackFromSession(req.params.sessionId, req.params.packId)
    return { success: true, ...result }
  })

  // GET session state
  fastify.get('/session/:sessionId', async (req, reply) => {
    const result = await getSessionState(req.params.sessionId)
    return { success: true, ...result }
  })

  // POST submit (commit) the session
  fastify.post('/session/:sessionId/submit', async (req, reply) => {
    const { transactedBy } = req.body || {}
    const result = await submitInwardSession(req.params.sessionId, transactedBy)

    // After successful inward, auto-unblock any PENDING_STOCK indents
    if (result && result.inwarded && result.inwarded.length > 0) {
      const itemCodes = [...new Set(result.inwarded.map((r) => r.itemCode))]
      try {
        const nowReady = await checkAndUnblockIndents(itemCodes)
        if (nowReady.length > 0) {
          return { success: true, ...result, nowReadyIndents: nowReady }
        }
      } catch { /* non-critical, don't fail the inward */ }
    }

    return { success: true, ...result }
  })

  // GET inward history (paginated)
  fastify.get('/', async (req, reply) => {
    const { page = 1, limit = 50, itemCode, warehouse, dateFrom, dateTo } = req.query
    const where = {}
    if (itemCode) where.itemCode = itemCode
    if (warehouse) where.warehouse = warehouse
    if (dateFrom || dateTo) {
      where.inwardDate = {}
      if (dateFrom) where.inwardDate.gte = new Date(dateFrom)
      if (dateTo) where.inwardDate.lte = new Date(dateTo)
    }

    const [data, total] = await Promise.all([
      prisma.inward.findMany({
        where,
        orderBy: { inwardTime: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.inward.count({ where }),
    ])

    return { success: true, data, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
  })

  // GET active sessions (for resuming)
  fastify.get('/sessions/active', async (req, reply) => {
    const sessions = await prisma.inwardSession.findMany({
      where: { sessionStatus: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: sessions }
  })
}
