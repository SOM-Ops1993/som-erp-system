import prisma from '../db.js'

function generateIndentId() {
  const year = new Date().getFullYear()
  const seq = String(Math.floor(Math.random() * 90000) + 10000)
  return `IND-${year}-${seq}`
}

async function generateBatchNo(productCode) {
  const year = new Date().getFullYear()
  const prefix = productCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)
  const count = await prisma.indentMaster.count({
    where: {
      productCode,
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  })
  return `${prefix}-${year}-${String(count + 1).padStart(3, '0')}`
}

async function checkStockForProduct(productCode, batchSize) {
  const recipe = await prisma.recipeDb.findMany({ where: { productCode } })
  const batch = parseFloat(batchSize)
  const checks = await Promise.all(
    recipe.map(async (r) => {
      const requiredQty = Number(r.qtyPerUnit) * batch
      const ledger = await prisma.stockLedger.findFirst({
        where: { itemCode: r.rmCode },
        orderBy: [{ timestamp: 'desc' }, { ledgerId: 'desc' }],
        select: { balance: true },
      })
      const available = Number(ledger?.balance || 0)
      return {
        rmCode: r.rmCode,
        rmName: r.rmName,
        requiredQty,
        availableQty: available,
        ok: available >= requiredQty,
        shortfall: available < requiredQty ? requiredQty - available : 0,
        uom: r.uom,
      }
    })
  )
  return checks
}

// Auto-unblock PENDING_STOCK indents after inward
export async function checkAndUnblockIndents(itemCodes) {
  const pendingIndents = await prisma.indentMaster.findMany({
    where: { status: 'PENDING_STOCK' },
    include: { details: true },
  })

  const nowReady = []
  for (const indent of pendingIndents) {
    const relatedRmCodes = indent.details.map((d) => d.rmCode)
    const hasRelated = relatedRmCodes.some((c) => itemCodes.includes(c))
    if (!hasRelated) continue

    // Re-check all stocks for this indent
    const checks = await checkStockForProduct(indent.productCode, indent.batchSize)
    const allOk = checks.every((c) => c.ok)
    if (allOk) {
      await prisma.indentMaster.update({
        where: { indentId: indent.indentId },
        data: { status: 'OPEN' },
      })
      nowReady.push(indent.indentId)
    }
  }
  return nowReady
}

export default async function indentRoutes(fastify) {

  // GET stock check before creating indent
  fastify.get('/stock-check', async (req, reply) => {
    const { productCode, batchSize } = req.query
    if (!productCode || !batchSize) {
      return reply.status(400).send({ success: false, error: 'productCode and batchSize required' })
    }
    const checks = await checkStockForProduct(productCode, batchSize)
    const allOk = checks.every((c) => c.ok)
    return { success: true, allOk, checks }
  })

  // GET auto-generated batch no for a product
  fastify.get('/next-batch-no', async (req, reply) => {
    const { productCode } = req.query
    if (!productCode) return reply.status(400).send({ success: false, error: 'productCode required' })
    const batchNo = await generateBatchNo(productCode)
    return { success: true, batchNo }
  })

  // GET available SFG qty for a product (sum of sfgQty for non-exhausted entries)
  fastify.get('/sfg-available', async (req, reply) => {
    const { productCode } = req.query
    if (!productCode) return reply.status(400).send({ success: false, error: 'productCode required' })
    const sfgRecords = await prisma.sfgMaster.findMany({
      where: { productCode, status: { notIn: ['COMPLETE'] } },
      select: { sfgId: true, indentId: true, sfgQty: true, batchUnit: true, status: true },
    })
    const totalSfg = sfgRecords.reduce((sum, r) => sum + Number(r.sfgQty), 0)
    return { success: true, totalSfg, records: sfgRecords }
  })

  // POST create indent
  fastify.post('/', async (req, reply) => {
    const { productCode, productName, batchSize, batchUnit, plant, diNo, createdBy } = req.body
    if (!productCode || !batchSize) {
      return reply.status(400).send({ success: false, error: 'productCode, batchSize required' })
    }

    // Load BOM
    const recipe = await prisma.recipeDb.findMany({
      where: { productCode },
      orderBy: { rmName: 'asc' },
    })
    if (recipe.length === 0) {
      return reply.status(400).send({ success: false, error: `No BOM found for product ${productCode}` })
    }

    const batch = parseFloat(batchSize)

    // Run stock check
    const stockChecks = await checkStockForProduct(productCode, batchSize)
    const allStockOk = stockChecks.every((c) => c.ok)

    const indentId = generateIndentId()
    const batchNo = await generateBatchNo(productCode)

    // Get plant/equipment from product master if not provided
    let resolvedPlant = plant || null
    let resolvedEquipment = null
    if (!resolvedPlant) {
      const pm = await prisma.productMaster.findUnique({ where: { productCode } })
      if (pm) {
        resolvedPlant = pm.plant || null
        resolvedEquipment = pm.equipment || null
      }
    }

    const indent = await prisma.$transaction(async (tx) => {
      const master = await tx.indentMaster.create({
        data: {
          indentId,
          productCode,
          productName: productName || recipe[0].productName,
          batchSize: batch,
          batchUnit: batchUnit || recipe[0].batchUnit,
          plant: resolvedPlant,
          diNo: batchNo, // Auto batch no stored in diNo field
          createdBy: createdBy || null,
          status: allStockOk ? 'OPEN' : 'PENDING_STOCK',
        },
      })

      await tx.indentDetails.createMany({
        data: recipe.map((r) => ({
          indentId,
          rmCode: r.rmCode,
          rmName: r.rmName,
          qtyPerUnit: r.qtyPerUnit,
          requiredQty: Number(r.qtyPerUnit) * batch,
          issuedQty: 0,
          status: 'PENDING',
        })),
      })

      // Auto-create SFG entry
      await tx.sfgMaster.create({
        data: {
          indentId,
          productCode,
          productName: productName || recipe[0].productName,
          targetQty: batch,
          batchUnit: batchUnit || recipe[0].batchUnit,
          status: 'OPEN',
        },
      })

      return master
    })

    return reply.status(201).send({
      success: true,
      indentId,
      batchNo,
      stockOk: allStockOk,
      status: indent.status,
      stockChecks: allStockOk ? [] : stockChecks.filter((c) => !c.ok),
      detailCount: recipe.length,
    })
  })

  // GET all indents
  fastify.get('/', async (req, reply) => {
    const { status = 'OPEN,PARTIAL,PENDING_STOCK', page = 1, limit = 30 } = req.query
    const statuses = status.split(',')

    const [data, total] = await Promise.all([
      prisma.indentMaster.findMany({
        where: { status: { in: statuses } },
        include: {
          details: {
            select: {
              rmCode: true, rmName: true, requiredQty: true, issuedQty: true, status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.indentMaster.count({ where: { status: { in: statuses } } }),
    ])

    const enriched = data.map((indent) => ({
      ...indent,
      details: indent.details.map((d) => ({
        ...d,
        balanceQty: Number(d.requiredQty) - Number(d.issuedQty),
      })),
    }))

    return { success: true, data: enriched, total, page: parseInt(page) }
  })

  // GET single indent
  fastify.get('/:indentId', async (req, reply) => {
    const indent = await prisma.indentMaster.findUnique({
      where: { indentId: req.params.indentId },
      include: { details: true },
    })
    if (!indent) return reply.status(404).send({ success: false, error: 'Indent not found' })

    const details = await Promise.all(
      indent.details.map(async (d) => {
        const lastLedger = await prisma.stockLedger.findFirst({
          where: { itemCode: d.rmCode },
          orderBy: [{ timestamp: 'desc' }, { ledgerId: 'desc' }],
          select: { balance: true },
        })
        return {
          ...d,
          balanceQty: Number(d.requiredQty) - Number(d.issuedQty),
          currentStock: Number(lastLedger?.balance || 0),
        }
      })
    )

    // Get SFG entry for this indent
    const sfg = await prisma.sfgMaster.findUnique({ where: { indentId: indent.indentId } })

    return { success: true, data: { ...indent, details, sfg } }
  })

  // GET unique products from recipe_db
  fastify.get('/products/list', async (req, reply) => {
    const products = await prisma.$queryRaw`
      SELECT DISTINCT r.product_code, r.product_name, r.batch_unit,
             pm.plant, pm.equipment
      FROM recipe_db r
      LEFT JOIN product_master pm ON pm.product_code = r.product_code
      ORDER BY r.product_name
    `
    return { success: true, data: products }
  })

  // PATCH update indent status
  fastify.patch('/:indentId/status', async (req, reply) => {
    const { status } = req.body
    const updated = await prisma.indentMaster.update({
      where: { indentId: req.params.indentId },
      data: { status },
    })
    return { success: true, data: updated }
  })
}
