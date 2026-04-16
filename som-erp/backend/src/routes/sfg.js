import prisma from '../db.js'

export default async function sfgRoutes(fastify) {

  // GET list all SFG entries
  fastify.get('/', async (req, reply) => {
    const { productCode, status, page = 1, limit = 30 } = req.query
    const where = {}
    if (productCode) where.productCode = productCode
    if (status) where.status = { in: status.split(',') }

    const [data, total] = await Promise.all([
      prisma.sfgMaster.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.sfgMaster.count({ where }),
    ])
    return { success: true, data, total }
  })

  // GET summary — available SFG qty per product
  fastify.get('/summary', async (req, reply) => {
    const rows = await prisma.sfgMaster.groupBy({
      by: ['productCode', 'productName', 'batchUnit'],
      where: { status: { notIn: ['COMPLETE'] } },
      _sum: { sfgQty: true, formulatedQty: true, packedQty: true, targetQty: true },
    })
    const data = rows.map((r) => ({
      productCode: r.productCode,
      productName: r.productName,
      batchUnit: r.batchUnit,
      totalSfgQty: Number(r._sum.sfgQty || 0),
      totalFormulated: Number(r._sum.formulatedQty || 0),
      totalPacked: Number(r._sum.packedQty || 0),
      totalTarget: Number(r._sum.targetQty || 0),
    }))
    return { success: true, data }
  })

  // GET single SFG entry
  fastify.get('/:sfgId', async (req, reply) => {
    const sfg = await prisma.sfgMaster.findUnique({ where: { sfgId: req.params.sfgId } })
    if (!sfg) return reply.status(404).send({ success: false, error: 'SFG not found' })
    return { success: true, data: sfg }
  })

  // PUT update SFG — formulated/packed qty
  fastify.put('/:sfgId', async (req, reply) => {
    const { formulatedQty, packedQty, remarks, status } = req.body
    const sfg = await prisma.sfgMaster.findUnique({ where: { sfgId: req.params.sfgId } })
    if (!sfg) return reply.status(404).send({ success: false, error: 'SFG not found' })

    const newFormulated = formulatedQty !== undefined ? parseFloat(formulatedQty) : Number(sfg.formulatedQty)
    const newPacked = packedQty !== undefined ? parseFloat(packedQty) : Number(sfg.packedQty)
    const newSfgQty = Math.max(0, newFormulated - newPacked)

    // Determine auto status
    let newStatus = status || sfg.status
    if (!status) {
      if (newSfgQty > 0 && newPacked === 0) newStatus = 'FORMULATING'
      else if (newPacked > 0 && newPacked >= newFormulated) newStatus = 'COMPLETE'
      else if (newPacked > 0) newStatus = 'PACKING'
    }

    const updated = await prisma.sfgMaster.update({
      where: { sfgId: req.params.sfgId },
      data: {
        formulatedQty: newFormulated,
        packedQty: newPacked,
        sfgQty: newSfgQty,
        status: newStatus,
        remarks: remarks !== undefined ? remarks : sfg.remarks,
      },
    })
    return { success: true, data: updated }
  })
}
