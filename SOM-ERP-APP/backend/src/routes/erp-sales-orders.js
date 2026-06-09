import prisma from '../db.js'

// Secret token for Google Sheets webhook (set SHEET_WEBHOOK_SECRET in .env)
const WEBHOOK_SECRET = process.env.SHEET_WEBHOOK_SECRET || 'som-sheet-sync-2024'

// ── Status flow ───────────────────────────────────────────────────────────────
// PENDING → PLANNED → UNDER_PRODUCTION → PACKED → IN_INVENTORY → READY_TO_DISPATCH → DISPATCHED

async function nextSoId() {
  const year = new Date().getFullYear()
  const seq = await prisma.soSequence.upsert({
    where: { year },
    create: { year, seq: 1 },
    update: { seq: { increment: 1 } },
  })
  return `SO-${year}-${String(seq.seq).padStart(4, '0')}`
}

export default async function salesOrderRoutes(fastify) {

  // ── GET /api/erp/sales-orders  ───────────────────────────────────────────
  // Query: company, status, priority, diNo, search, from, to
  fastify.get('/', async (req) => {
    const { company, priority, diNo, search, from, to } = req.query

    const where = {}
    if (company)  where.company     = company
    if (priority) where.priority    = priority
    if (diNo)     where.diNo        = { contains: diNo, mode: 'insensitive' }
    if (search)   where.customerName = { contains: search, mode: 'insensitive' }
    if (from || to) {
      where.estimatedDispatchDate = {}
      if (from) where.estimatedDispatchDate.gte = new Date(from)
      if (to)   where.estimatedDispatchDate.lte = new Date(to)
    }

    const orders = await prisma.salesOrder.findMany({
      where,
      include: { items: { orderBy: { lineNo: 'asc' } } },
      orderBy: [{ priority: 'asc' }, { estimatedDispatchDate: 'asc' }],
    })
    return { success: true, data: orders }
  })

  // ── GET /api/erp/sales-orders/companies  ─────────────────────────────────
  fastify.get('/companies', async () => {
    const defaults = ['DVS', 'SOM', 'AL-IPL', 'AL-PTE']
    // Upsert defaults (safe against duplicates)
    for (const code of defaults) {
      await prisma.companyMaster.upsert({
        where:  { code },
        create: { code, name: code },
        update: {},
      }).catch(() => {})
    }
    const all = await prisma.companyMaster.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } })
    return { success: true, data: all }
  })

  // ── POST /api/erp/sales-orders/companies  ────────────────────────────────
  // Add a new company on-the-fly from the frontend
  fastify.post('/companies', async (req, reply) => {
    const { code, name } = req.body || {}
    if (!code) return reply.status(400).send({ success: false, error: 'code is required' })
    const c = await prisma.companyMaster.upsert({
      where:  { code: code.toUpperCase() },
      create: { code: code.toUpperCase(), name: name || code.toUpperCase() },
      update: { isActive: true },
    })
    return reply.status(201).send({ success: true, data: c })
  })

  // ── GET /api/erp/sales-orders/:id  ───────────────────────────────────────
  fastify.get('/:id', async (req, reply) => {
    const order = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
      include: { items: { orderBy: { lineNo: 'asc' } } }
    })
    if (!order) return reply.status(404).send({ success: false, error: 'Order not found' })
    return { success: true, data: order }
  })

  // ── POST /api/erp/sales-orders  ──────────────────────────────────────────
  fastify.post('/', async (req, reply) => {
    const {
      company, diNo, customerName, orderType, orderReceivedDate,
      priority, estimatedDispatchDate, invoiceNo, invoiceDate,
      transportName, salesStaff, dispatchedBy, remarks, items
    } = req.body

    if (!company || !diNo || !customerName || !orderType)
      return reply.status(400).send({ success: false, error: 'company, diNo, customerName, orderType are required' })

    if (!items || !Array.isArray(items) || items.length === 0)
      return reply.status(400).send({ success: false, error: 'At least one order item is required' })

    const soId = await nextSoId()

    const order = await prisma.salesOrder.create({
      data: {
        soId,
        company,
        diNo,
        customerName,
        orderType,
        orderReceivedDate: orderReceivedDate ? new Date(orderReceivedDate) : new Date(),
        priority: priority || 'MODERATE',
        estimatedDispatchDate: estimatedDispatchDate ? new Date(estimatedDispatchDate) : (orderReceivedDate ? new Date(orderReceivedDate) : new Date()),
        invoiceNo:    invoiceNo    || null,
        invoiceDate:  invoiceDate  ? new Date(invoiceDate) : null,
        transportName: transportName || null,
        salesStaff:   salesStaff   || null,
        dispatchedBy: dispatchedBy || null,
        remarks:      remarks      || null,
        items: {
          create: items.map((item, idx) => ({
            lineNo:              idx + 1,
            customerProductName: item.customerProductName,
            inhouseProductName:  item.inhouseProductName  || null,
            inhouseProductCode:  item.inhouseProductCode  || null,
            activeSpecs:         item.activeSpecs         || null,
            activeIngredient:    item.activeIngredient    || null,
            carrier:             item.carrier             || null,
            batchNo:             item.batchNo             || null,
            sectionName:         item.sectionName         || null,
            totalQty:            parseFloat(item.totalQty),
            totalUom:            item.totalUom            || 'KG',
            unitQty:             item.unitQty ? parseFloat(item.unitQty) : null,
            unitUom:             item.unitUom             || null,
            unitPackType:        item.unitPackType        || null,
            packingType:         item.packingType         || null,
            unitsPerCS:          item.unitsPerCS ? parseInt(item.unitsPerCS) : null,
            totalCS:             item.totalCS ? parseInt(item.totalCS) : null,
            labelType:           item.labelType           || null,
            mrp:                 item.mrp ? parseFloat(item.mrp) : null,
            mfgDate:             item.mfgDate ? new Date(item.mfgDate) : null,
            expDate:             item.expDate ? new Date(item.expDate) : null,
            status:              'PENDING',
          }))
        }
      },
      include: { items: true }
    })

    // ── SFG availability check — inform planner of ready stock ───────────────
    const sfgAvailability = []
    for (const item of order.items) {
      if (item.inhouseProductCode) {
        const sfg = await prisma.sfgMaster.findFirst({
          where: { productCode: item.inhouseProductCode, sfgQty: { gt: 0 } },
          orderBy: { createdAt: 'desc' },
          select: { sfgId: true, productCode: true, productName: true, sfgQty: true }
        })
        if (sfg) {
          sfgAvailability.push({
            productCode: item.inhouseProductCode,
            productName: item.inhouseProductName || sfg.productName,
            sfgQty:      sfg.sfgQty,
            sfgId:       sfg.sfgId,
            orderedQty:  item.totalQty,
            uom:         item.totalUom || 'KG',
          })
        }
      }
    }

    return { success: true, data: order, sfgAvailability }
  })

  // ── PUT /api/erp/sales-orders/:id  ───────────────────────────────────────
  // Update header-level fields
  fastify.put('/:id', async (req, reply) => {
    const {
      company, diNo, customerName, orderType, orderReceivedDate,
      priority, estimatedDispatchDate, invoiceNo, invoiceDate,
      transportName, salesStaff, dispatchedBy, remarks
    } = req.body

    const order = await prisma.salesOrder.update({
      where: { id: req.params.id },
      data: {
        ...(company               !== undefined && { company }),
        ...(diNo                  !== undefined && { diNo }),
        ...(customerName          !== undefined && { customerName }),
        ...(orderType             !== undefined && { orderType }),
        ...(priority              !== undefined && { priority }),
        ...(orderReceivedDate     !== undefined && { orderReceivedDate: new Date(orderReceivedDate) }),
        ...(estimatedDispatchDate !== undefined && { estimatedDispatchDate: new Date(estimatedDispatchDate) }),
        ...(invoiceNo             !== undefined && { invoiceNo: invoiceNo || null }),
        ...(invoiceDate           !== undefined && { invoiceDate: invoiceDate ? new Date(invoiceDate) : null }),
        ...(transportName         !== undefined && { transportName: transportName || null }),
        ...(salesStaff            !== undefined && { salesStaff: salesStaff || null }),
        ...(dispatchedBy          !== undefined && { dispatchedBy: dispatchedBy || null }),
        ...(remarks               !== undefined && { remarks: remarks || null }),
      },
      include: { items: { orderBy: { lineNo: 'asc' } } }
    })
    return { success: true, data: order }
  })

  // ── PATCH /api/erp/sales-orders/item/:itemId  ────────────────────────────
  // Update a single line item (including status)
  fastify.patch('/item/:itemId', async (req, reply) => {
    const allowed = [
      'customerProductName','inhouseProductName','inhouseProductCode',
      'activeSpecs','activeIngredient','carrier','batchNo','sectionName',
      'totalQty','totalUom','unitQty','unitUom','unitPackType','packingType',
      'unitsPerCS','totalCS','labelType','mrp','mfgDate','expDate','status'
    ]
    const data = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (['totalQty','unitQty','mrp'].includes(key) && req.body[key] !== null)
          data[key] = parseFloat(req.body[key])
        else if (['totalCS','unitsPerCS'].includes(key) && req.body[key] !== null)
          data[key] = parseInt(req.body[key])
        else if (['mfgDate','expDate'].includes(key))
          data[key] = req.body[key] ? new Date(req.body[key]) : null
        else
          data[key] = req.body[key] || null
      }
    }

    const item = await prisma.salesOrderItem.update({
      where: { id: req.params.itemId },
      data,
    })
    return { success: true, data: item }
  })

  // ── PATCH /api/erp/sales-orders/dispatch/:id  ────────────────────────────
  // Fill dispatch details on an existing order (invoice, transport, staff, etc.)
  // Kept separate from the main PUT so the create/edit form stays clean.
  fastify.patch('/dispatch/:id', async (req, reply) => {
    const { invoiceNo, invoiceDate, transportName, salesStaff, dispatchedBy, dispatchRemarks } = req.body
    const order = await prisma.salesOrder.update({
      where: { id: req.params.id },
      data: {
        ...(invoiceNo       !== undefined && { invoiceNo:       invoiceNo       || null }),
        ...(invoiceDate     !== undefined && { invoiceDate:     invoiceDate ? new Date(invoiceDate) : null }),
        ...(transportName   !== undefined && { transportName:   transportName   || null }),
        ...(salesStaff      !== undefined && { salesStaff:      salesStaff      || null }),
        ...(dispatchedBy    !== undefined && { dispatchedBy:    dispatchedBy    || null }),
        ...(dispatchRemarks !== undefined && { remarks:         dispatchRemarks || null }),
      },
      include: { items: { orderBy: { lineNo: 'asc' } } },
    })
    return { success: true, data: order }
  })

  // ── DELETE /api/erp/sales-orders/:id  ────────────────────────────────────
  fastify.delete('/:id', async (req) => {
    await prisma.salesOrder.delete({ where: { id: req.params.id } })
    return { success: true }
  })

  // ── DELETE /api/erp/sales-orders/item/:itemId  ───────────────────────────
  fastify.delete('/item/:itemId', async (req) => {
    await prisma.salesOrderItem.delete({ where: { id: req.params.itemId } })
    return { success: true }
  })

  // ── GET /api/erp/sales-orders/summary/dashboard  ─────────────────────────
  // Quick counts per status for a dashboard widget
  fastify.get('/summary/dashboard', async () => {
    const statuses = ['PENDING','PLANNED','UNDER_PRODUCTION','PACKED','IN_INVENTORY','READY_TO_DISPATCH','DISPATCHED']
    const counts = await Promise.all(
      statuses.map(s => prisma.salesOrderItem.count({ where: { status: s } }).then(c => ({ status: s, count: c })))
    )
    const urgentPending = await prisma.salesOrder.count({
      where: { priority: { in: ['URGENT','VERY_URGENT'] }, items: { some: { status: { in: ['PENDING','PLANNED'] } } } }
    })
    return { success: true, data: { statusCounts: counts, urgentPending } }
  })

  // ── GET /api/erp/sales-orders/sync-log  ──────────────────────────────────
  // Last 20 sheet sync attempts
  fastify.get('/sync-log', async () => {
    const logs = await prisma.sheetSyncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return { success: true, data: logs }
  })

  // ── POST /api/erp/sales-orders/sheet-import  ─────────────────────────────
  // Called by Google Apps Script webhook OR manual trigger from frontend.
  // Body: { secret, trigger, rows: [ { diNo, company, customerName, ... } ] }
  // Each row represents ONE line item. Rows with same diNo are grouped into
  // one SalesOrder. Fully idempotent — re-sending same row is a no-op.
  fastify.post('/sheet-import', async (req, reply) => {
    const { secret, trigger = 'WEBHOOK', rows } = req.body || {}

    // ── Auth ────────────────────────────────────────────────────────────────
    if (secret !== WEBHOOK_SECRET)
      return reply.status(401).send({ success: false, error: 'Invalid webhook secret' })

    // MANUAL trigger with empty rows = just a ping / log-only sync
    if (!Array.isArray(rows) || rows.length === 0) {
      if (trigger === 'MANUAL') {
        await prisma.sheetSyncLog.create({
          data: { trigger, rowsIn: 0, imported: 0, skipped: 0, errors: null }
        }).catch(() => {})
        return { success: true, imported: 0, skipped: 0, message: 'Manual sync logged (no rows — configure Apps Script to push rows for automatic import)' }
      }
      return reply.status(400).send({ success: false, error: 'rows array is required' })
    }

    let imported = 0, skipped = 0
    const errors = []

    for (const row of rows) {
      try {
        const {
          diNo, company, customerName, orderType = 'DOMESTIC',
          orderDate, etd, priority = 'MODERATE',
          customerProductName, inhouseProductName, inhouseProductCode,
          activeSpecs, activeIngredient, carrier, sectionName,
          totalQty, totalUom = 'KG',
          unitQty, unitUom, unitPackType, packingType,
          unitsPerCS, totalCS, labelType, mrp, salesStaff, remarks,
        } = row

        // Validate required fields
        if (!diNo || !company || !customerName || !etd || !customerProductName || !inhouseProductName || !totalQty) {
          errors.push({ row: diNo || '?', error: 'Missing required fields (diNo, company, customerName, etd, customerProductName, inhouseProductName, totalQty)' })
          skipped++
          continue
        }

        // ── Find or create SalesOrder by diNo ──────────────────────────────
        let order = await prisma.salesOrder.findFirst({ where: { diNo: diNo.trim() } })

        if (!order) {
          const soId = await nextSoId()
          order = await prisma.salesOrder.create({
            data: {
              soId,
              company:              company.trim(),
              diNo:                 diNo.trim(),
              customerName:         customerName.trim(),
              orderType:            orderType.trim().toUpperCase(),
              orderReceivedDate:    orderDate ? new Date(orderDate) : new Date(),
              priority:             priority.trim().toUpperCase(),
              estimatedDispatchDate: new Date(etd),
              salesStaff:           salesStaff || null,
              remarks:              remarks    || null,
            },
          })
        }

        // ── Check if this exact line item already exists (idempotent) ───────
        // Match on customerProductName + inhouseProductName to avoid duplicates
        const existing = await prisma.salesOrderItem.findFirst({
          where: {
            salesOrderId:        order.id,
            customerProductName: customerProductName.trim(),
            inhouseProductName:  inhouseProductName.trim(),
          },
        })

        if (existing) {
          skipped++
          continue  // same product already on this order, skip
        }

        // ── Count existing items to assign lineNo ───────────────────────────
        const lineCount = await prisma.salesOrderItem.count({ where: { salesOrderId: order.id } })

        await prisma.salesOrderItem.create({
          data: {
            salesOrderId:        order.id,
            lineNo:              lineCount + 1,
            customerProductName: customerProductName.trim(),
            inhouseProductName:  inhouseProductName.trim(),
            inhouseProductCode:  inhouseProductCode || null,
            activeSpecs:         activeSpecs        || null,
            activeIngredient:    activeIngredient   || null,
            carrier:             carrier            || null,
            sectionName:         sectionName        || null,
            totalQty:            parseFloat(totalQty),
            totalUom:            totalUom.trim(),
            unitQty:             unitQty  ? parseFloat(unitQty)  : null,
            unitUom:             unitUom  || null,
            unitPackType:        unitPackType  || null,
            packingType:         packingType   || null,
            unitsPerCS:          unitsPerCS ? parseInt(unitsPerCS) : null,
            totalCS:             totalCS  ? parseInt(totalCS)  : null,
            labelType:           labelType || null,
            mrp:                 mrp       ? parseFloat(mrp) : null,
            mfgDate:             null,
            expDate:             null,
            status:              'PENDING',
          },
        })
        imported++
      } catch (ex) {
        errors.push({ row: row.diNo || '?', error: ex.message })
        skipped++
      }
    }

    await prisma.sheetSyncLog.create({
      data: { trigger, rowsIn: rows.length, imported, skipped, errors: errors.length ? JSON.stringify(errors) : null }
    }).catch(() => {})

    return { success: true, imported, skipped, errors: errors.length ? errors : undefined }
  })
}
