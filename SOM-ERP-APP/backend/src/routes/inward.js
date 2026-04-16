import prisma from '../db.js'
import { createInwardSession, scanPackForSession, removeScanFromSession, submitInwardSession } from '../services/inward-service.js'
import { checkAndUnblockPendingIndents } from './indent.js'

export default async function inwardRoutes(fastify) {
  fastify.post('/session/create', async (req, reply) => {
    try {
      const { itemCode, lotNo, warehouse } = req.body
      if (!itemCode || !lotNo || !warehouse)
        return reply.status(400).send({ success: false, error: 'itemCode, lotNo, warehouse required' })
      const result = await createInwardSession({ itemCode, lotNo, warehouse })
      return reply.status(201).send(result)
    } catch (e) {
      return reply.status(400).send({ success: false, error: e.message })
    }
  })

  fastify.get('/session/:sessionId', async (req, reply) => {
    try {
      const session = await prisma.inwardSession.findUnique({ where: { sessionId: req.params.sessionId } })
      if (!session) return reply.status(404).send({ success: false, error: 'Session not found' })
      const allPacks = await prisma.printMaster.findMany({
        where: { itemCode: session.itemCode, lotNo: session.lotNo },
        orderBy: { bagNo: 'asc' }
      })
      const pendingPackIds = allPacks.filter(p => !session.scannedPackIds.includes(p.packId)).map(p => p.packId)
      return { success: true, data: { ...session, pendingPackIds } }
    } catch (e) {
      return reply.status(400).send({ success: false, error: e.message })
    }
  })

  fastify.post('/session/:sessionId/scan', async (req, reply) => {
    try {
      const result = await scanPackForSession(req.params.sessionId, req.body.packId)
      return result
    } catch (e) {
      return reply.status(400).send({ success: false, error: e.message })
    }
  })

  fastify.delete('/session/:sessionId/scan/:packId', async (req, reply) => {
    try {
      const result = await removeScanFromSession(req.params.sessionId, decodeURIComponent(req.params.packId))
      return result
    } catch (e) {
      return reply.status(400).send({ success: false, error: e.message })
    }
  })

  fastify.post('/session/:sessionId/submit', async (req, reply) => {
    try {
      const result = await submitInwardSession(req.params.sessionId, req.body.transactedBy)

      // After successful inward, auto-unblock any PENDING_STOCK indents
      if (result?.inwarded?.length > 0) {
        const itemCodes = [...new Set(result.inwarded.map(r => r.itemCode).filter(Boolean))]
        if (itemCodes.length > 0) {
          try {
            const nowReady = await checkAndUnblockPendingIndents(itemCodes)
            if (nowReady.length > 0) {
              return { ...result, nowReadyIndents: nowReady }
            }
          } catch (unblockErr) {
            fastify.log.warn('checkAndUnblockPendingIndents error (non-critical):', unblockErr.message)
          }
        }
      }

      return result
    } catch (e) {
      return reply.status(400).send({ success: false, error: e.message })
    }
  })

  fastify.get('/sessions/active', async () => {
    const sessions = await prisma.inwardSession.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, data: sessions }
  })

  fastify.get('/', async (req) => {
    const { itemCode, page = 1, limit = 50 } = req.query
    const where = itemCode ? { itemCode } : {}
    const [total, records] = await Promise.all([
      prisma.inward.count({ where }),
      prisma.inward.findMany({ where, orderBy: { inwardTime: 'desc' }, skip: (page - 1) * limit, take: parseInt(limit) })
    ])
    return { success: true, data: records, total }
  })
}
