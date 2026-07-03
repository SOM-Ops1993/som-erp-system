import prisma from '../../../db.js'
import XLSX from 'xlsx'

function buildSheet(data) {
  if (!data.length) return XLSX.utils.aoa_to_sheet([['No data']])
  const ws = XLSX.utils.json_to_sheet(data)
  const cols = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length, ...data.map(r => String(r[k] ?? '').length).slice(0, 50)) + 2 }))
  ws['!cols'] = cols
  return ws
}

function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  return isNaN(dt) ? d : `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`
}

function sendXlsx(res, workbook, filename) {
  const buf  = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  const today = new Date().toISOString().slice(0, 10)
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}_${today}.xlsx"`)
  return res.send(buf)
}

// ── helpers ──────────────────────────────────────────────────────────────────

async function fetchUserMap(userIds) {
  if (!userIds.length) return {}
  const users = await prisma.user.findMany({ where: { userId: { in: userIds } }, select: { userId: true, fullName: true } })
  return Object.fromEntries(users.map(u => [u.userId, u.fullName]))
}

async function fetchBomLines(bomIds) {
  const [form, pack] = await Promise.all([
    prisma.erpBomLineFormulation.findMany({ where: { bomId: { in: bomIds } }, select: { bomId: true, itemCode: true, qtyPerUnit: true, unit: true } }),
    prisma.erpBomLinePacking.findMany({     where: { bomId: { in: bomIds } }, select: { bomId: true, itemCode: true, qtyPerUnit: true, unit: true } }),
  ])
  const map = {}
  for (const l of [...form, ...pack]) {
    if (!map[l.bomId]) map[l.bomId] = []
    map[l.bomId].push(l)
  }
  return map
}

// ── Sales ─────────────────────────────────────────────────────────────────────

export const exportSalesOrders = async (req, res) => {
  try {
    const { status, priority, from_etd, to_etd } = req.query
    const where = {}
    if (status)   where.status   = status
    if (priority) where.priority = priority
    if (from_etd || to_etd) {
      where.etd = {}
      if (from_etd) where.etd.gte = new Date(from_etd)
      if (to_etd)   where.etd.lte = new Date(to_etd)
    }

    const rows = await prisma.erpSalesOrder.findMany({
      where,
      orderBy: [{ etd: 'asc' }, { priority: 'desc' }],
    })
    const data = rows.map(r => ({
      'DI Number':   r.diNumber,
      'Company':     r.company,
      'Order Type':  r.orderType,
      'Status':      r.status,
      'Customer':    r.customerName,
      'Order Date':  fmtDate(r.orderDate),
      'ETD':         fmtDate(r.etd),
      'Product Code': r.productCode,
      'Product Name': r.productName,
      'Order Qty':   r.orderQty,
      'Unit':        r.qtyUnit,
      'Priority':    r.priority,
      'Sales Staff': r.salesStaff,
      'Notes':       r.notes,
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'Sales Orders')
    return sendXlsx(res, wb, 'SalesOrderRegister')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const exportAtRiskOrders = async (req, res) => {
  try {
    const sevenDaysOut = new Date(Date.now() + 7 * 86400000)
    const rows = await prisma.erpSalesOrder.findMany({
      where:   { etd: { lte: sevenDaysOut }, status: { notIn: ['dispatched', 'cancelled'] } },
      orderBy: { etd: 'asc' },
    })
    const data = rows.map(r => ({
      'DI Number':   r.diNumber,
      'Customer':    r.customerName,
      'Product':     r.productName,
      'Qty':         r.orderQty,
      'Unit':        r.qtyUnit,
      'ETD':         fmtDate(r.etd),
      'Status':      r.status,
      'Priority':    r.priority,
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'At-Risk Orders')
    return sendXlsx(res, wb, 'AtRiskOrders')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const exportDispatchSummary = async (req, res) => {
  try {
    const { year, month } = req.query
    const where = {}
    if (year || month) {
      const y = year  ? Number(year)  : null
      const m = month ? Number(month) : null
      const from = new Date(y || new Date().getFullYear(), m ? m - 1 : 0, 1)
      const to   = m ? new Date(y || new Date().getFullYear(), m, 1) : new Date((y || new Date().getFullYear()) + 1, 0, 1)
      where.dispatchDate = { gte: from, lt: to }
    }

    const dispatches = await prisma.orderDispatch.findMany({
      where,
      include: { salesOrder: { select: { diNumber: true, customerName: true, productName: true, orderQty: true, qtyUnit: true } } },
      orderBy: { dispatchDate: 'desc' },
    })
    const userIds = [...new Set(dispatches.map(d => d.dispatchedBy).filter(Boolean))]
    const userMap = await fetchUserMap(userIds)

    const data = dispatches.map(d => ({
      'Invoice':         d.invoiceNumber,
      'Dispatch Date':   fmtDate(d.dispatchDate),
      'DI Number':       d.salesOrder?.diNumber    ?? d.diNumber,
      'Customer':        d.salesOrder?.customerName ?? null,
      'Product':         d.salesOrder?.productName  ?? null,
      'Qty':             d.salesOrder?.orderQty     ?? null,
      'Unit':            d.salesOrder?.qtyUnit      ?? null,
      'Transport':       d.transportName,
      'Dispatched By':   userMap[d.dispatchedBy]   ?? null,
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'Dispatch Summary')
    return sendXlsx(res, wb, 'DispatchSummary')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const exportSalesPerformance = async (req, res) => {
  try {
    const orders = await prisma.erpSalesOrder.findMany({
      where:  { salesStaff: { not: null } },
      select: { salesStaff: true, status: true, orderQty: true, priority: true },
    })

    const byStaff = {}
    for (const o of orders) {
      const k = o.salesStaff
      if (!byStaff[k]) byStaff[k] = { total: 0, dispatched: 0, cancelled: 0, qty: 0, highPri: 0 }
      const g = byStaff[k]
      g.total++
      if (o.status   === 'dispatched') g.dispatched++
      if (o.status   === 'cancelled')  g.cancelled++
      if (o.priority === 'High')       g.highPri++
      g.qty += Number(o.orderQty || 0)
    }

    const data = Object.entries(byStaff)
      .map(([staff, g]) => ({
        'Sales Staff':    staff,
        'Total Orders':   g.total,
        'Dispatched':     g.dispatched,
        'Cancelled':      g.cancelled,
        'Total Qty (kg/L)': Number(g.qty.toFixed(2)),
        'High Priority':  g.highPri,
      }))
      .sort((a, b) => b['Dispatched'] - a['Dispatched'])

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'Sales Performance')
    return sendXlsx(res, wb, 'SalesPerformance')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Microbial ─────────────────────────────────────────────────────────────────

export const exportMicrobialStock = async (req, res) => {
  try {
    const containers = await prisma.microbialContainer.findMany({
      where:   { status: { not: 'exhausted' } },
      include: { strain: { select: { strainName: true, decayK: true } } },
      orderBy: { expiryDate: 'asc' },
    })
    const today = new Date()
    const data = containers.map(c => {
      const daysSince  = (today - new Date(c.mfgDate)) / 86400000
      const currentCfu = Number(c.mfgCfuPerMl) * Math.exp(-Number(c.strain.decayK) * daysSince)
      return {
        'Container ID':       c.containerId,
        'Strain':             c.strain?.strainName   ?? null,
        'Volume (L)':         c.volumeLitres,
        'Mfg CFU/mL':        c.mfgCfuPerMl,
        'Mfg Date':           fmtDate(c.mfgDate),
        'Expiry Date':        fmtDate(c.expiryDate),
        'Storage Temp (°C)':  c.storageTempC,
        'Status':             c.status,
        'Room':               c.locationRoom,
        'Position':           c.locationPosition,
        'Current CFU/mL':     Number(currentCfu.toFixed(2)),
        'CFU Ratio %':        Number(((currentCfu / Number(c.mfgCfuPerMl)) * 100).toFixed(1)),
        'Days to Expiry':     Math.max(0, Math.floor((new Date(c.expiryDate) - today) / 86400000)),
      }
    })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'Microbial Stock')
    return sendXlsx(res, wb, 'MicrobialContainerStock')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const exportCfuDecay = async (req, res) => {
  try {
    const containers = await prisma.microbialContainer.findMany({
      include: { strain: { select: { strainName: true, decayK: true } } },
    })
    const today = new Date()
    const data = containers.flatMap(c =>
      [0, 7, 14, 30, 60, 90].map(daysFromNow => {
        const daysSinceMfg = (today - new Date(c.mfgDate)) / 86400000 + daysFromNow
        const projCfu = Number(c.mfgCfuPerMl) * Math.exp(-Number(c.strain.decayK) * daysSinceMfg)
        return {
          'Container ID':   c.containerId,
          'Strain':         c.strain?.strainName ?? null,
          'Days from Now':  daysFromNow,
          'Projected Date': fmtDate(new Date(Date.now() + daysFromNow * 86400000)),
          'Projected CFU/mL': Number(projCfu.toFixed(2)),
          'CFU Ratio %':    Number(((projCfu / Number(c.mfgCfuPerMl)) * 100).toFixed(1)),
        }
      })
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'CFU Decay')
    return sendXlsx(res, wb, 'CFUDecayReport')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const exportMicrobialTransactions = async (req, res) => {
  try {
    const txs = await prisma.microbialTransaction.findMany({
      include: { container: { include: { strain: { select: { strainName: true } } } } },
      orderBy: { dispatchDate: 'desc' },
    })
    const userIds = [...new Set(txs.map(t => t.dispatchedBy).filter(Boolean))]
    const userMap = await fetchUserMap(userIds)

    const data = txs.map(t => ({
      'TX ID':                t.id,
      'Strain':               t.container?.strain?.strainName ?? null,
      'Volume (L)':           t.volumeDispatchedL,
      'CFU/mL at Dispatch':   t.cfuPerMlAtDispatch,
      'Temp (°C)':            t.dispatchTempC,
      'Dispatched By':        userMap[t.dispatchedBy]         ?? null,
      'Receiver':             t.receiverName,
      'Dispatch Date':        fmtDate(t.dispatchDate),
      'Receipt Confirmed':    t.receiptConfirmed ? 'Yes' : 'No',
      'Confirmed At':         fmtDate(t.receiptConfirmedAt),
      'Actual CFU on Receipt': t.actualCfuOnReceipt,
      'Notes':                t.receiptNotes,
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'Microbial Transactions')
    return sendXlsx(res, wb, 'MicrobialTransactionLog')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Planning / Production ─────────────────────────────────────────────────────

export const exportDemandStockGap = async (req, res) => {
  try {
    const orders = await prisma.erpSalesOrder.findMany({
      where: { status: { in: ['confirmed', 'planned', 'in_production'] } },
      include: { productionPlans: { where: { status: 'published' }, select: { planId: true } } },
    })

    // Find active BOM for each product
    const productCodes = [...new Set(orders.map(o => o.productCode).filter(Boolean))]
    const boms = productCodes.length ? await prisma.erpBomHeader.findMany({
      where:   { productCode: { in: productCodes }, status: 'active' },
      select:  { bomId: true, productCode: true, yieldPct: true },
      orderBy: { effectiveDate: 'desc' },
    }) : []
    // Latest active BOM per product
    const bomByProduct = {}
    for (const b of boms) {
      if (!bomByProduct[b.productCode]) bomByProduct[b.productCode] = b
    }

    const bomIds = [...new Set(Object.values(bomByProduct).map(b => b.bomId))]
    const bomLineMap = bomIds.length ? await fetchBomLines(bomIds) : {}

    // Accumulate demand per item
    const gapMap = {}
    for (const o of orders) {
      const bom = bomByProduct[o.productCode]
      if (!bom) continue
      const requiredQty = Number(o.orderQty) / (Number(bom.yieldPct) / 100)
      for (const line of (bomLineMap[bom.bomId] || [])) {
        const needed = Number(line.qtyPerUnit) * requiredQty
        if (!gapMap[line.itemCode]) gapMap[line.itemCode] = { total_demand: 0 }
        gapMap[line.itemCode].total_demand += needed
      }
    }

    // Stock
    const [items, packs] = await Promise.all([
      prisma.erpItem.findMany({ select: { itemCode: true, itemName: true, uom: true, reorderLevel: true } }),
      prisma.erpPack.findMany({
        where:  { qrConfirmed: true, status: { in: ['active', 'partial'] } },
        select: { itemCode: true, qtyRemaining: true },
      }),
    ])
    const stockTotals = {}
    for (const p of packs) {
      stockTotals[p.itemCode] = (stockTotals[p.itemCode] || 0) + Number(p.qtyRemaining)
    }

    const data = items.map(i => {
      const demand = gapMap[i.itemCode]?.total_demand || 0
      const stock  = stockTotals[i.itemCode] || 0
      return {
        'Item Code':    i.itemCode,
        'Item Name':    i.itemName,
        'UOM':          i.uom,
        'Current Stock': Number(stock.toFixed(3)),
        'Total Demand': Number(demand.toFixed(3)),
        'Gap':          Number((demand - stock).toFixed(3)),
        'Reorder Level': i.reorderLevel,
        'Status':        demand > stock ? 'SHORT' : 'OK',
      }
    })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'Demand vs Stock Gap')
    return sendXlsx(res, wb, 'DemandStockGap')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const exportProductionSchedule = async (req, res) => {
  try {
    const jobs = await prisma.erpProductionJob.findMany({
      where:   { plan: { status: { in: ['published', 'in_production'] } } },
      include: {
        plan:      { select: { planId: true, diNumber: true, productCode: true, plannedQty: true, batchCount: true, plannedStartDate: true, plannedEndDate: true, status: true } },
        equipment: { select: { equipmentName: true } },
      },
    })
    const diNumbers = [...new Set(jobs.map(j => j.plan?.diNumber).filter(Boolean))]
    const salesOrders = diNumbers.length ? await prisma.erpSalesOrder.findMany({
      where:  { diNumber: { in: diNumbers } },
      select: { diNumber: true, etd: true, priority: true },
    }) : []
    const soMap = Object.fromEntries(salesOrders.map(s => [s.diNumber, s]))

    const data = jobs
      .map(j => {
        const so = soMap[j.plan?.diNumber] ?? {}
        return {
          'Plan ID':       j.plan?.planId          ?? null,
          'DI Number':     j.plan?.diNumber         ?? null,
          'Product':       j.plan?.productCode      ?? null,
          'Planned Qty':   j.plan?.plannedQty       ?? null,
          'Batches':       j.plan?.batchCount       ?? null,
          'Start Date':    fmtDate(j.plan?.plannedStartDate),
          'End Date':      fmtDate(j.plan?.plannedEndDate),
          'Plan Status':   j.plan?.status           ?? null,
          'ETD':           fmtDate(so.etd),
          'Priority':      so.priority              ?? null,
          'Batch No':      j.batchNo,
          'Batch Code':    j.batchCode,
          'Batch Qty':     j.batchQty,
          'Batch Status':  j.status,
          'Equipment':     j.equipment?.equipmentName ?? null,
          'Expected Start': fmtDate(j.expectedStartTime),
          'Actual Start':  fmtDate(j.actualStartTime),
        }
      })
      .sort((a, b) => {
        if (a.ETD && b.ETD) return new Date(a.ETD) - new Date(b.ETD)
        return (a['Batch No'] ?? 0) - (b['Batch No'] ?? 0)
      })

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'Production Schedule')
    return sendXlsx(res, wb, 'ProductionSchedule')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const exportTimeMotion = async (req, res) => {
  try {
    const logs = await prisma.timeMotionLog.findMany({ orderBy: { createdAt: 'desc' } })
    const equipIds  = [...new Set(logs.map(l => l.equipmentId).filter(Boolean))]
    const supIds    = [...new Set(logs.map(l => l.supervisorId).filter(Boolean))]
    const [equips, users] = await Promise.all([
      equipIds.length ? prisma.erpEquipment.findMany({ where: { equipmentId: { in: equipIds } }, select: { equipmentId: true, equipmentName: true } }) : [],
      supIds.length   ? prisma.user.findMany({ where: { userId: { in: supIds } }, select: { userId: true, fullName: true } }) : [],
    ])
    const equipMap = Object.fromEntries(equips.map(e => [e.equipmentId, e.equipmentName]))
    const userMap  = Object.fromEntries(users.map(u => [u.userId, u.fullName]))

    const logsData = logs.map(l => ({
      'ID':            l.id,
      'Product':       l.productCode,
      'Equipment':     equipMap[l.equipmentId]  ?? null,
      'Stage':         l.operationStage,
      'Qty Produced':  l.qtyProduced,
      'Time (hrs)':    l.timeHrs,
      'Mins/Unit':     l.minsPerUnit,
      'Workers':       l.workersDeployed,
      'Shift':         l.shift,
      'Supervisor':    userMap[l.supervisorId]  ?? null,
      'Date':          fmtDate(l.createdAt),
    }))

    // time_motion_model is a DB VIEW — no Prisma model; must stay raw
    const model = await prisma.$queryRaw`
      SELECT tmm.product_code AS "Product", ee.equipment_name AS "Equipment", tmm.operation_stage AS "Stage",
             tmm.avg_mins_per_unit AS "Avg Mins/Unit", tmm.avg_workers AS "Avg Workers",
             tmm.observation_count AS "Observations", tmm.confidence AS "Confidence"
      FROM time_motion_model tmm LEFT JOIN erp_equipment ee ON ee.equipment_id = tmm.equipment_id
      ORDER BY tmm.product_code, tmm.operation_stage
    `
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(logsData), 'Raw Logs')
    XLSX.utils.book_append_sheet(wb, buildSheet(model),    'Model Summary')
    return sendXlsx(res, wb, 'TimeMotionData')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const exportEquipmentUtilisation = async (req, res) => {
  try {
    const [equipment, plants, jobs] = await Promise.all([
      prisma.erpEquipment.findMany({ select: { equipmentId: true, equipmentName: true, equipmentCode: true, plantId: true, workingVolume: true, status: true } }),
      prisma.erpPlant.findMany({ select: { plantId: true, plantName: true } }),
      prisma.erpProductionJob.findMany({
        where:  { actualStartTime: { not: null } },
        select: { equipmentId: true, status: true, actualStartTime: true, actualEndTime: true },
      }),
    ])
    const plantMap = Object.fromEntries(plants.map(p => [p.plantId, p.plantName]))
    const jobMap   = {}
    for (const j of jobs) {
      if (!jobMap[j.equipmentId]) jobMap[j.equipmentId] = []
      jobMap[j.equipmentId].push(j)
    }

    const data = equipment.map(ee => {
      const eJobs     = jobMap[ee.equipmentId] || []
      const completed = eJobs.filter(j => j.status === 'qc_passed').length
      const active    = eJobs.filter(j => ['pending', 'in_progress'].includes(j.status)).length
      const hrsArr    = eJobs.filter(j => j.actualStartTime && j.actualEndTime).map(j => (new Date(j.actualEndTime) - new Date(j.actualStartTime)) / 3600000)
      const avgHrs    = hrsArr.length ? Number((hrsArr.reduce((a, b) => a + b, 0) / hrsArr.length).toFixed(2)) : null
      return {
        'Equipment':        ee.equipmentName,
        'Code':             ee.equipmentCode,
        'Plant':            plantMap[ee.plantId]  ?? null,
        'Working Volume':   ee.workingVolume,
        'Status':           ee.status,
        'Completed Batches': completed,
        'Active Batches':   active,
        'Avg Batch Hrs':    avgHrs,
      }
    }).sort((a, b) => (a['Equipment'] ?? '').localeCompare(b['Equipment'] ?? ''))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'Equipment Utilisation')
    return sendXlsx(res, wb, 'EquipmentUtilisation')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const exportRmForecast = async (req, res) => {
  try {
    const thirtyDaysOut = new Date(Date.now() + 30 * 86400000)

    const orders = await prisma.erpSalesOrder.findMany({
      where: { status: { notIn: ['dispatched', 'cancelled'] }, etd: { lte: thirtyDaysOut } },
    })

    const productCodes = [...new Set(orders.map(o => o.productCode).filter(Boolean))]
    const boms = productCodes.length ? await prisma.erpBomHeader.findMany({
      where:   { productCode: { in: productCodes }, status: 'active' },
      select:  { bomId: true, productCode: true, yieldPct: true },
      orderBy: { effectiveDate: 'desc' },
    }) : []
    const bomByProduct = {}
    for (const b of boms) {
      if (!bomByProduct[b.productCode]) bomByProduct[b.productCode] = b
    }

    const bomIds     = [...new Set(Object.values(bomByProduct).map(b => b.bomId))]
    const bomLineMap = bomIds.length ? await fetchBomLines(bomIds) : {}

    // Also fetch item names for all items in BOM lines
    const allItemCodes = [...new Set(Object.values(bomLineMap).flat().map(l => l.itemCode))]
    const items = allItemCodes.length ? await prisma.erpItem.findMany({
      where:  { itemCode: { in: allItemCodes } },
      select: { itemCode: true, itemName: true },
    }) : []
    const itemNameMap = Object.fromEntries(items.map(i => [i.itemCode, i.itemName]))

    const forecastMap = {}
    for (const o of orders) {
      const bom = bomByProduct[o.productCode]
      if (!bom) continue
      const requiredQty = Number(o.orderQty) / (Number(bom.yieldPct) / 100)
      for (const line of (bomLineMap[bom.bomId] || [])) {
        if (!forecastMap[line.itemCode]) forecastMap[line.itemCode] = { item_name: itemNameMap[line.itemCode] ?? null, unit: line.unit, total_demand: 0 }
        forecastMap[line.itemCode].total_demand += Number(line.qtyPerUnit) * requiredQty
      }
    }

    const packs = await prisma.erpPack.findMany({
      where:  { qrConfirmed: true, status: { in: ['active', 'partial'] } },
      select: { itemCode: true, qtyRemaining: true },
    })
    const stockMap = {}
    for (const p of packs) stockMap[p.itemCode] = (stockMap[p.itemCode] || 0) + Number(p.qtyRemaining)

    const data = Object.entries(forecastMap)
      .map(([code, v]) => ({
        'Item Code':     code,
        'Item Name':     v.item_name,
        'Unit':          v.unit,
        'Required (30d)': Number(v.total_demand.toFixed(3)),
        'Current Stock': Number((stockMap[code] || 0).toFixed(3)),
        'Gap':           Number(Math.max(0, v.total_demand - (stockMap[code] || 0)).toFixed(3)),
        'Status':        v.total_demand > (stockMap[code] || 0) ? 'PROCURE' : 'OK',
      }))
      .sort((a, b) => b['Gap'] - a['Gap'])

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'RM Forecast')
    return sendXlsx(res, wb, 'RMForecast30Days')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Management Pack ───────────────────────────────────────────────────────────

export const exportManagementPack = async (req, res) => {
  try {
    const wb    = XLSX.utils.book_new()
    const today = new Date()
    const sevenDaysOut  = new Date(Date.now() + 7 * 86400000)

    // 1 — All sales orders
    const soAll = await prisma.erpSalesOrder.findMany({ orderBy: { etd: 'asc' } })
    XLSX.utils.book_append_sheet(wb, buildSheet(soAll.map(r => ({
      'DI': r.diNumber, 'Company': r.company, 'Type': r.orderType, 'Status': r.status,
      'Customer': r.customerName, 'ETD': fmtDate(r.etd), 'Product': r.productName,
      'Qty': r.orderQty, 'Unit': r.qtyUnit, 'Priority': r.priority, 'Staff': r.salesStaff,
    }))), '1_SalesOrders')

    // 2 — At-risk
    const soRisk = soAll.filter(r => r.etd && new Date(r.etd) <= sevenDaysOut && !['dispatched','cancelled'].includes(r.status))
    XLSX.utils.book_append_sheet(wb, buildSheet(soRisk.map(r => ({
      di_number: r.diNumber, customer_name: r.customerName, product_name: r.productName,
      order_qty: r.orderQty, etd: fmtDate(r.etd), status: r.status, priority: r.priority,
    }))), '2_AtRisk')

    // 3 — Dispatch this month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    const dispatches = await prisma.orderDispatch.findMany({
      where:   { dispatchDate: { gte: monthStart, lt: monthEnd } },
      include: { salesOrder: { select: { customerName: true, productName: true, orderQty: true } } },
    })
    XLSX.utils.book_append_sheet(wb, buildSheet(dispatches.map(d => ({
      invoice_number: d.invoiceNumber, dispatch_date: fmtDate(d.dispatchDate),
      customer_name:  d.salesOrder?.customerName ?? null,
      product_name:   d.salesOrder?.productName  ?? null,
      order_qty:      d.salesOrder?.orderQty     ?? null,
      transport_name: d.transportName,
    }))), '3_Dispatch')

    // 4 — Production schedule
    const jobs = await prisma.erpProductionJob.findMany({
      where:   { plan: { status: { in: ['published', 'in_production'] } } },
      include: {
        plan:      { select: { productCode: true, plannedStartDate: true, diNumber: true } },
        equipment: { select: { equipmentName: true } },
      },
    })
    const jobDiNums  = [...new Set(jobs.map(j => j.plan?.diNumber).filter(Boolean))]
    const schedSOs   = jobDiNums.length ? await prisma.erpSalesOrder.findMany({ where: { diNumber: { in: jobDiNums } }, select: { diNumber: true, etd: true } }) : []
    const schedSoMap = Object.fromEntries(schedSOs.map(s => [s.diNumber, s]))
    XLSX.utils.book_append_sheet(wb, buildSheet(jobs.map(j => ({
      product_code:       j.plan?.productCode      ?? null,
      batch_code:         j.batchCode,
      batch_qty:          j.batchQty,
      status:             j.status,
      planned_start_date: fmtDate(j.plan?.plannedStartDate),
      etd:                fmtDate(schedSoMap[j.plan?.diNumber]?.etd),
      equipment_name:     j.equipment?.equipmentName ?? null,
    })).sort((a, b) => (a.etd > b.etd ? 1 : -1))), '4_ProductionSchedule')

    // 5 — Stock summary (JS aggregation — no GROUP BY FILTER needed)
    const [allItems, activePacks] = await Promise.all([
      prisma.erpItem.findMany({ select: { itemCode: true, itemName: true, itemCategory: true, uom: true, reorderLevel: true } }),
      prisma.erpPack.findMany({ where: { qrConfirmed: true, status: { in: ['active', 'partial'] } }, select: { itemCode: true, qtyRemaining: true } }),
    ])
    const packTotals = {}
    for (const p of activePacks) packTotals[p.itemCode] = (packTotals[p.itemCode] || 0) + Number(p.qtyRemaining)
    XLSX.utils.book_append_sheet(wb, buildSheet(allItems.map(i => ({
      item_code: i.itemCode, item_name: i.itemName, item_category: i.itemCategory,
      total_qty: packTotals[i.itemCode] || 0, uom: i.uom, reorder_level: i.reorderLevel,
    }))), '5_StockSummary')

    // 6 — Microbial containers
    const containers = await prisma.microbialContainer.findMany({
      where:   { status: { not: 'exhausted' } },
      include: { strain: { select: { strainName: true, decayK: true } } },
    })
    XLSX.utils.book_append_sheet(wb, buildSheet(containers.map(c => {
      const days = (today - new Date(c.mfgDate)) / 86400000
      const cfu  = Number(c.mfgCfuPerMl) * Math.exp(-Number(c.strain.decayK) * days)
      return { container_id: c.containerId, strain_name: c.strain?.strainName ?? null, volume_litres: c.volumeLitres, mfg_cfu_per_ml: c.mfgCfuPerMl, current_cfu: Number(cfu.toFixed(2)), mfg_date: fmtDate(c.mfgDate), expiry_date: fmtDate(c.expiryDate), status: c.status }
    })), '6_MicrobialStock')

    // 7 — Equipment utilisation (JS aggregation)
    const [equips, equJobs] = await Promise.all([
      prisma.erpEquipment.findMany({ select: { equipmentId: true, equipmentName: true, status: true } }),
      prisma.erpProductionJob.findMany({ select: { equipmentId: true, status: true } }),
    ])
    const equJobMap = {}
    for (const j of equJobs) {
      if (!equJobMap[j.equipmentId]) equJobMap[j.equipmentId] = []
      equJobMap[j.equipmentId].push(j)
    }
    XLSX.utils.book_append_sheet(wb, buildSheet(equips.map(ee => ({
      equipment_name: ee.equipmentName,
      status:         ee.status,
      completed:      (equJobMap[ee.equipmentId] || []).filter(j => j.status === 'qc_passed').length,
    }))), '7_Equipment')

    // 8 — Time motion (DB VIEW — must stay raw)
    const tmmRows = await prisma.$queryRaw`SELECT product_code, operation_stage, avg_mins_per_unit, avg_workers, observation_count, confidence FROM time_motion_model ORDER BY product_code, operation_stage`
    XLSX.utils.book_append_sheet(wb, buildSheet(tmmRows), '8_TimeMotion')

    // 9 — Low stock alert
    const lowStock = allItems.filter(i => (packTotals[i.itemCode] || 0) <= Number(i.reorderLevel || 0))
    XLSX.utils.book_append_sheet(wb, buildSheet(lowStock.map(i => ({
      item_code: i.itemCode, item_name: i.itemName,
      stock: packTotals[i.itemCode] || 0, reorder_level: i.reorderLevel,
    }))), '9_LowStockAlert')

    // 10 — Audit log
    const auditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take:    500,
      select:  { action: true, tableName: true, recordId: true, username: true, createdAt: true, notes: true },
    })
    XLSX.utils.book_append_sheet(wb, buildSheet(auditLogs.map(r => ({
      action: r.action, table_name: r.tableName, record_id: r.recordId,
      username: r.username, created_at: fmtDate(r.createdAt), notes: r.notes,
    }))), '10_AuditLog')

    // 11 — FIFO overrides
    const fifoLogs = await prisma.fifoOverrideLog.findMany({ orderBy: { createdAt: 'desc' } })
    const fifoUserIds = [...new Set(fifoLogs.map(f => f.overrideBy).filter(Boolean))]
    const fifoUserMap = await fetchUserMap(fifoUserIds)
    XLSX.utils.book_append_sheet(wb, buildSheet(fifoLogs.map(r => ({
      item_code:    r.itemCode,
      older_lot:    r.olderLot,
      older_qty:    r.olderQty,
      selected_lot: r.selectedLot,
      override_by:  fifoUserMap[r.overrideBy] ?? null,
      reason:       r.reason,
      created_at:   fmtDate(r.createdAt),
    }))), '11_FIFOOverrides')

    // 12 — Gate outward flagged for deletion (is_unauthorised field removed from schema; using requestDelete)
    const flaggedOutward = await prisma.gateOutward.findMany({
      where:   { requestDelete: true },
      orderBy: { createdAt: 'desc' },
      take:    200,
    })
    XLSX.utils.book_append_sheet(wb, buildSheet(flaggedOutward.map(r => ({
      inward_id:     r.inwardId,
      receiver_name: r.receiverName,
      invoice_no:    r.invoiceNo,
      vehicle_no:    r.vehicleNo,
      status:        r.status,
      created_at:    fmtDate(r.createdAt),
    }))), '12_FlaggedOutward')

    return sendXlsx(res, wb, 'SOM_ERP_ManagementPack')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Gate ──────────────────────────────────────────────────────────────────────

export const exportGateInwardLog = async (req, res) => {
  try {
    const inwards = await prisma.gateInward.findMany({ orderBy: { createdAt: 'desc' } })
    const userIds = [...new Set(inwards.map(g => g.createdBy).filter(Boolean))]
    const userMap = await fetchUserMap(userIds)

    const data = inwards.map(g => ({
      'Inward ID':        g.inwardId,
      'Supplier Name':    g.supplierName,
      'Invoice No':       g.invoiceNo,
      'Vehicle No':       g.vehicleNo,
      'Num Packs':        g.numPacks,
      'Status':           g.status,
      'Created By':       userMap[g.createdBy] ?? null,
      'Created At':       fmtDate(g.createdAt),
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'Gate Inward Log')
    return sendXlsx(res, wb, 'GateInwardLog')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
