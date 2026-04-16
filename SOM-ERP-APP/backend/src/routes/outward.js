import prisma from '../db.js'

export default async function outwardRoutes(fastify) {

  // ── BOM ISSUANCE via SCAN ────────────────────────────────────────────────
  fastify.post('/bom/scan', async (req, reply) => {
    const { indentId, rmCode, packId } = req.body
    if (!indentId || !rmCode || !packId)
      return reply.status(400).send({ success: false, error: 'indentId, rmCode, packId required' })
    try {
      const result = await _issuePack({ indentId, rmCode, packId })
      return result
    } catch (e) {
      return reply.status(400).send({ success: false, error: e.message })
    }
  })

  // ── BOM ISSUANCE MANUAL (specify exact qty from a pack) ─────────────────
  fastify.post('/bom/manual', async (req, reply) => {
    const { indentId, rmCode, packId, qtyToIssue } = req.body
    if (!indentId || !rmCode || !packId || !qtyToIssue)
      return reply.status(400).send({ success: false, error: 'indentId, rmCode, packId, qtyToIssue required' })
    try {
      const result = await _issuePack({ indentId, rmCode, packId, forcedQty: parseFloat(qtyToIssue) })
      return result
    } catch (e) {
      return reply.status(400).send({ success: false, error: e.message })
    }
  })

  // ── GET AVAILABLE PACKS FOR AN RM CODE ──────────────────────────────────
  fastify.get('/available-packs/:rmCode', async (req, reply) => {
    const packs = await prisma.packBalance.findMany({
      where: { itemCode: req.params.rmCode, remainingQty: { gt: 0 } },
      orderBy: { packId: 'asc' }
    })
    const packIds = packs.map(p => p.packId)
    const printMasters = await prisma.printMaster.findMany({ where: { packId: { in: packIds } } })
    const pmMap = Object.fromEntries(printMasters.map(p => [p.packId, p]))
    const data = packs.map(p => ({
      packId: p.packId,
      itemCode: p.itemCode,
      remainingQty: p.remainingQty,
      totalQty: p.totalQty,
      itemName: pmMap[p.packId]?.itemName || '',
      lotNo: pmMap[p.packId]?.lotNo || '',
      bagNo: pmMap[p.packId]?.bagNo || 0,
      supplier: pmMap[p.packId]?.supplier || '',
    }))
    return { success: true, data }
  })

  // ── PACK → CONTAINER ────────────────────────────────────────────────────
  fastify.post('/pack-reduction', async (req, reply) => {
    const { packId, qty } = req.body
    if (!packId || !qty) return reply.status(400).send({ success: false, error: 'packId and qty required' })
    try {
      const packBalance = await prisma.packBalance.findUnique({ where: { packId } })
      if (!packBalance) return reply.status(404).send({ success: false, error: 'Pack not found' })
      const deduct = parseFloat(qty)
      if (deduct > packBalance.remainingQty) return reply.status(400).send({ success: false, error: 'Qty exceeds pack balance' })
      const pack = await prisma.printMaster.findUnique({ where: { packId } })
      const itemCode = pack.itemCode
      const containerId = `${pack.itemName.replace(/[^a-zA-Z0-9]/g,'').slice(0,3).toUpperCase()}-${itemCode}-CONT001`
      await prisma.$transaction(async (tx) => {
        await tx.packBalance.update({ where: { packId }, data: { remainingQty: packBalance.remainingQty - deduct } })
        await tx.containerMaster.upsert({
          where: { itemCode },
          create: { containerId, itemCode, itemName: pack.itemName, capacity: 10000, currentQty: deduct, uom: pack.uom },
          update: { currentQty: { increment: deduct } }
        })
        await tx.outward.create({ data: { sourceId: packId, sourceType: 'PACK_REDUCTION', rmCode: itemCode, qtyIssued: deduct } })
        const prevLedger = await tx.stockLedger.findFirst({ where: { itemCode }, orderBy: { timestamp: 'desc' } })
        await tx.stockLedger.create({ data: { itemCode, sourceId: containerId, transactionType: 'PACK_TO_CONTAINER', inQty: deduct, balance: (prevLedger?.balance || 0), reference: `Pack ${packId} → Container` } })
      })
      return { success: true, deducted: deduct, containerId }
    } catch (e) {
      return reply.status(400).send({ success: false, error: e.message })
    }
  })

  // ── STOCK ADJUSTMENT ────────────────────────────────────────────────────
  fastify.post('/stock-adjustment', async (req, reply) => {
    const { itemCode, adjustmentQty, remarks } = req.body
    if (!itemCode || adjustmentQty === undefined || !remarks || remarks.length < 5)
      return reply.status(400).send({ success: false, error: 'itemCode, adjustmentQty, and remarks (min 5 chars) required' })
    try {
      const adj = parseFloat(adjustmentQty)
      const prevLedger = await prisma.stockLedger.findFirst({ where: { itemCode }, orderBy: { timestamp: 'desc' } })
      const newBal = (prevLedger?.balance || 0) + adj
      await prisma.stockLedger.create({
        data: {
          itemCode, sourceId: `ADJ-${Date.now()}`, transactionType: 'STOCK_RECON',
          inQty: adj > 0 ? adj : 0, outQty: adj < 0 ? Math.abs(adj) : 0,
          balance: newBal, reference: remarks
        }
      })
      return { success: true, newBalance: newBal }
    } catch (e) {
      return reply.status(400).send({ success: false, error: e.message })
    }
  })

  // ── LIST HISTORY ─────────────────────────────────────────────────────────
  fastify.get('/', async (req) => {
    const { itemCode, page = 1, limit = 50 } = req.query
    const where = itemCode ? { rmCode: itemCode } : {}
    const [total, rows] = await Promise.all([
      prisma.outward.count({ where }),
      prisma.outward.findMany({ where, orderBy: { timestamp: 'desc' }, skip: (page-1)*parseInt(limit), take: parseInt(limit) })
    ])
    return { success: true, data: rows, total, page: parseInt(page), limit: parseInt(limit) }
  })
}

// ── SHARED ISSUE LOGIC ───────────────────────────────────────────────────────
async function _issuePack({ indentId, rmCode, packId, forcedQty }) {
  const detail = await prisma.indentDetails.findFirst({ where: { indentId, rmCode } })
  if (!detail) throw new Error('RM not found in indent')
  if (detail.balanceQty <= 0) throw new Error('RM already fully issued')

  const packBalance = await prisma.packBalance.findUnique({ where: { packId } })
  if (!packBalance) throw new Error('Pack not inwarded or not found')
  if (packBalance.remainingQty <= 0) throw new Error('Pack exhausted (no remaining qty)')
  if (packBalance.itemCode !== rmCode) throw new Error(`Pack item code (${packBalance.itemCode}) does not match RM (${rmCode})`)

  const deduct = forcedQty !== undefined
    ? Math.min(forcedQty, packBalance.remainingQty, detail.balanceQty)
    : Math.min(packBalance.remainingQty, detail.balanceQty)

  if (deduct <= 0) throw new Error('Nothing to deduct')

  await prisma.$transaction(async (tx) => {
    await tx.packBalance.update({ where: { packId }, data: { remainingQty: packBalance.remainingQty - deduct } })
    await tx.indentDetails.update({
      where: { id: detail.id },
      data: { issuedQty: detail.issuedQty + deduct, balanceQty: detail.balanceQty - deduct }
    })
    await tx.outward.create({ data: { indentId, sourceId: packId, sourceType: 'BOM_ISSUANCE', rmCode, qtyIssued: deduct } })
    const prevLedger = await tx.stockLedger.findFirst({ where: { itemCode: rmCode }, orderBy: { timestamp: 'desc' } })
    const newBal = (prevLedger?.balance || 0) - deduct
    await tx.stockLedger.create({ data: { itemCode: rmCode, sourceId: packId, transactionType: 'BOM_ISSUANCE', outQty: deduct, balance: newBal, reference: `Indent ${indentId}` } })

    // Check if all details are now fully issued → close indent + auto-fill SFG
    const allDetails = await tx.indentDetails.findMany({ where: { indentId } })
    const allDone = allDetails.every(d => d.balanceQty <= 0 || (d.rmCode === rmCode && detail.balanceQty - deduct <= 0))
    if (allDone) {
      const indent = await tx.indentMaster.update({ where: { indentId }, data: { status: 'CLOSED' } })
      // Auto-fill SFG formulatedQty with targetQty as default (user can edit later)
      await tx.sfgMaster.updateMany({
        where: { indentId, formulatedQty: 0 },
        data: { formulatedQty: indent.batchSize, sfgQty: indent.batchSize, status: 'PARTIAL' }
      })
    }
  })

  return { success: true, deducted: deduct, remaining: detail.balanceQty - deduct }
}
