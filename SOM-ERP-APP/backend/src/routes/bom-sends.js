// routes/bom-sends.js
// Planning → BOM Issuance: pack-level FIFO issuance with scanner & manual mode
import prisma from '../db.js'

async function nextSendId() {
  const yymm = new Date().toISOString().slice(2, 7).replace('-', '')
  const prefix = `BOM-${yymm}-`
  const last = await prisma.bomSend.findFirst({
    where: { sendId: { startsWith: prefix } },
    orderBy: { sendId: 'desc' },
  })
  const seq = last ? parseInt(last.sendId.slice(-3)) + 1 : 1
  return prefix + String(seq).padStart(3, '0')
}

// Helper: how much has been issued for a specific rmCode against a sendId
async function getIssuedQty(sendId, rmCode) {
  const rows = await prisma.stockLedger.findMany({
    where: {
      transactionType: 'BOM_ISSUANCE',
      reference:       { contains: sendId },
      itemCode:        rmCode,
    },
  })
  return rows.reduce((s, r) => s + (r.outQty || 0), 0)
}

// Helper: build FIFO pack list for an rmCode
async function getFifoPacks(rmCode) {
  const packs = await prisma.packBalance.findMany({
    where:   { itemCode: rmCode, remainingQty: { gt: 0 } },
  })
  if (!packs.length) return []

  const packIds = packs.map(p => p.packId)
  const masters = await prisma.printMaster.findMany({
    where: { packId: { in: packIds } },
  })
  const pmMap = Object.fromEntries(masters.map(p => [p.packId, p]))

  return packs
    .map(p => ({
      packId:       p.packId,
      remainingQty: p.remainingQty,
      totalQty:     p.totalQty,
      lotNo:        pmMap[p.packId]?.lotNo        || '',
      bagNo:        pmMap[p.packId]?.bagNo        || 0,
      supplier:     pmMap[p.packId]?.supplier     || '',
      receivedDate: pmMap[p.packId]?.receivedDate || null,
      uom:          pmMap[p.packId]?.uom          || 'KG',
    }))
    .sort((a, b) => {
      // FIFO: oldest receivedDate first; fallback to packId
      if (a.receivedDate && b.receivedDate)
        return new Date(a.receivedDate) - new Date(b.receivedDate)
      return a.packId < b.packId ? -1 : 1
    })
}

// ── Routes ────────────────────────────────────────────────────────────────────
export default async function bomSendRoutes(fastify) {

  // GET /api/bom-sends
  fastify.get('/', async (req) => {
    const { status, planId, section } = req.query
    const where = {}
    if (status && status !== 'ALL') where.status = status
    if (planId)  where.planId      = planId
    if (section) where.sectionType = section

    const sends = await prisma.bomSend.findMany({ where, orderBy: { sentAt: 'desc' } })

    const enriched = await Promise.all(sends.map(async (s) => {
      try {
        const plan = await prisma.productionPlan.findUnique({
          where:  { id: s.planId },
          select: { plannedDate: true, planId: true },
        })
        return { ...s, plannedDate: plan?.plannedDate || null, planCode: plan?.planId || null }
      } catch { return s }
    }))

    return { success: true, data: enriched }
  })

  // GET /api/bom-sends/:id
  // Returns BOM + recipe lines with FIFO packs + already-issued qtys
  fastify.get('/:id', async (req, reply) => {
    const send = await prisma.bomSend.findUnique({ where: { id: req.params.id } })
    if (!send) return reply.status(404).send({ success: false, error: 'BOM not found' })

    let plannedDate = null, planCode = null
    try {
      const plan = await prisma.productionPlan.findUnique({
        where:  { id: send.planId },
        select: { plannedDate: true, planId: true },
      })
      plannedDate = plan?.plannedDate || null
      planCode    = plan?.planId     || null
    } catch {}

    const recipe = await prisma.recipeDb.findMany({
      where:   { productCode: send.productCode },
      orderBy: { roleType: 'asc' },
    })

    // Build each line with issued qty + FIFO packs
    const lines = await Promise.all(recipe.map(async (r) => {
      const requiredQty  = parseFloat((r.qtyPerUnit * send.totalQty).toFixed(3))
      const issuedQty    = parseFloat((await getIssuedQty(send.sendId, r.rmCode)).toFixed(3))
      const remainingQty = parseFloat(Math.max(0, requiredQty - issuedQty).toFixed(3))
      const fifoPacks    = await getFifoPacks(r.rmCode)
      const totalAvail   = parseFloat(fifoPacks.reduce((s, p) => s + p.remainingQty, 0).toFixed(3))
      const shortage     = totalAvail < remainingQty

      return {
        rmCode:       r.rmCode,
        rmName:       r.rmName,
        roleType:     r.roleType,
        uom:          r.uom,
        qtyPerUnit:   r.qtyPerUnit,
        requiredQty,
        issuedQty,
        remainingQty,
        totalAvail,
        shortage,
        status: remainingQty <= 0                  ? 'ISSUED'
               : issuedQty   > 0                   ? 'PARTIAL'
               : shortage    && totalAvail === 0    ? 'STOCKOUT'
               : shortage                           ? 'SHORT'
               : 'PENDING',
        fifoPacks,
      }
    }))

    return { success: true, data: { ...send, plannedDate, planCode, lines } }
  })

  // POST /api/bom-sends  — create BOM (called from Planning on save)
  fastify.post('/', async (req, reply) => {
    const {
      indentId, planId, productCode, productName,
      batchNo, diNo, sectionType, bomType,
      totalQty, uom, sentBy, remarks,
    } = req.body

    if (!planId || !productName || !diNo || !bomType || !totalQty)
      return reply.status(400).send({ success: false, error: 'planId, productName, diNo, bomType, totalQty are required' })

    const sendId = await nextSendId()
    const send = await prisma.bomSend.create({
      data: {
        sendId,
        indentId:    indentId    || null,
        planId,
        productCode: productCode || '',
        productName,
        batchNo:     batchNo     || '',
        diNo,
        sectionType: sectionType || null,
        bomType,
        totalQty:    parseFloat(totalQty),
        uom:         uom         || 'KG',
        status:      'PENDING',
        sentBy:      sentBy      || null,
        remarks:     remarks     || null,
      },
    })
    return { success: true, data: send }
  })

  // POST /api/bom-sends/:id/issue-pack
  // Core issuance: deduct qty from a specific pack (scanned or manually selected)
  // Body: { rmCode, packId, qty? }
  //   qty is optional — if omitted, issues as much as possible (min of pack remaining & item remaining)
  fastify.post('/:id/issue-pack', async (req, reply) => {
    const send = await prisma.bomSend.findUnique({ where: { id: req.params.id } })
    if (!send) return reply.status(404).send({ success: false, error: 'BOM not found' })
    if (['ISSUED','CANCELLED'].includes(send.status))
      return reply.status(400).send({ success: false, error: `BOM already ${send.status}` })

    const { rmCode, packId, qty } = req.body
    if (!rmCode || !packId)
      return reply.status(400).send({ success: false, error: 'rmCode and packId are required' })

    // Validate pack
    const pack = await prisma.packBalance.findUnique({ where: { packId } })
    if (!pack)
      return reply.status(404).send({ success: false, error: `Pack not found: ${packId}` })
    if (pack.itemCode.toUpperCase() !== rmCode.toUpperCase())
      return reply.status(400).send({ success: false, error: `Pack item (${pack.itemCode}) does not match RM (${rmCode})` })
    if (pack.remainingQty <= 0)
      return reply.status(400).send({ success: false, error: 'Pack is empty (no remaining qty)' })

    // How much is still needed for this RM
    const recipe = await prisma.recipeDb.findFirst({
      where: { productCode: send.productCode, rmCode },
    })
    if (!recipe)
      return reply.status(404).send({ success: false, error: `RM ${rmCode} not found in recipe for ${send.productCode}` })

    const requiredQty  = parseFloat((recipe.qtyPerUnit * send.totalQty).toFixed(3))
    const issuedSoFar  = await getIssuedQty(send.sendId, rmCode)
    const remainingNeeded = parseFloat(Math.max(0, requiredQty - issuedSoFar).toFixed(3))

    if (remainingNeeded <= 0)
      return reply.status(400).send({ success: false, error: 'This material is already fully issued' })

    // Calculate deduction
    const requested = qty ? parseFloat(qty) : null
    const deduct = parseFloat(
      Math.min(
        requested ?? pack.remainingQty,
        pack.remainingQty,
        remainingNeeded
      ).toFixed(3)
    )

    if (deduct <= 0)
      return reply.status(400).send({ success: false, error: 'Nothing to deduct' })

    // Transactional: update PackBalance + write StockLedger
    await prisma.$transaction(async (tx) => {
      await tx.packBalance.update({
        where: { packId },
        data:  { remainingQty: parseFloat((pack.remainingQty - deduct).toFixed(3)) },
      })

      const prevLedger = await tx.stockLedger.findFirst({
        where:   { itemCode: rmCode },
        orderBy: { timestamp: 'desc' },
      })
      await tx.stockLedger.create({
        data: {
          itemCode:        rmCode,
          sourceId:        packId,
          transactionType: 'BOM_ISSUANCE',
          outQty:          deduct,
          balance:         parseFloat(((prevLedger?.balance ?? 0) - deduct).toFixed(3)),
          reference:       `${send.sendId} | ${send.productName} | DI:${send.diNo}`,
        },
      })
    })

    // Check overall BOM completion and update status
    const allRecipe = await prisma.recipeDb.findMany({ where: { productCode: send.productCode } })
    let allDone = true, anyDone = false
    for (const r of allRecipe) {
      const req = parseFloat((r.qtyPerUnit * send.totalQty).toFixed(3))
      const iss = await getIssuedQty(send.sendId, r.rmCode)
      if (iss > 0) anyDone = true
      if (iss < req * 0.999) allDone = false
    }

    await prisma.bomSend.update({
      where: { id: send.id },
      data: {
        status:   allDone ? 'ISSUED' : anyDone ? 'PICKED' : 'PENDING',
        issuedAt: allDone ? new Date() : undefined,
        pickedAt: anyDone && !allDone ? (send.pickedAt ?? new Date()) : undefined,
      },
    })

    const newItemRemaining = parseFloat(Math.max(0, remainingNeeded - deduct).toFixed(3))
    const newPackRemaining = parseFloat((pack.remainingQty - deduct).toFixed(3))

    return {
      success: true,
      deducted:       deduct,
      packRemaining:  newPackRemaining,
      itemRemaining:  newItemRemaining,
      itemFullyDone:  newItemRemaining <= 0,
      bomFullyDone:   allDone,
    }
  })

  // PATCH /api/bom-sends/:id/status
  fastify.patch('/:id/status', async (req, reply) => {
    const { status, remarks } = req.body
    const allowed = ['PENDING','PICKED','READY_TO_ISSUE','ISSUED','CANCELLED']
    if (!allowed.includes(status))
      return reply.status(400).send({ success: false, error: `status must be one of: ${allowed.join(', ')}` })
    const data = { status }
    if (remarks !== undefined) data.remarks  = remarks
    if (status === 'PICKED')   data.pickedAt = new Date()
    if (status === 'ISSUED')   data.issuedAt = new Date()
    const send = await prisma.bomSend.update({ where: { id: req.params.id }, data })
    return { success: true, data: send }
  })

  // POST /api/bom-sends/:id/issue-to-section
  // Called by Stores when ALL components are ticked → notifies Section Incharge
  fastify.post('/:id/issue-to-section', async (req, reply) => {
    const send = await prisma.bomSend.findUnique({ where: { id: req.params.id } })
    if (!send) return reply.status(404).send({ success: false, error: 'BOM not found' })
    if (send.issuedToSectionAt)
      return reply.status(400).send({ success: false, error: 'Already issued to section' })

    const { issuedBy } = req.body

    const updated = await prisma.bomSend.update({
      where: { id: req.params.id },
      data: {
        issuedToSectionAt: new Date(),
        status: 'ISSUED',
        issuedAt: new Date(),
      }
    })

    // Notify section incharge + production manager
    const msg = `All materials for ${send.productName} | DI: ${send.diNo} | Batch Qty: ${send.totalQty} ${send.uom} have been picked and issued to your section by Stores. Please acknowledge receipt.`
    const roles = ['PRODUCTION', 'ADMIN', 'PRODUCTION_MANAGER']
    for (const role of roles) {
      await prisma.notification.create({
        data: {
          title:     `BOM Issued to Section — ${send.productName}`,
          message:   msg,
          role,
          section:   send.sectionType || null,
          notifType: 'IN_APP',
          link:      `/bom-issuance`,
        }
      }).catch(() => {})
    }

    return { success: true, data: updated }
  })

  // POST /api/bom-sends/:id/acknowledge
  // Called by Section Incharge to confirm receipt of materials
  fastify.post('/:id/acknowledge', async (req, reply) => {
    const send = await prisma.bomSend.findUnique({ where: { id: req.params.id } })
    if (!send) return reply.status(404).send({ success: false, error: 'BOM not found' })
    if (!send.issuedToSectionAt)
      return reply.status(400).send({ success: false, error: 'BOM has not been issued to section yet' })
    if (send.acknowledgedAt)
      return reply.status(400).send({ success: false, error: 'Already acknowledged' })

    const { acknowledgedBy } = req.body

    const updated = await prisma.bomSend.update({
      where: { id: req.params.id },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedBy: acknowledgedBy || null,
      }
    })

    // Notify stores that section has acknowledged
    await prisma.notification.create({
      data: {
        title:     `BOM Acknowledged — ${send.productName}`,
        message:   `Section has acknowledged receipt of materials for ${send.productName} | DI: ${send.diNo}. Handover loop complete.`,
        role:      'STORE_MANAGER',
        notifType: 'IN_APP',
        link:      `/bom-issuance`,
      }
    }).catch(() => {})

    return { success: true, data: updated }
  })

  // DELETE /api/bom-sends/:id
  fastify.delete('/:id', async (req) => {
    await prisma.bomSend.delete({ where: { id: req.params.id } })
    return { success: true }
  })
}
