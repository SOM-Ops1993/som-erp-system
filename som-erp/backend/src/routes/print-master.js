import prisma from '../db.js'
import { generatePackBatch, getPacksForLot, getPendingInwardGroups } from '../services/pack-generator.js'
import { previewNextLotNo } from '../services/lot-generator.js'
import { generateLabelBuffer, generateBatchLabelBuffer } from '../services/label-service.js'

export default async function printMasterRoutes(fastify) {

  // GET next lot preview (for UI display before generate)
  fastify.get('/next-lot/:itemCode', async (req, reply) => {
    const nextLot = await previewNextLotNo(req.params.itemCode)
    return { success: true, nextLotNo: nextLot }
  })

  // POST generate pack batch (creates print_master records)
  fastify.post('/generate', async (req, reply) => {
    const { itemCode, numBags, packQty, uom, supplier, invoiceNo, supplierBatch, receivedDate, remarks } = req.body

    if (!itemCode || !numBags || !packQty) {
      return reply.status(400).send({ success: false, error: 'itemCode, numBags, packQty are required' })
    }
    if (numBags < 1 || numBags > 999) {
      return reply.status(400).send({ success: false, error: 'numBags must be between 1 and 999' })
    }

    const result = await generatePackBatch({
      itemCode, numBags: parseInt(numBags), packQty: parseFloat(packQty),
      uom, supplier, invoiceNo, supplierBatch, receivedDate, remarks,
    })

    return reply.status(201).send({
      success: true,
      lotNo: result.lotNo,
      totalPacks: result.packs.length,
      firstPackId: result.packs[0].packId,
      lastPackId: result.packs[result.packs.length - 1].packId,
      packs: result.packs,
    })
  })

  // GET single pack info
  fastify.get('/:packId', async (req, reply) => {
    const pack = await prisma.printMaster.findUnique({
      where: { packId: req.params.packId },
      include: { inward: true, packBalance: true },
    })
    if (!pack) return reply.status(404).send({ success: false, error: 'Pack not found' })
    return { success: true, data: pack }
  })

  // GET all packs for a lot
  fastify.get('/lot/:itemCode/:lotNo', async (req, reply) => {
    const packs = await getPacksForLot(req.params.itemCode, req.params.lotNo)
    return { success: true, data: packs, count: packs.length }
  })

  // GET pending inward groups
  fastify.get('/pending/inward', async (req, reply) => {
    const groups = await getPendingInwardGroups()
    return { success: true, data: groups }
  })

  // GET single label PDF (100mm × 50mm)
  fastify.get('/label/:packId', async (req, reply) => {
    const pack = await prisma.printMaster.findUnique({ where: { packId: req.params.packId } })
    if (!pack) return reply.status(404).send({ success: false, error: 'Pack not found' })

    const pdfBuffer = await generateLabelBuffer(pack)
    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `inline; filename="${pack.packId}.pdf"`)
    return reply.send(pdfBuffer)
  })

  // GET batch labels PDF for a lot
  fastify.get('/labels/lot/:itemCode/:lotNo', async (req, reply) => {
    const packs = await getPacksForLot(req.params.itemCode, req.params.lotNo)
    if (packs.length === 0) return reply.status(404).send({ success: false, error: 'No packs found' })

    const pdfBuffer = await generateBatchLabelBuffer(packs)
    const filename = `labels-${req.params.itemCode}-${req.params.lotNo}.pdf`
    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `attachment; filename="${filename}"`)
    return reply.send(pdfBuffer)
  })

  // GET paginated print master list
  fastify.get('/', async (req, reply) => {
    const { page = 1, limit = 50, itemCode, status, search } = req.query
    const where = {}
    if (itemCode) where.itemCode = itemCode
    if (status) where.status = status
    if (search) where.OR = [
      { packId: { contains: search, mode: 'insensitive' } },
      { itemName: { contains: search, mode: 'insensitive' } },
    ]

    const [data, total] = await Promise.all([
      prisma.printMaster.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: { packBalance: { select: { remainingQty: true, isExhausted: true } } },
      }),
      prisma.printMaster.count({ where }),
    ])

    return { success: true, data, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
  })
}
