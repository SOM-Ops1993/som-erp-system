import prisma from '../../../db.js'

// ── SO status sync helper ─────────────────────────────────────────────────────
const IN_PRODUCTION_STATUSES = new Set([
  'Under Process', 'QC Pending', 'QC Results Awaiting',
  'Unloading', 'Cooling', 'Heating', 'Under Observation', 'On Hold',
])
const SO_STATUS_ORDER = ['PENDING', 'PLANNED', 'UNDER_PRODUCTION', 'PACKED', 'IN_INVENTORY', 'READY_TO_DISPATCH', 'DISPATCHED']

function taskStatusToSoStatus(taskStatus, sent) {
  if (!sent) return null
  if (taskStatus === 'Completed') return 'PACKED'
  if (IN_PRODUCTION_STATUSES.has(taskStatus)) return 'UNDER_PRODUCTION'
  if (taskStatus === 'Not Started') return 'PLANNED'
  return null
}

async function syncSoStatus(diNo, productName, taskStatus, sent) {
  if (!diNo || !productName) return
  const soStatus = taskStatusToSoStatus(taskStatus, sent)
  if (!soStatus) return
  try {
    const soOrders = await prisma.salesOrder.findMany({
      where: { diNo: { equals: diNo, mode: 'insensitive' } },
      select: { items: { select: { id: true, inhouseProductName: true, status: true } } },
    })
    for (const so of soOrders) {
      for (const item of so.items) {
        if (item.inhouseProductName?.toLowerCase() === productName.toLowerCase()) {
          const currentIdx = SO_STATUS_ORDER.indexOf(item.status || 'PENDING')
          const newIdx     = SO_STATUS_ORDER.indexOf(soStatus)
          if (newIdx > currentIdx) {
            await prisma.salesOrderItem.update({ where: { id: item.id }, data: { status: soStatus } })
          }
        }
      }
    }
  } catch { /* SalesOrder table may not exist in all environments */ }
}

// ── list ──────────────────────────────────────────────────────────────────────
export const listTasks = async (req, res) => {
  try {
    const { date, plant, status, sent } = req.query
    const where = {}
    if (date)   where.date   = date
    if (plant)  where.plant  = plant
    if (status) where.status = status
    if (sent !== undefined) where.sent = sent === 'true'

    const tasks = await prisma.productionTask.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'asc' }],
    })
    return res.json({ success: true, data: tasks })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ── taskId generator — sequential per plant+date ─────────────────────────────
const PLANT_PREFIX = { Nano: 'NP', Botanical: 'BP', Liquid: 'LFF', Powder: 'PF', Granules: 'GF' }

async function nextTaskId(plant, date) {
  const prefix = PLANT_PREFIX[plant] || plant.slice(0, 2).toUpperCase()
  const d      = date.replace(/-/g, '')
  const count  = await prisma.productionTask.count({ where: { plant, date } })
  return `${prefix}-${d}-${String(count + 1).padStart(2, '0')}`
}

// ── create ────────────────────────────────────────────────────────────────────
export const createTask = async (req, res) => {
  try {
    const body = req.body || {}
    if (!body.plant || !body.date || !body.productName || !body.process)
      return res.status(400).json({ success: false, error: 'plant, date, productName, process required' })

    // Always generate taskId on the backend so it's sequential and unique
    const taskId = await nextTaskId(body.plant, body.date)

    const task = await prisma.productionTask.create({
      data: {
        taskId,
        plant:           body.plant,
        date:            body.date,
        diNo:            body.diNo            || null,
        shift:           body.shift           || 'General',
        productName:     body.productName,
        batchCode:       body.batchCode       || null,
        batchKey:        body.batchKey        || null,
        qty:             parseFloat(body.qty) || 0,
        qtyUom:          body.qtyUom          || null,
        process:         body.process,
        incharge:        body.incharge        || '',
        equipment:       body.equipment       || null,
        location:        body.location        || null,
        carrier:         body.carrier         || null,
        specs:           body.specs           || null,
        status:          body.status          || 'Not Started',
        remarks:         body.remarks         || null,
        primaryPack:     body.primaryPack     || null,
        inners:          body.inners          || null,
        secondaryPack:   body.secondaryPack   || null,
        unitPackQty:     body.unitPackQty ? parseFloat(body.unitPackQty) : null,
        noUnits:         body.noUnits    ? parseFloat(body.noUnits)    : null,
        unitsPerSecPack: body.unitsPerSecPack ? parseFloat(body.unitsPerSecPack) : null,
        totalSecPacks:   body.totalSecPacks   ? parseFloat(body.totalSecPacks)   : null,
        labels:          body.labels          || null,
        packAfter:       body.packAfter       || null,
        sfgSourceId:     body.sfgSourceId     || null,
        sent:            body.sent            ?? false,
        timerStart:      body.timerStart      ? new Date(body.timerStart)    : null,
        timerEnd:        body.timerEnd        ? new Date(body.timerEnd)      : null,
        bmrSubmitted:    body.bmrSubmitted    ?? false,
        bmrSubmittedAt:  body.bmrSubmittedAt  ? new Date(body.bmrSubmittedAt) : null,
        sentToQc:        body.sentToQc        ?? false,
        sentToQcAt:      body.sentToQcAt      ? new Date(body.sentToQcAt)    : null,
      },
    })
    return res.status(201).json({ success: true, data: task })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ── update ────────────────────────────────────────────────────────────────────
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params
    const body   = req.body || {}

    const existing = await prisma.productionTask.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ success: false, error: 'Task not found' })

    const data = {}
    const str  = (k) => { if (body[k] !== undefined) data[k] = body[k] || null }
    const flt  = (k) => { if (body[k] !== undefined) data[k] = body[k] ? parseFloat(body[k]) : null }
    const dt   = (k) => { if (body[k] !== undefined) data[k] = body[k] ? new Date(body[k]) : null }
    const bool = (k) => { if (body[k] !== undefined) data[k] = Boolean(body[k]) }

    if (body.plant        !== undefined) data.plant        = body.plant
    if (body.date         !== undefined) data.date         = body.date
    if (body.shift        !== undefined) data.shift        = body.shift
    if (body.productName  !== undefined) data.productName  = body.productName
    if (body.process      !== undefined) data.process      = body.process
    if (body.incharge     !== undefined) data.incharge     = body.incharge
    if (body.status       !== undefined) data.status       = body.status
    if (body.qty          !== undefined) data.qty          = parseFloat(body.qty) || 0
    str('diNo'); str('batchCode'); str('batchKey'); str('qtyUom')
    str('equipment'); str('location'); str('carrier'); str('specs'); str('remarks')
    str('primaryPack'); str('inners'); str('secondaryPack'); str('labels'); str('packAfter'); str('sfgSourceId')
    flt('unitPackQty'); flt('noUnits'); flt('unitsPerSecPack'); flt('totalSecPacks')
    bool('sent'); bool('bmrSubmitted'); bool('sentToQc')
    dt('timerStart'); dt('timerEnd'); dt('bmrSubmittedAt'); dt('sentToQcAt')

    const task = await prisma.productionTask.update({ where: { id }, data })

    // Keep SalesOrderItem.status in sync whenever status or sent flag changes
    if (body.status !== undefined || body.sent !== undefined) {
      await syncSoStatus(task.diNo, task.productName, task.status, task.sent)
    }

    return res.json({ success: true, data: task })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ── send schedule (bulk mark sent) ───────────────────────────────────────────
export const sendSchedule = async (req, res) => {
  try {
    const { date } = req.body || {}
    if (!date) return res.status(400).json({ success: false, error: 'date required' })

    // Capture tasks before marking sent so we can sync their SO status
    const toSend = await prisma.productionTask.findMany({
      where:  { date, sent: false },
      select: { diNo: true, productName: true, status: true },
    })

    const result = await prisma.productionTask.updateMany({
      where: { date, sent: false },
      data:  { sent: true },
    })

    // Mark each task's sales order item as PLANNED (fire-and-forget, non-blocking)
    for (const t of toSend) {
      await syncSoStatus(t.diNo, t.productName, t.status || 'Not Started', true)
    }

    return res.json({ success: true, updated: result.count })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ── delete ────────────────────────────────────────────────────────────────────
export const deleteTask = async (req, res) => {
  try {
    const existing = await prisma.productionTask.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ success: false, error: 'Task not found' })
    await prisma.productionTask.delete({ where: { id: req.params.id } })
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ── search sales orders (for DI number lookup) ───────────────────────────────
// Searches both ErpSalesOrder (Google Sheet sync) and SalesOrder (local form)
export const searchSalesOrders = async (req, res) => {
  try {
    const { q = '' } = req.query
    const results = []

    // 1. Search ERP sales orders (Google Sheet synced)
    try {
      const erpOrders = await prisma.erpSalesOrder.findMany({
        where: q ? {
          OR: [
            { diNumber:    { contains: q, mode: 'insensitive' } },
            { productName: { contains: q, mode: 'insensitive' } },
            { customerName:{ contains: q, mode: 'insensitive' } },
          ],
        } : {},
        select: { diNumber: true, productName: true, productCode: true, customerName: true, orderQty: true, qtyUnit: true, etd: true, status: true },
        orderBy: { etd: 'asc' },
        take: 15,
      })
      for (const o of erpOrders) {
        results.push({
          diNumber:    o.diNumber,
          productName: o.productName || '',
          productCode: o.productCode || '',
          customerName:o.customerName || '',
          orderQty:    o.orderQty ? Number(o.orderQty) : null,
          qtyUnit:     o.qtyUnit || 'KG',
          sectionName: null,   // ERP orders don't have section
          source:      'erp',
        })
      }
    } catch { /* ERP table may not exist */ }

    // 2. Search regular SalesOrders (local form entries) — get sectionName from first item
    try {
      const soOrders = await prisma.salesOrder.findMany({
        where: q ? {
          OR: [
            { diNo:         { contains: q, mode: 'insensitive' } },
            { customerName: { contains: q, mode: 'insensitive' } },
            { items: { some: { inhouseProductName: { contains: q, mode: 'insensitive' } } } },
          ],
        } : {},
        select: {
          diNo: true,
          customerName: true,
          items: { select: { inhouseProductName: true, inhouseProductCode: true, totalQty: true, totalUom: true, sectionName: true }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
      })
      for (const o of soOrders) {
        const item = o.items[0]
        // Don't duplicate if already found in ERP list
        if (results.find(r => r.diNumber?.toLowerCase() === o.diNo?.toLowerCase())) continue
        results.push({
          diNumber:    o.diNo,
          productName: item?.inhouseProductName || '',
          productCode: item?.inhouseProductCode || '',
          customerName:o.customerName,
          orderQty:    item?.totalQty ? Number(item.totalQty) : null,
          qtyUnit:     item?.totalUom || 'KG',
          sectionName: item?.sectionName || null,
          source:      'local',
        })
      }
    } catch { /* SalesOrder table may not exist */ }

    return res.json({ success: true, data: results.slice(0, 20) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ── get all items for a specific DI number ────────────────────────────────────
export const getSalesOrderItems = async (req, res) => {
  try {
    const { diNo = '' } = req.query
    if (!diNo.trim()) return res.json({ success: true, data: [] })

    const items = []

    try {
      const erpOrders = await prisma.erpSalesOrder.findMany({
        where: { diNumber: { equals: diNo.trim(), mode: 'insensitive' } },
        select: { productName: true, productCode: true, orderQty: true, qtyUnit: true, customerName: true },
      })
      for (const o of erpOrders) {
        items.push({
          productName:  o.productName || '',
          productCode:  o.productCode || '',
          orderQty:     o.orderQty ? Number(o.orderQty) : null,
          qtyUnit:      o.qtyUnit || 'KG',
          sectionName:  null,
          source:       'erp',
        })
      }
    } catch { /* ERP table may not exist */ }

    try {
      const soOrders = await prisma.salesOrder.findMany({
        where: { diNo: { equals: diNo.trim(), mode: 'insensitive' } },
        select: {
          customerName: true,
          items: {
            select: { inhouseProductName: true, inhouseProductCode: true, totalQty: true, totalUom: true, sectionName: true, unitQty: true, unitUom: true, unitPackType: true, packingType: true, labelType: true, totalCS: true },
          },
        },
      })
      for (const o of soOrders) {
        for (const item of o.items) {
          const dup = items.find(r => r.productName?.toLowerCase() === item.inhouseProductName?.toLowerCase())
          if (dup) continue
          items.push({
            productName:   item.inhouseProductName || '',
            productCode:   item.inhouseProductCode || '',
            orderQty:      item.totalQty ? Number(item.totalQty) : null,
            qtyUnit:       item.totalUom || 'KG',
            sectionName:   item.sectionName || null,
            primaryPack:   item.unitPackType || null,
            secondaryPack: item.packingType  || null,
            unitPackQty:   item.unitQty ? Number(item.unitQty) : null,
            labelType:     item.labelType    || null,
            totalCS:       item.totalCS      || null,
            source:        'local',
          })
        }
      }
    } catch { /* SalesOrder table may not exist */ }

    return res.json({ success: true, data: items })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ── search products (for product name autocomplete) ──────────────────────────
export const searchProducts = async (req, res) => {
  try {
    const { q = '', plant = '' } = req.query
    const products = await prisma.productMaster.findMany({
      where: {
        ...(q    ? { productName: { contains: q, mode: 'insensitive' } } : {}),
        ...(plant ? { plant:       { contains: plant, mode: 'insensitive' } } : {}),
      },
      orderBy: { productName: 'asc' },
      take: 30,
    })
    return res.json({ success: true, data: products })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ── list equipment by plant ──────────────────────────────────────────────────
export const listEquipmentByPlant = async (req, res) => {
  try {
    const { plant = '' } = req.query
    const equipment = await prisma.equipmentMaster.findMany({
      where: plant ? { plant: { contains: plant, mode: 'insensitive' } } : {},
      orderBy: { equipName: 'asc' },
    })
    return res.json({ success: true, data: equipment })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
