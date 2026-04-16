import prisma from '../db.js'

export default async function sfgRoutes(fastify) {
  // List SFG entries — only show where ALL RM for that indent have been issued (indent = CLOSED)
  fastify.get('/', async (req) => {
    const { productCode, status, showAll } = req.query
    const where = {}
    if (productCode) where.productCode = productCode
    if (status) where.status = status

    // By default only show SFG whose indent is fully issued (CLOSED)
    // showAll=true bypasses this for admin/overview purposes
    if (showAll !== 'true') {
      const closedIndents = await prisma.indentMaster.findMany({
        where: { status: 'CLOSED' },
        select: { indentId: true }
      })
      const closedIds = closedIndents.map(i => i.indentId)
      if (closedIds.length === 0) return { success: true, data: [] }
      where.indentId = { in: closedIds }
    }

    const entries = await prisma.sfgMaster.findMany({
      where, orderBy: { createdAt: 'desc' }
    })
    return { success: true, data: entries }
  })

  // Update SFG entry
  fastify.put('/:sfgId', async (req, reply) => {
    const { formulatedQty, packedQty, sfgQty: manualSfgQty, remarks } = req.body
    const existing = await prisma.sfgMaster.findUnique({ where: { sfgId: req.params.sfgId } })
    if (!existing) return reply.status(404).send({ success: false, error: 'SFG entry not found' })

    const fq = formulatedQty !== undefined ? parseFloat(formulatedQty) : existing.formulatedQty
    const pq = packedQty !== undefined ? parseFloat(packedQty) : existing.packedQty

    // sfgQty can be manually overridden or auto-calculated
    let sfgBalance
    if (manualSfgQty !== undefined) {
      sfgBalance = parseFloat(manualSfgQty)
    } else {
      sfgBalance = Math.max(0, fq - pq)
    }

    const status = sfgBalance <= 0 && fq > 0 ? 'COMPLETE' : sfgBalance > 0 ? 'PARTIAL' : 'OPEN'

    const updated = await prisma.sfgMaster.update({
      where: { sfgId: req.params.sfgId },
      data: {
        formulatedQty: fq,
        packedQty: pq,
        sfgQty: sfgBalance,
        status,
        remarks: remarks !== undefined ? remarks : existing.remarks
      }
    })
    return { success: true, data: updated }
  })

  // Get a single SFG entry with its indent details
  fastify.get('/:sfgId', async (req, reply) => {
    const sfg = await prisma.sfgMaster.findUnique({ where: { sfgId: req.params.sfgId } })
    if (!sfg) return reply.status(404).send({ success: false, error: 'Not found' })
    const indent = await prisma.indentMaster.findUnique({
      where: { indentId: sfg.indentId },
      include: { details: true }
    })
    return { success: true, data: { ...sfg, indent } }
  })

  // Summary - total available SFG per product
  fastify.get('/summary', async () => {
    const entries = await prisma.sfgMaster.findMany({ where: { sfgQty: { gt: 0 } } })
    const summary = {}
    for (const e of entries) {
      if (!summary[e.productCode]) {
        summary[e.productCode] = { productCode: e.productCode, productName: e.productName, totalSfgQty: 0, entries: [] }
      }
      summary[e.productCode].totalSfgQty += e.sfgQty
      summary[e.productCode].entries.push(e)
    }
    return { success: true, data: Object.values(summary) }
  })
}
