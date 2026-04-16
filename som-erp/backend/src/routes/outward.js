import { bomIssuanceScan, packToContainer, stockReconAdjustment, warehouseTransfer } from '../services/outward-service.js'
import prisma from '../db.js'

export default async function outwardRoutes(fastify) {

  // POST BOM issuance scan
  fastify.post('/bom/scan', async (req, reply) => {
    const { indentId, rmCode, packId, transactedBy } = req.body
    if (!indentId || !rmCode || !packId) {
      return reply.status(400).send({ success: false, error: 'indentId, rmCode, packId required' })
    }
    const result = await bomIssuanceScan({ indentId, rmCode, scannedPackId: packId.trim(), transactedBy })
    return { success: true, ...result }
  })

  // POST pack size reduction
  fastify.post('/pack-reduction', async (req, reply) => {
    const { packId, qty, transactedBy } = req.body
    if (!packId || !qty) return reply.status(400).send({ success: false, error: 'packId, qty required' })
    const result = await packToContainer({ scannedPackId: packId.trim(), qtyToTransfer: qty, transactedBy })
    return { success: true, ...result }
  })

  // POST stock reconciliation
  fastify.post('/stock-adjustment', async (req, reply) => {
    const { itemCode, adjustmentQty, remarks, transactedBy } = req.body
    if (!itemCode || adjustmentQty === undefined) {
      return reply.status(400).send({ success: false, error: 'itemCode, adjustmentQty required' })
    }
    const result = await stockReconAdjustment({ itemCode, adjustmentQty, remarks, transactedBy })
    return { success: true, ...result }
  })

  // POST warehouse transfer
  fastify.post('/warehouse-transfer', async (req, reply) => {
    const { packId, toWarehouse, transactedBy } = req.body
    if (!packId || !toWarehouse) return reply.status(400).send({ success: false, error: 'packId, toWarehouse required' })
    const result = await warehouseTransfer({ scannedPackId: packId.trim(), toWarehouse, transactedBy })
    return { success: true, ...result }
  })

  // GET outward history (paginated)
  fastify.get('/', async (req, reply) => {
    const { page = 1, limit = 50, rmCode, type, indentId } = req.query
    const where = {}
    if (rmCode) where.rmCode = rmCode
    if (type) where.transactionType = type
    if (indentId) where.indentId = indentId

    const [data, total] = await Promise.all([
      prisma.outward.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.outward.count({ where }),
    ])

    return { success: true, data, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
  })
}
