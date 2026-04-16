import prisma from '../db.js'
import { generatePackBatch } from '../services/pack-generator.js'
import { generateLabelBuffer, generateBatchLabelBuffer } from '../services/label-service.js'

export default async function printMasterRoutes(fastify) {
  // Generate new packs
  fastify.post('/generate', async (req, reply) => {
    const { itemCode, itemName, numberOfBags, packQty, uom, supplier, invoiceNo, receivedDate } = req.body
    if (!itemCode || !itemName || !numberOfBags || !packQty || !uom)
      return reply.status(400).send({ success: false, error: 'itemCode, itemName, numberOfBags, packQty, uom are required' })
    const result = await generatePackBatch({ itemCode, itemName, numberOfBags: parseInt(numberOfBags), packQty: parseFloat(packQty), uom, supplier, invoiceNo, receivedDate })
    return reply.status(201).send({ success: true, data: result })
  })

  // List packs
  fastify.get('/', async (req) => {
    const { itemCode, lotNo, status, page = 1, limit = 50 } = req.query
    const where = {}
    if (itemCode) where.itemCode = itemCode
    if (lotNo) where.lotNo = lotNo
    if (status) where.status = status
    const [total, packs] = await Promise.all([
      prisma.printMaster.count({ where }),
      prisma.printMaster.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: parseInt(limit) }),
    ])
    return { success: true, data: packs, total, page: parseInt(page), limit: parseInt(limit) }
  })

  // Get single pack
  fastify.get('/:packId', async (req, reply) => {
    const pack = await prisma.printMaster.findUnique({ where: { packId: decodeURIComponent(req.params.packId) } })
    if (!pack) return reply.status(404).send({ success: false, error: 'Pack not found' })
    return { success: true, data: pack }
  })

  // Pending inward groups
  fastify.get('/pending/inward', async () => {
    const groups = await prisma.printMaster.groupBy({
      by: ['itemCode', 'itemName', 'lotNo'],
      where: { status: 'AWAITING_INWARD' },
      _count: { packId: true },
    })
    return { success: true, data: groups.map(g => ({ itemCode: g.itemCode, itemName: g.itemName, lotNo: g.lotNo, bagCount: g._count.packId })) }
  })

  // Next lot number preview
  fastify.get('/next-lot/:itemCode', async (req) => {
    const year = new Date().getFullYear()
    const existing = await prisma.lotSequence.findUnique({ where: { itemCode_year: { itemCode: req.params.itemCode, year } } })
    const nextSeq = (existing?.seq || 0) + 1
    return { success: true, data: { lotNo: `${year}-${String(nextSeq).padStart(3, '0')}` } }
  })

  // Single label PDF
  fastify.get('/label/:packId', async (req, reply) => {
    const pack = await prisma.printMaster.findUnique({ where: { packId: decodeURIComponent(req.params.packId) } })
    if (!pack) return reply.status(404).send({ success: false, error: 'Pack not found' })
    const buf = await generateLabelBuffer(pack)
    const safeName = (pack.itemName || pack.itemCode).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)
    const filename = `${safeName}-${pack.itemCode}-${pack.lotNo}.pdf`
    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `inline; filename="${filename}"`)
    return reply.send(buf)
  })

  // Batch labels for a lot
  fastify.get('/labels/lot/:itemCode/:lotNo', async (req, reply) => {
    const packs = await prisma.printMaster.findMany({
      where: { itemCode: req.params.itemCode, lotNo: decodeURIComponent(req.params.lotNo) },
      orderBy: { bagNo: 'asc' },
    })
    if (!packs.length) return reply.status(404).send({ success: false, error: 'No packs found' })
    const buf = await generateBatchLabelBuffer(packs)
    const sample = packs[0]
    const safeName = (sample.itemName || sample.itemCode).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)
    const filename = `labels-${safeName}-${sample.itemCode}-${sample.lotNo}.pdf`
    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `inline; filename="${filename}"`)
    return reply.send(buf)
  })
}
