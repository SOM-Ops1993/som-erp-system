import prisma from '../../db.js'
import XLSX from 'xlsx'

function buildSheet(data, sheetName = 'Report') {
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
  const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  const today = new Date().toISOString().slice(0, 10)
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}_${today}.xlsx"`)
  return res.send(buf)
}

export async function exportSalesOrders(req, res) {
  try {
    const { status, priority, from_etd, to_etd } = req.query
    const rows = await prisma.$queryRaw`
      SELECT di_number AS "DI Number", company AS "Company", order_type AS "Order Type", status AS "Status",
             customer_name AS "Customer", order_date AS "Order Date", etd AS "ETD",
             product_code AS "Product Code", product_name AS "Product Name",
             order_qty AS "Order Qty", qty_unit AS "Unit", priority AS "Priority",
             sales_staff AS "Sales Staff", notes AS "Notes"
      FROM sales_orders
      WHERE (${status || null}::text IS NULL OR status = ${status || null})
        AND (${priority || null}::text IS NULL OR priority = ${priority || null})
        AND (${from_etd || null}::date IS NULL OR etd >= ${from_etd || null}::date)
        AND (${to_etd || null}::date IS NULL OR etd <= ${to_etd || null}::date)
      ORDER BY etd ASC, priority DESC
    `
    const data = rows.map(r => ({ ...r, 'Order Date': fmtDate(r['Order Date']), ETD: fmtDate(r.ETD) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'Sales Orders')
    return sendXlsx(res, wb, 'SalesOrderRegister')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function exportAtRiskOrders(req, res) {
  try {
    const sevenDaysOut = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    const rows = await prisma.$queryRaw`
      SELECT di_number AS "DI Number", customer_name AS "Customer", product_name AS "Product",
             order_qty AS "Qty", qty_unit AS "Unit", etd AS "ETD", status AS "Status", priority AS "Priority"
      FROM sales_orders WHERE etd <= ${sevenDaysOut}::date AND status NOT IN ('dispatched','cancelled')
      ORDER BY etd ASC
    `
    const data = rows.map(r => ({ ...r, ETD: fmtDate(r.ETD) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'At-Risk Orders')
    return sendXlsx(res, wb, 'AtRiskOrders')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function exportDispatchSummary(req, res) {
  try {
    const { year, month } = req.query
    const rows = await prisma.$queryRaw`
      SELECT od.invoice_number AS "Invoice", od.dispatch_date AS "Dispatch Date",
             so.di_number AS "DI Number", so.customer_name AS "Customer",
             so.product_name AS "Product", so.order_qty AS "Qty", so.qty_unit AS "Unit",
             od.transport_name AS "Transport", u.full_name AS "Dispatched By"
      FROM order_dispatch od JOIN sales_orders so ON so.di_number = od.di_number
      LEFT JOIN users u ON u.user_id = od.dispatched_by
      WHERE (${year || null}::int IS NULL OR EXTRACT(YEAR FROM od.dispatch_date) = ${year || null}::int)
        AND (${month || null}::int IS NULL OR EXTRACT(MONTH FROM od.dispatch_date) = ${month || null}::int)
      ORDER BY od.dispatch_date DESC
    `
    const data = rows.map(r => ({ ...r, 'Dispatch Date': fmtDate(r['Dispatch Date']) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'Dispatch Summary')
    return sendXlsx(res, wb, 'DispatchSummary')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function exportSalesPerformance(req, res) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT sales_staff AS "Sales Staff", COUNT(*) AS "Total Orders",
             COUNT(*) FILTER (WHERE status = 'dispatched') AS "Dispatched",
             COUNT(*) FILTER (WHERE status = 'cancelled') AS "Cancelled",
             ROUND(SUM(order_qty)::numeric, 2) AS "Total Qty (kg/L)",
             COUNT(*) FILTER (WHERE priority = 'High') AS "High Priority"
      FROM sales_orders WHERE sales_staff IS NOT NULL GROUP BY sales_staff ORDER BY "Dispatched" DESC
    `
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(rows), 'Sales Performance')
    return sendXlsx(res, wb, 'SalesPerformance')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function exportMicrobialStock(req, res) {
  try {
    const containers = await prisma.$queryRaw`
      SELECT mc.container_id AS "Container ID", ms.strain_name AS "Strain",
             mc.volume_litres AS "Volume (L)", mc.mfg_cfu_per_ml AS "Mfg CFU/mL",
             mc.mfg_date AS "Mfg Date", mc.expiry_date AS "Expiry Date",
             mc.storage_temp_c AS "Storage Temp (°C)", mc.status AS "Status",
             mc.location_room AS "Room", mc.location_position AS "Position", ms.decay_k AS "Decay K"
      FROM microbial_containers mc JOIN microbial_strains ms ON ms.strain_id = mc.strain_id
      WHERE mc.status != 'exhausted' ORDER BY mc.expiry_date ASC
    `
    const today = new Date()
    const data = containers.map(c => {
      const daysSince = (today - new Date(c['Mfg Date'])) / 86400000
      const currentCfu = Number(c['Mfg CFU/mL']) * Math.exp(-Number(c['Decay K']) * daysSince)
      return { ...c, 'Mfg Date': fmtDate(c['Mfg Date']), 'Expiry Date': fmtDate(c['Expiry Date']), 'Current CFU/mL': Number(currentCfu.toFixed(2)), 'CFU Ratio %': Number(((currentCfu / Number(c['Mfg CFU/mL'])) * 100).toFixed(1)), 'Days to Expiry': Math.max(0, Math.floor((new Date(c['Expiry Date']) - today) / 86400000)), 'Decay K': undefined }
    })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'Microbial Stock')
    return sendXlsx(res, wb, 'MicrobialContainerStock')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function exportCfuDecay(req, res) {
  try {
    const containers = await prisma.$queryRaw`
      SELECT mc.container_id, ms.strain_name, mc.mfg_cfu_per_ml, mc.mfg_date, mc.expiry_date, ms.decay_k
      FROM microbial_containers mc JOIN microbial_strains ms ON ms.strain_id = mc.strain_id
    `
    const today = new Date()
    const data = containers.flatMap(c => [0, 7, 14, 30, 60, 90].map(daysFromNow => {
      const daysSinceMfg = (today - new Date(c.mfg_date)) / 86400000 + daysFromNow
      const projCfu = Number(c.mfg_cfu_per_ml) * Math.exp(-Number(c.decay_k) * daysSinceMfg)
      return { 'Container ID': c.container_id, 'Strain': c.strain_name, 'Days from Now': daysFromNow, 'Projected Date': fmtDate(new Date(Date.now() + daysFromNow * 86400000)), 'Projected CFU/mL': Number(projCfu.toFixed(2)), 'CFU Ratio %': Number(((projCfu / Number(c.mfg_cfu_per_ml)) * 100).toFixed(1)) }
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'CFU Decay')
    return sendXlsx(res, wb, 'CFUDecayReport')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function exportMicrobialTransactions(req, res) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT mt.id AS "TX ID", ms.strain_name AS "Strain", mt.volume_dispatched_l AS "Volume (L)",
             mt.cfu_per_ml_at_dispatch AS "CFU/mL at Dispatch", mt.dispatch_temp_c AS "Temp (°C)",
             u.full_name AS "Dispatched By", mt.receiver_name AS "Receiver", mt.dispatch_date AS "Dispatch Date",
             CASE WHEN mt.receipt_confirmed THEN 'Yes' ELSE 'No' END AS "Receipt Confirmed",
             mt.receipt_confirmed_at AS "Confirmed At", mt.actual_cfu_on_receipt AS "Actual CFU on Receipt", mt.receipt_notes AS "Notes"
      FROM microbial_transactions mt
      JOIN microbial_containers mc ON mc.container_id = mt.container_id
      JOIN microbial_strains ms ON ms.strain_id = mc.strain_id
      LEFT JOIN users u ON u.user_id = mt.dispatched_by
      ORDER BY mt.dispatch_date DESC
    `
    const data = rows.map(r => ({ ...r, 'Dispatch Date': fmtDate(r['Dispatch Date']), 'Confirmed At': fmtDate(r['Confirmed At']) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'Microbial Transactions')
    return sendXlsx(res, wb, 'MicrobialTransactionLog')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function exportDemandStockGap(req, res) {
  try {
    const orders = await prisma.$queryRaw`
      SELECT so.di_number, so.product_code, so.order_qty, so.qty_unit, so.etd, bh.bom_id, bh.yield_pct
      FROM sales_orders so JOIN bom_headers bh ON bh.product_code = so.product_code AND bh.status = 'active'
      WHERE so.status IN ('confirmed','planned','in_production')
    `
    const gapMap = {}
    for (const o of orders) {
      const requiredQty = Number(o.order_qty) / (Number(o.yield_pct) / 100)
      const lines = await prisma.$queryRaw`
        SELECT item_code, qty_per_unit, unit FROM bom_lines_formulation WHERE bom_id = ${o.bom_id}::uuid
        UNION ALL SELECT item_code, qty_per_unit, unit FROM bom_lines_packing WHERE bom_id = ${o.bom_id}::uuid
      `
      for (const line of lines) {
        const needed = Number(line.qty_per_unit) * requiredQty
        if (!gapMap[line.item_code]) gapMap[line.item_code] = { total_demand: 0 }
        gapMap[line.item_code].total_demand += needed
      }
    }
    const stocks = await prisma.$queryRaw`
      SELECT p.item_code, i.item_name, COALESCE(SUM(p.qty_remaining),0) AS stock, i.uom, i.reorder_level
      FROM erp_items i LEFT JOIN erp_packs p ON p.item_code = i.item_code AND p.qr_confirmed = true AND p.status IN ('active','partial')
      GROUP BY p.item_code, i.item_name, i.uom, i.reorder_level
    `
    const data = stocks.map(s => {
      const demand = gapMap[s.item_code]?.total_demand || 0
      const gap = demand - Number(s.stock)
      return { 'Item Code': s.item_code, 'Item Name': s.item_name, 'UOM': s.uom, 'Current Stock': Number(Number(s.stock).toFixed(3)), 'Total Demand': Number(demand.toFixed(3)), 'Gap': Number(gap.toFixed(3)), 'Reorder Level': s.reorder_level, 'Status': gap > 0 ? 'SHORT' : 'OK' }
    })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'Demand vs Stock Gap')
    return sendXlsx(res, wb, 'DemandStockGap')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function exportProductionSchedule(req, res) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT pp.plan_id AS "Plan ID", so.di_number AS "DI Number", pp.product_code AS "Product",
             pp.planned_qty AS "Planned Qty", pp.batch_count AS "Batches",
             pp.planned_start_date AS "Start Date", pp.planned_end_date AS "End Date",
             pp.status AS "Plan Status", so.etd AS "ETD", so.priority AS "Priority",
             pj.batch_no AS "Batch No", pj.batch_code AS "Batch Code", pj.batch_qty AS "Batch Qty",
             pj.status AS "Batch Status", ee.equipment_name AS "Equipment",
             pj.expected_start_time AS "Expected Start", pj.actual_start_time AS "Actual Start"
      FROM production_jobs pj JOIN production_plans pp ON pp.plan_id = pj.plan_id
      LEFT JOIN sales_orders so ON so.di_number = pp.di_number
      LEFT JOIN erp_equipment ee ON ee.equipment_id = pj.equipment_id
      WHERE pp.status IN ('published','in_production')
      ORDER BY so.etd ASC, pj.batch_no ASC
    `
    const data = rows.map(r => ({ ...r, ETD: fmtDate(r.ETD), 'Start Date': fmtDate(r['Start Date']), 'Expected Start': fmtDate(r['Expected Start']), 'Actual Start': fmtDate(r['Actual Start']) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'Production Schedule')
    return sendXlsx(res, wb, 'ProductionSchedule')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function exportTimeMotion(req, res) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT tml.id AS "ID", tml.product_code AS "Product", ee.equipment_name AS "Equipment",
             tml.operation_stage AS "Stage", tml.qty_produced AS "Qty Produced", tml.time_hrs AS "Time (hrs)",
             tml.mins_per_unit AS "Mins/Unit", tml.workers_deployed AS "Workers", tml.shift AS "Shift",
             u.full_name AS "Supervisor", tml.created_at AS "Date"
      FROM time_motion_logs tml LEFT JOIN erp_equipment ee ON ee.equipment_id = tml.equipment_id
      LEFT JOIN users u ON u.user_id = tml.supervisor_id ORDER BY tml.created_at DESC
    `
    const model = await prisma.$queryRaw`
      SELECT tmm.product_code AS "Product", ee.equipment_name AS "Equipment", tmm.operation_stage AS "Stage",
             tmm.avg_mins_per_unit AS "Avg Mins/Unit", tmm.avg_workers AS "Avg Workers",
             tmm.observation_count AS "Observations", tmm.confidence AS "Confidence"
      FROM time_motion_model tmm LEFT JOIN erp_equipment ee ON ee.equipment_id = tmm.equipment_id
      ORDER BY tmm.product_code, tmm.operation_stage
    `
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(rows.map(r => ({ ...r, Date: fmtDate(r.Date) }))), 'Raw Logs')
    XLSX.utils.book_append_sheet(wb, buildSheet(model), 'Model Summary')
    return sendXlsx(res, wb, 'TimeMotionData')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function exportEquipmentUtilisation(req, res) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT ee.equipment_name AS "Equipment", ee.equipment_code AS "Code", ep.plant_name AS "Plant",
             ee.working_volume AS "Working Volume", ee.status AS "Status",
             COUNT(pj.job_id) FILTER (WHERE pj.status = 'qc_passed') AS "Completed Batches",
             COUNT(pj.job_id) FILTER (WHERE pj.status IN ('pending','in_progress')) AS "Active Batches",
             ROUND(AVG(EXTRACT(EPOCH FROM (pj.actual_end_time - pj.actual_start_time))/3600)::numeric, 2) AS "Avg Batch Hrs"
      FROM erp_equipment ee LEFT JOIN erp_plants ep ON ep.plant_id = ee.plant_id
      LEFT JOIN production_jobs pj ON pj.equipment_id = ee.equipment_id AND pj.actual_start_time IS NOT NULL
      GROUP BY ee.equipment_id, ee.equipment_name, ee.equipment_code, ep.plant_name, ee.working_volume, ee.status
      ORDER BY ee.equipment_name
    `
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(rows), 'Equipment Utilisation')
    return sendXlsx(res, wb, 'EquipmentUtilisation')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function exportRmForecast(req, res) {
  try {
    const thirtyDaysOut = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    const orders = await prisma.$queryRaw`
      SELECT so.di_number, so.product_code, so.order_qty, so.etd, bh.bom_id, bh.yield_pct
      FROM sales_orders so JOIN bom_headers bh ON bh.product_code = so.product_code AND bh.status = 'active'
      WHERE so.status NOT IN ('dispatched','cancelled') AND so.etd <= ${thirtyDaysOut}::date
    `
    const forecastMap = {}
    for (const o of orders) {
      const requiredQty = Number(o.order_qty) / (Number(o.yield_pct) / 100)
      const lines = await prisma.$queryRaw`
        SELECT f.item_code, i.item_name, f.qty_per_unit, f.unit, 'formulation' AS line_type FROM bom_lines_formulation f JOIN erp_items i ON i.item_code = f.item_code WHERE f.bom_id = ${o.bom_id}::uuid
        UNION ALL SELECT p.item_code, i.item_name, p.qty_per_unit, p.unit, 'packing' AS line_type FROM bom_lines_packing p JOIN erp_items i ON i.item_code = p.item_code WHERE p.bom_id = ${o.bom_id}::uuid
      `
      for (const line of lines) {
        if (!forecastMap[line.item_code]) forecastMap[line.item_code] = { item_name: line.item_name, unit: line.unit, total_demand: 0, line_type: line.line_type }
        forecastMap[line.item_code].total_demand += Number(line.qty_per_unit) * requiredQty
      }
    }
    const stockRows = await prisma.$queryRaw`SELECT p.item_code, COALESCE(SUM(p.qty_remaining),0) AS stock FROM erp_packs p WHERE p.qr_confirmed = true AND p.status IN ('active','partial') GROUP BY p.item_code`
    const stockMap = Object.fromEntries(stockRows.map(s => [s.item_code, Number(s.stock)]))
    const data = Object.entries(forecastMap).map(([code, v]) => ({ 'Item Code': code, 'Item Name': v.item_name, 'Type': v.line_type, 'Unit': v.unit, 'Required (30d)': Number(v.total_demand.toFixed(3)), 'Current Stock': Number((stockMap[code] || 0).toFixed(3)), 'Gap': Number(Math.max(0, v.total_demand - (stockMap[code] || 0)).toFixed(3)), 'Status': v.total_demand > (stockMap[code] || 0) ? 'PROCURE' : 'OK' })).sort((a, b) => b['Gap'] - a['Gap'])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'RM Forecast')
    return sendXlsx(res, wb, 'RMForecast30Days')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function exportManagementPack(req, res) {
  try {
    const wb = XLSX.utils.book_new()
    const today = new Date()
    const soRows = await prisma.$queryRaw`SELECT di_number AS "DI", company AS "Company", order_type AS "Type", status AS "Status", customer_name AS "Customer", etd AS "ETD", product_name AS "Product", order_qty AS "Qty", qty_unit AS "Unit", priority AS "Priority", sales_staff AS "Staff" FROM sales_orders ORDER BY etd ASC`
    XLSX.utils.book_append_sheet(wb, buildSheet(soRows.map(r => ({ ...r, ETD: fmtDate(r.ETD) }))), '1_SalesOrders')
    const sevenOut = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    const arRows = await prisma.$queryRaw`SELECT di_number, customer_name, product_name, order_qty, etd, status, priority FROM sales_orders WHERE etd <= ${sevenOut}::date AND status NOT IN ('dispatched','cancelled')`
    XLSX.utils.book_append_sheet(wb, buildSheet(arRows.map(r => ({ ...r, etd: fmtDate(r.etd) }))), '2_AtRisk')
    const dispRows = await prisma.$queryRaw`SELECT od.invoice_number, od.dispatch_date, so.customer_name, so.product_name, so.order_qty, od.transport_name FROM order_dispatch od JOIN sales_orders so ON so.di_number = od.di_number WHERE EXTRACT(MONTH FROM od.dispatch_date) = ${today.getMonth() + 1} AND EXTRACT(YEAR FROM od.dispatch_date) = ${today.getFullYear()}`
    XLSX.utils.book_append_sheet(wb, buildSheet(dispRows.map(r => ({ ...r, dispatch_date: fmtDate(r.dispatch_date) }))), '3_Dispatch')
    const schedRows = await prisma.$queryRaw`SELECT pp.product_code, pj.batch_code, pj.batch_qty, pj.status, pp.planned_start_date, so.etd, ee.equipment_name FROM production_jobs pj JOIN production_plans pp ON pp.plan_id = pj.plan_id LEFT JOIN sales_orders so ON so.di_number = pp.di_number LEFT JOIN erp_equipment ee ON ee.equipment_id = pj.equipment_id WHERE pp.status IN ('published','in_production') ORDER BY so.etd ASC`
    XLSX.utils.book_append_sheet(wb, buildSheet(schedRows.map(r => ({ ...r, etd: fmtDate(r.etd), planned_start_date: fmtDate(r.planned_start_date) }))), '4_ProductionSchedule')
    const stockRows = await prisma.$queryRaw`SELECT p.item_code, i.item_name, i.item_category, SUM(p.qty_remaining) AS total_qty, i.uom, i.reorder_level FROM erp_packs p JOIN erp_items i ON i.item_code = p.item_code WHERE p.qr_confirmed = true AND p.status IN ('active','partial') GROUP BY p.item_code, i.item_name, i.item_category, i.uom, i.reorder_level`
    XLSX.utils.book_append_sheet(wb, buildSheet(stockRows), '5_StockSummary')
    const micRows = await prisma.$queryRaw`SELECT mc.container_id, ms.strain_name, mc.volume_litres, mc.mfg_cfu_per_ml, mc.mfg_date, mc.expiry_date, mc.status, ms.decay_k FROM microbial_containers mc JOIN microbial_strains ms ON ms.strain_id = mc.strain_id WHERE mc.status != 'exhausted'`
    const micData = micRows.map(c => { const days = (today - new Date(c.mfg_date)) / 86400000; const cfu = Number(c.mfg_cfu_per_ml) * Math.exp(-Number(c.decay_k) * days); return { ...c, current_cfu_per_ml: Number(cfu.toFixed(2)), mfg_date: fmtDate(c.mfg_date), expiry_date: fmtDate(c.expiry_date), decay_k: undefined } })
    XLSX.utils.book_append_sheet(wb, buildSheet(micData), '6_MicrobialStock')
    const equRows = await prisma.$queryRaw`SELECT ee.equipment_name, ee.status, COUNT(pj.job_id) FILTER (WHERE pj.status = 'qc_passed') AS completed FROM erp_equipment ee LEFT JOIN production_jobs pj ON pj.equipment_id = ee.equipment_id GROUP BY ee.equipment_id, ee.equipment_name, ee.status`
    XLSX.utils.book_append_sheet(wb, buildSheet(equRows), '7_Equipment')
    const tmmRows = await prisma.$queryRaw`SELECT product_code, operation_stage, avg_mins_per_unit, avg_workers, observation_count, confidence FROM time_motion_model ORDER BY product_code, operation_stage`
    XLSX.utils.book_append_sheet(wb, buildSheet(tmmRows), '8_TimeMotion')
    const fRows = await prisma.$queryRaw`SELECT p.item_code, i.item_name, SUM(p.qty_remaining) AS stock, i.reorder_level FROM erp_items i LEFT JOIN erp_packs p ON p.item_code = i.item_code AND p.qr_confirmed = true AND p.status IN ('active','partial') GROUP BY p.item_code, i.item_name, i.reorder_level HAVING SUM(p.qty_remaining) <= i.reorder_level OR SUM(p.qty_remaining) IS NULL`
    XLSX.utils.book_append_sheet(wb, buildSheet(fRows), '9_LowStockAlert')
    const auditRows = await prisma.$queryRaw`SELECT al.action, al.table_name, al.record_id, al.username, al.created_at, al.notes FROM audit_log al ORDER BY al.created_at DESC LIMIT 500`
    XLSX.utils.book_append_sheet(wb, buildSheet(auditRows.map(r => ({ ...r, created_at: fmtDate(r.created_at) }))), '10_AuditLog')
    const fifoRows = await prisma.$queryRaw`SELECT fo.item_code, fo.older_lot, fo.older_qty, fo.selected_lot, u.full_name AS override_by, fo.reason, fo.created_at FROM fifo_override_log fo LEFT JOIN users u ON u.user_id = fo.override_by ORDER BY fo.created_at DESC`
    XLSX.utils.book_append_sheet(wb, buildSheet(fifoRows.map(r => ({ ...r, created_at: fmtDate(r.created_at) }))), '11_FIFOOverrides')
    const unauth = await prisma.$queryRaw`SELECT go.item_name, go.qty, go.uom, go.destination, go.vehicle_no, go.authorized_by, go.entry_time FROM gate_outward go WHERE go.is_unauthorised = true ORDER BY go.entry_time DESC LIMIT 200`
    XLSX.utils.book_append_sheet(wb, buildSheet(unauth.map(r => ({ ...r, entry_time: fmtDate(r.entry_time) }))), '12_UnauthorisedOutward')
    return sendXlsx(res, wb, 'SOM_ERP_ManagementPack')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function exportGateInwardLog(req, res) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT gi.inward_id, gi.item_name, gi.item_code, gi.lot_number, gi.supplier_name, gi.invoice_no,
             gi.total_qty, gi.uom, gi.num_packs, gi.unit_price, gi.status, gi.entry_time,
             u.full_name AS created_by_name
      FROM gate_inward gi LEFT JOIN users u ON u.user_id = gi.created_by ORDER BY gi.entry_time DESC
    `
    const data = rows.map(r => ({ ...r, entry_time: fmtDate(r.entry_time) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildSheet(data), 'Gate Inward Log')
    return sendXlsx(res, wb, 'GateInwardLog')
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
