import prisma from '../db.js'

export default async function trackerRoutes(fastify) {

  // List indents — returns all when diNo is empty, or filters when diNo is provided
  fastify.get('/', async (req, reply) => {
    const { diNo, page = 1, limit = 200 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const where = diNo && diNo.trim()
      ? { diNo: { contains: diNo.trim(), mode: 'insensitive' } }
      : {}

    const [indents, total] = await Promise.all([
      prisma.indentMaster.findMany({
        where,
        select: {
          indentId: true,
          productCode: true,
          productName: true,
          batchNo: true,
          batchSize: true,
          diNo: true,
          status: true,
          plant: true,
          equipment: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.indentMaster.count({ where })
    ])

    return { success: true, data: indents, total }
  })

  // Full A-Z transaction detail for one indent
  fastify.get('/detail', async (req, reply) => {
    const { indentId } = req.query
    if (!indentId) return reply.status(400).send({ success: false, error: 'indentId required' })

    // Core indent with all details
    const indent = await prisma.indentMaster.findUnique({
      where: { indentId },
      include: { details: true }
    })
    if (!indent) return reply.status(404).send({ success: false, error: 'Indent not found' })

    // SFG linked to this indent
    const sfg = await prisma.sfgMaster.findFirst({ where: { indentId } })

    // All outward transactions for this indent (BOM issuances)
    const outwardRecords = await prisma.outward.findMany({
      where: { indentId },
      orderBy: { timestamp: 'asc' }
    })

    // Pack (PrintMaster) details for each outward
    const packIds = [...new Set(outwardRecords.map(o => o.sourceId).filter(Boolean))]
    const packs = packIds.length > 0
      ? await prisma.printMaster.findMany({ where: { packId: { in: packIds } } })
      : []
    const packMap = Object.fromEntries(packs.map(p => [p.packId, p]))

    // Build per-RM history — use IndentDetails as the authoritative RM list
    const rmHistory = indent.details.map(d => {
      const txns = outwardRecords
        .filter(o => o.rmCode === d.rmCode)
        .map(o => ({
          outwardId: o.id,
          packId: o.sourceId,          // frontend reads tx.packId
          qtyIssued: o.qtyIssued,      // frontend reads tx.qtyIssued
          timestamp: o.timestamp,
          sourceType: o.sourceType,
          remarks: o.remarks,
          packDetails: packMap[o.sourceId] || null  // frontend reads tx.packDetails
        }))

      const totalIssued = txns.reduce((s, t) => s + Number(t.qtyIssued), 0)
      return {
        rmCode: d.rmCode,
        rmName: d.rmName,
        requiredQty: d.requiredQty,
        issuedQty: d.issuedQty,
        balanceQty: d.balanceQty,
        fullyIssued: Number(d.balanceQty) <= 0,
        transactions: txns,
        totalIssued
      }
    })

    const fullyIssuedRms = rmHistory.filter(r => r.fullyIssued).length

    return {
      success: true,
      data: {
        indent: {
          indentId: indent.indentId,
          productCode: indent.productCode,
          productName: indent.productName,
          diNo: indent.diNo,
          batchNo: indent.batchNo,
          batchSize: indent.batchSize,
          plant: indent.plant,
          equipment: indent.equipment,
          status: indent.status,
          createdAt: indent.createdAt
        },
        sfg,
        rmHistory,     // ← key matches what frontend uses: detail.rmHistory
        summary: {
          totalRms: indent.details.length,
          fullyIssuedRms,
          totalOutwardTxns: outwardRecords.length,
          formulatedQty: sfg?.formulatedQty || 0,
          packedQty: sfg?.packedQty || 0,
          sfgBalance: sfg?.sfgQty || 0,
        }
      }
    }
  })
}
