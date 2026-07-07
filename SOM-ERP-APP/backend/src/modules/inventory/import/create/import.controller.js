import prisma from '../../../../db.js'
import * as XLSX from 'xlsx'

function col(row, ...keys) {
  for (const key of keys) {
    for (const k of Object.keys(row)) {
      if (k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(key.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
        const val = row[k]
        if (val !== null && val !== undefined && String(val).trim() !== '') return String(val).trim()
      }
    }
  }
  return ''
}

function safeNum(val) {
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? 0 : n
}

function parseDate(val) {
  if (!val) return null
  if (val instanceof Date) return val
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 864e5))
    if (!isNaN(d)) return d
  }
  const d = new Date(val)
  return isNaN(d) ? null : d
}

function normalizeEquipSection(loc) {
  if (!loc) return ''
  const l = String(loc).toLowerCase().trim()
  if (l.includes('botanical'))                              return 'BOTANICAL'
  if (l.includes('liquid'))                                 return 'LIQUID'
  if (l.includes('granule'))                                return 'GRANULES'
  if (l.includes('microbial') || l.includes('production'))  return 'MICROBIAL'
  if (l === 'nano' || l.includes('nano'))                   return 'NANO'
  if (l.includes('powder') || l.includes('formulation'))    return 'POWDER'
  return String(loc).toUpperCase().trim()
}

function normalizeRecipePlant(plant) {
  if (!plant) return ''
  const p = String(plant).toUpperCase().trim()
  if (p.startsWith('MPFU'))       return 'POWDER'
  if (p === 'BOTANICAL')          return 'BOTANICAL'
  if (p === 'NANO')               return 'NANO'
  if (p === 'LIQUID')             return 'LIQUID'
  if (p === 'GRANULES')           return 'GRANULES'
  if (p === 'POWDER')             return 'POWDER'
  return p
}

function getRoleType(concCfu) {
  if (!concCfu) return null
  const v = String(concCfu).trim().toUpperCase()
  if (['NA', 'N/A', 'NIL', '-', '', 'NONE'].includes(v)) return null
  return 'MICROBE'
}

const nextProductCode = async (existingCodes) => {
  const allCodes = await prisma.productMaster.findMany({ select: { productCode: true } })
  const dbNums = allCodes.map(p => parseInt(p.productCode.replace(/\D/g, ''))).filter(n => !isNaN(n))
  const localNums = existingCodes.map(c => parseInt(c.replace(/\D/g, ''))).filter(n => !isNaN(n))
  const max = Math.max(0, ...dbNums, ...localNums)
  return `PROD-${String(max + 1).padStart(3, '0')}`
}

const nextRmCode = async (existingCodes) => {
  const allCodes = await prisma.rmMaster.findMany({ select: { itemCode: true } })
  const dbNums = allCodes.map(p => parseInt(p.itemCode.replace(/\D/g, ''))).filter(n => !isNaN(n))
  const localNums = existingCodes.map(c => parseInt(c.replace(/\D/g, ''))).filter(n => !isNaN(n))
  const max = Math.max(0, ...dbNums, ...localNums)
  return `RM-${String(max + 1).padStart(3, '0')}`
}

export const previewImport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded', code: 'VALIDATION_ERROR' })
    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true })
    const summary = {}
    const detectedAs = {}

    for (const name of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' })
      const columns = rows.length > 0 ? Object.keys(rows[0]) : []
      summary[name] = { rowCount: rows.length, columns, sample: rows.slice(0, 3) }

      // Tag each sheet with what it will be imported as
      const n = name.toLowerCase()
      const fileName = req.file.originalname || ''
      const fileHasBom = /recipe|bom|bill.?of.?material|formula/i.test(fileName)
      const headers = columns.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''))

      if (/product/i.test(n) && !/print|pack|recipe|bom|formula|rm|material|equipment|equip/i.test(n)) detectedAs[name] = 'Product Master'
      else if (/equipment|equip/i.test(n)) detectedAs[name] = 'Equipment Master'
      else if (/rm|material|raw.?mat/i.test(n) && !/print|pack|inward|outward|recipe|bom|product/i.test(n)) detectedAs[name] = 'RM Master'
      else if (/recipe|bom|bill.?of.?material|formula/i.test(n)) detectedAs[name] = 'Recipe / BOM'
      else if (/print|pack.?master/i.test(n)) detectedAs[name] = 'Print Master'
      else if (/inward|goods.?received|grn|receipt/i.test(n)) detectedAs[name] = 'Inward'
      else if (/outward|issuance|issue|dispatch/i.test(n)) detectedAs[name] = 'Outward'
      else {
        // Column-based BOM detection (product + raw material + qty)
        const hasProd = headers.some(h => h.includes('product'))
        const hasRawMat = headers.some(h => h === 'rawmaterial' || (h.includes('raw') && h.includes('material')) || h.includes('ingredient'))
        const hasQty = headers.some(h => h.includes('qty') || h.includes('quantity'))
        if (hasProd && hasRawMat && hasQty) {
          detectedAs[name] = fileHasBom ? 'Recipe / BOM (auto-detected — filename match)' : 'Recipe / BOM (auto-detected by columns)'
        } else {
          // Column-based RM auto-detection
          const hasCode = headers.some(h => h.includes('code') || h.includes('itemcode') || h.includes('itemno') || h.includes('srno'))
          const hasName = headers.some(h => h.includes('name') || h.includes('itemname') || h.includes('description'))
          if (hasCode && hasName) detectedAs[name] = 'RM Master (auto-detected by columns)'
          else detectedAs[name] = '⚠️ Not recognized — will be skipped'
        }
      }
    }

    return res.json({ success: true, data: { sheets: wb.SheetNames, summary, detectedAs, totalSheets: wb.SheetNames.length } })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ success: false, error: e.message, code: 'INTERNAL_ERROR' })
  }
}

export const executeImport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded', code: 'VALIDATION_ERROR' })
    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true })

    const results = {
      rmMaster: 0, productMaster: 0, equipmentMaster: 0,
      recipeBom: 0, printMaster: 0, inward: 0, outward: 0,
      unmatchedRm: 0,
      errors: []
    }

    // ── PRODUCT MASTER ────────────────────────────────────────────────────
    const prodSheet = wb.SheetNames.find(s =>
      /product/i.test(s) && !/print|pack|recipe|bom|formula|rm|material|equipment|equip/i.test(s)
    )
    if (prodSheet) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[prodSheet], { defval: '' })
      for (const row of rows) {
        try {
          let productCode = col(row, 'productcode', 'product code', 'prod code', 'code')
          const productName = col(row, 'productname', 'product name', 'name', 'prod name')
          const plant = col(row, 'plant', 'location', 'unit') || ''
          if (!productName) continue
          const existing = await prisma.productMaster.findFirst({ where: { productName } })
          if (existing) {
            await prisma.productMaster.update({ where: { productCode: existing.productCode }, data: { plant } })
            results.productMaster++
            continue
          }
          if (!productCode) productCode = await nextProductCode([])
          await prisma.productMaster.upsert({
            where: { productCode },
            create: { productCode, productName, plant },
            update: { productName, plant }
          })
          results.productMaster++
        } catch (e) { results.errors.push(`Product row: ${e.message}`) }
      }
    }

    // ── EQUIPMENT MASTER ──────────────────────────────────────────────────
    const equipSheet = wb.SheetNames.find(s => /equipment|equip/i.test(s))
    if (equipSheet) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[equipSheet], { defval: '' })
      for (const row of rows) {
        try {
          const equipName = col(row, 'equipname', 'equip name', 'equipment name', 'name', 'equipment', 'machine', 'reactor', 'work center', 'workcenter', 'asset')
          const locationRaw = col(row, 'plant', 'location', 'unit', 'designated', 'section', 'area', 'department')
          const plant = normalizeEquipSection(locationRaw)
          const workingVolumeRaw = col(row, 'workingvolume', 'working volume', 'volume', 'capacity', 'vol', 'size')
          const workingVolume = safeNum(workingVolumeRaw) || null
          const operation = col(row, 'operation', 'operations', 'process', 'type', 'activity') || ''
          if (!equipName) continue
          await prisma.equipmentMaster.upsert({
            where: { equipName },
            create: { equipName, plant, workingVolume, operation },
            update: { plant, workingVolume, operation }
          })
          results.equipmentMaster++
        } catch (e) { results.errors.push(`Equipment row: ${e.message}`) }
      }
    } else {
      results.errors.push('ℹ️ No Equipment sheet found — sheet tab must contain "equipment" or "equip".')
    }

    // ── RM MASTER ─────────────────────────────────────────────────────────
    // 1. Try sheet-name detection first
    let rmSheet = wb.SheetNames.find(s =>
      /rm|material|raw.?mat/i.test(s) && !/print|pack|inward|outward|recipe|bom|product/i.test(s)
    )

    // 2. Fallback: auto-detect by column headers (catches "Sheet1" etc.)
    if (!rmSheet) {
      const alreadyClaimed = new Set([prodSheet, equipSheet].filter(Boolean))
      rmSheet = wb.SheetNames.find(s => {
        if (alreadyClaimed.has(s)) return false
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { defval: '' })
        if (!rows.length) return false
        const headers = Object.keys(rows[0]).map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''))
        const hasCode = headers.some(h => h.includes('code') || h.includes('itemcode') || h.includes('itemno') || h.includes('srno'))
        const hasName = headers.some(h => h.includes('name') || h.includes('itemname') || h.includes('description') || h.includes('material'))
        return hasCode && hasName
      })
      if (rmSheet) {
        results.errors.push(`ℹ️ RM sheet auto-detected: "${rmSheet}" (tip: name it "RM Master" to avoid this message)`)
      }
    }

    if (rmSheet) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[rmSheet], { defval: '' })
      for (const row of rows) {
        try {
          const itemCode = col(row, 'itemcode', 'item code', 'item_code', 'code', 'rm code', 'material code', 'mat code', 'part no', 'partno', 'sr no', 'srno', 'no')
          const itemName = col(row, 'itemname', 'item name', 'item_name', 'name', 'rm name', 'material name', 'description', 'desc', 'particulars', 'material')
          const uom = col(row, 'uom', 'unit', 'unit of measure', 'unit of meas') || 'KG'
          if (!itemCode || !itemName) continue
          await prisma.rmMaster.upsert({
            where: { itemCode },
            create: { itemCode, itemName, uom },
            update: { itemName, uom }
          })
          results.rmMaster++
        } catch (e) { results.errors.push(`RM row: ${e.message}`) }
      }
    }

    // ── RECIPE / BOM ──────────────────────────────────────────────────────
    const bomClaimed = new Set([prodSheet, equipSheet, rmSheet].filter(Boolean))

    let recipeSheet = wb.SheetNames.find(s => /recipe|bom|bill.?of.?material|formula/i.test(s))

    // Fallback 1: filename contains bom/recipe/formula
    if (!recipeSheet) {
      const fileName = req.file.originalname || ''
      if (/recipe|bom|bill.?of.?material|formula/i.test(fileName)) {
        recipeSheet = wb.SheetNames.find(s => {
          if (bomClaimed.has(s)) return false
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { defval: '' })
          if (!rows.length) return false
          const hdrs = Object.keys(rows[0]).map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''))
          return hdrs.some(h => h.includes('product')) &&
                 hdrs.some(h => h === 'rawmaterial' || (h.includes('raw') && h.includes('material')) || h.includes('ingredient')) &&
                 hdrs.some(h => h.includes('qty') || h.includes('quantity'))
        })
        if (recipeSheet) results.errors.push(`ℹ️ BOM sheet auto-detected from filename: "${recipeSheet}" (tip: name the sheet tab "BOM" next time)`)
      }
    }

    // Fallback 2: column-signature detection (product + raw material + qty)
    if (!recipeSheet) {
      recipeSheet = wb.SheetNames.find(s => {
        if (bomClaimed.has(s)) return false
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { defval: '' })
        if (!rows.length) return false
        const hdrs = Object.keys(rows[0]).map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''))
        return hdrs.some(h => h.includes('product')) &&
               hdrs.some(h => h === 'rawmaterial' || (h.includes('raw') && h.includes('material')) || h.includes('ingredient')) &&
               hdrs.some(h => h.includes('qty') || h.includes('quantity'))
      })
      if (recipeSheet) results.errors.push(`ℹ️ BOM sheet auto-detected by columns: "${recipeSheet}" (tip: name the sheet tab "BOM" next time)`)
    }

    if (recipeSheet && !rmSheet) {
      results.errors.push('⚠️ No RM sheet found. Name your sheet "RM Master" or "Raw Material" and ensure it has Item Code + Item Name columns.')
    }

    if (recipeSheet) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[recipeSheet], { defval: '' })
      const productsByName = {}
      const existingProducts = await prisma.productMaster.findMany()
      existingProducts.forEach(p => { productsByName[p.productName.toLowerCase()] = p })
      const rmsByName = {}
      const existingRms = await prisma.rmMaster.findMany()
      existingRms.forEach(r => { rmsByName[r.itemName.toLowerCase()] = r })
      const newProductCodes = []

      // Every recipe row must land in the DB — even one recipe_db has a
      // @@unique([productCode, rmCode]) constraint, so a product with more
      // than one unmatched ingredient can't literally store "NaN" twice.
      // First unmatched ingredient in a product gets "NaN", the next "NaN-2",
      // etc. — still trivially recognizable as unmatched (rmCode starts with
      // "NaN"), and picked up automatically by the existing Fix RM Mapping /
      // recipe-drift-sync tools since neither is a real RM Master code.
      const nanCounters = {} // productCode -> highest NaN suffix used so far
      async function nextNanCode(productCode) {
        if (nanCounters[productCode] === undefined) {
          const existing = await prisma.recipeDb.findMany({
            where: { productCode, rmCode: { startsWith: 'NaN' } },
            select: { rmCode: true },
          })
          let max = 0
          existing.forEach(r => {
            const m = /^NaN(?:-(\d+))?$/.exec(r.rmCode)
            if (m) max = Math.max(max, m[1] ? parseInt(m[1], 10) : 1)
          })
          nanCounters[productCode] = max
        }
        nanCounters[productCode]++
        const n = nanCounters[productCode]
        return n === 1 ? 'NaN' : `NaN-${n}`
      }

      for (const row of rows) {
        try {
          const productName = col(row, 'productname', 'product name', 'product', 'finished good', 'fg name')
          const rmName = col(row, 'rawmaterial', 'raw material', 'rm name', 'material name', 'ingredient', 'component name', 'component', 'rm')
          const qtyPerUnit = safeNum(col(row, 'qty', 'qtyperunit', 'qty per unit', 'quantity', 'qty/unit', 'qty per kg'))
          const uom = col(row, 'uom', 'unit', 'unit of measure') || 'KG'
          const plantRaw = col(row, 'plant', 'location', 'section', 'unit')
          const section = normalizeRecipePlant(plantRaw)
          const concCfu = col(row, 'conc', 'cfu', 'concentration', 'conccfu', 'concfcu')
          const roleType = getRoleType(concCfu)
          if (!productName || !rmName || qtyPerUnit <= 0) continue

          // Product: auto-create if not in master (products come from BOM)
          let product = productsByName[productName.toLowerCase()]
          if (!product) {
            const newCode = await nextProductCode(newProductCodes)
            newProductCodes.push(newCode)
            product = await prisma.productMaster.create({ data: { productCode: newCode, productName, plant: section } })
            productsByName[productName.toLowerCase()] = product
            results.productMaster++
          } else if (!product.plant && section) {
            await prisma.productMaster.update({ where: { productCode: product.productCode }, data: { plant: section } })
          }

          // RM: exact name match only (case-insensitive, trimmed) — no fuzzy
          // matching here. Fuzzy matching risks silently assigning the WRONG
          // item code (seen in testing: "Totally Fake Ingredient Alpha" fuzzy-
          // matched "Alpha Amylase- Liquid" at 80% confidence — clearly not
          // the same thing), which is worse than leaving it for manual review.
          // The recipe's own typed name is NEVER rewritten either way — only
          // the resolved Item Code differs; an unmatched ingredient keeps its
          // original name and gets rmCode "NaN" (or "NaN-2", "NaN-3"... within
          // the same product) instead of being silently dropped, so 100% of
          // BOM lines still make it into recipe_db, reconcilable later via
          // Fix RM Mapping.
          const rm = rmsByName[rmName.toLowerCase()]
          let rmCode
          if (rm) {
            rmCode = rm.itemCode
          } else {
            // Reuse the same placeholder on a re-import of the same file,
            // instead of minting a fresh NaN-n every time.
            const existingNanRow = await prisma.recipeDb.findFirst({
              where: { productCode: product.productCode, rmName, rmCode: { startsWith: 'NaN' } },
            })
            rmCode = existingNanRow ? existingNanRow.rmCode : await nextNanCode(product.productCode)
            results.unmatchedRm = (results.unmatchedRm || 0) + 1
            results.errors.push(`❌ RM not found: "${rmName}" (product: ${productName}) — imported with item code "${rmCode}"; add it to RM Master with this exact name, then use Fix RM Mapping to reconcile`)
          }

          const finalRoleType = roleType || 'INGREDIENT'
          await prisma.recipeDb.upsert({
            where: { productCode_rmCode: { productCode: product.productCode, rmCode } },
            create: { productCode: product.productCode, productName: product.productName, rmCode, rmName, qtyPerUnit, uom, roleType: finalRoleType },
            update: { qtyPerUnit, uom, productName: product.productName, rmName, roleType: finalRoleType }
          })
          results.recipeBom++
        } catch (e) { results.errors.push(`Recipe row: ${e.message}`) }
      }
    }

    // ── PRINT MASTER ───────────────────────────────────────────────────────
    const pmSheet = wb.SheetNames.find(s => /print|pack.?master/i.test(s))
    if (pmSheet) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[pmSheet], { defval: '' })
      for (const row of rows) {
        try {
          const packId   = col(row, 'pack id', 'packid', 'pack_id')
          const itemCode = col(row, 'item code', 'itemcode', 'item_code')
          const itemName = col(row, 'item name', 'itemname', 'item_name')
          const lotNo    = col(row, 'lot no', 'lotno', 'lot_no', 'batch code', 'batchcode')
          const bagNo    = parseInt(col(row, 'bag no', 'bagno', 'bag_no', 'bag number') || '1') || 1
          const packQty  = safeNum(col(row, 'pack qty', 'packqty', 'pack_qty', 'qty per bag', 'quantity'))
          const uom      = col(row, 'uom', 'unit') || 'KG'
          const supplier = col(row, 'supplier', 'vendor', 'supplier name')
          const invoiceNo = col(row, 'invoice no', 'invoiceno', 'invoice_no', 'invoice number')
          const rdRaw    = col(row, 'received date', 'receiveddate', 'receipt date', 'date received')
          const receivedDate = parseDate(rdRaw)
          if (!packId || !itemCode) continue
          const rmExists = await prisma.rmMaster.findUnique({ where: { itemCode } })
          if (!rmExists && itemName) {
            await prisma.rmMaster.upsert({ where: { itemCode }, create: { itemCode, itemName, uom }, update: {} })
          }
          const statusRaw = col(row, 'status').toLowerCase()
          const status = statusRaw.includes('inward') || statusRaw === 'inwarded' ? 'INWARDED' : 'AWAITING_INWARD'
          const existing = await prisma.printMaster.findUnique({ where: { packId } })
          if (!existing) {
            await prisma.printMaster.create({
              data: { packId, itemCode, itemName: itemName || itemCode, lotNo: lotNo || '2025-001', bagNo, packQty, uom, supplier: supplier || null, invoiceNo: invoiceNo || null, receivedDate, status }
            })
            results.printMaster++
          }
        } catch (e) { results.errors.push(`Pack row: ${e.message}`) }
      }
    }

    // ── INWARD ─────────────────────────────────────────────────────────────
    const inSheet = wb.SheetNames.find(s => /inward|goods.?received|grn|receipt/i.test(s))
    if (inSheet) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[inSheet], { defval: '' })
      for (const row of rows) {
        try {
          const packId    = col(row, 'pack id', 'packid', 'pack_id', 'scan')
          const warehouse = col(row, 'warehouse', 'ware house', 'location', 'store') || 'Main Store'
          const dateRaw   = col(row, 'date of inward', 'inward date', 'date', 'received date')
          const inwardTime = parseDate(dateRaw) || new Date()
          if (!packId) continue
          const pack = await prisma.printMaster.findUnique({ where: { packId } })
          if (!pack) { results.errors.push(`Inward: Pack ${packId} not in Print Master`); continue }
          const alreadyIn = await prisma.inward.findFirst({ where: { packId } })
          if (alreadyIn) continue
          await prisma.$transaction(async (tx) => {
            await tx.inward.create({ data: { packId, itemCode: pack.itemCode, itemName: pack.itemName, lotNo: pack.lotNo, bagNo: pack.bagNo, qty: pack.packQty, inwardTime, warehouse } })
            await tx.packBalance.upsert({ where: { packId }, create: { packId, itemCode: pack.itemCode, totalQty: pack.packQty, remainingQty: pack.packQty }, update: {} })
            await tx.printMaster.update({ where: { packId }, data: { status: 'INWARDED' } })
            const prev = await tx.stockLedger.findFirst({ where: { itemCode: pack.itemCode }, orderBy: { timestamp: 'desc' } })
            await tx.stockLedger.create({ data: { itemCode: pack.itemCode, sourceId: packId, transactionType: 'INWARD', inQty: pack.packQty, balance: (prev?.balance || 0) + pack.packQty, reference: `Import | ${warehouse}` } })
          })
          results.inward++
        } catch (e) { results.errors.push(`Inward row: ${e.message}`) }
      }
    }

    // ── OUTWARD ────────────────────────────────────────────────────────────
    const outSheet = wb.SheetNames.find(s => /outward|issuance|issue|dispatch/i.test(s))
    if (outSheet) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[outSheet], { defval: '' })
      for (const row of rows) {
        try {
          const sourceId   = col(row, 'source id', 'sourceid', 'pack id', 'packid', 'scan')
          const txType     = col(row, 'transaction type', 'type', 'tx type') || 'BOM_ISSUANCE'
          const issuedQty  = safeNum(col(row, 'issued qty', 'issuedqty', 'qty', 'quantity issued'))
          const bomNo      = col(row, 'bom no', 'bomno', 'indent', 'indent id')
          const issuedTo   = col(row, 'issued to', 'issuedto', 'department', 'plant', 'dept')
          const remarks    = col(row, 'remarks', 'remark', 'notes')
          const txBy       = col(row, 'transaction made by', 'transacted by', 'done by', 'operator')
          const dateRaw    = col(row, 'date of issue', 'issue date', 'date')
          const timestamp  = parseDate(dateRaw) || new Date()
          const rmCode     = col(row, 'item code', 'itemcode', 'rm code')
          if (!sourceId || issuedQty <= 0) continue
          const txMap = {
            'issued to production': 'BOM_ISSUANCE', 'bom': 'BOM_ISSUANCE',
            'pack reduction': 'PACK_TO_CONTAINER', 'pack to container': 'PACK_TO_CONTAINER',
            'job work': 'JOB_WORK', 'warehouse transfer': 'WAREHOUSE_TRANSFER',
            'stock recon': 'STOCK_RECON', 'adjustment': 'STOCK_RECON',
          }
          const normalizedType = txMap[txType.toLowerCase()] || txType.toUpperCase().replace(/\s+/g, '_')
          await prisma.outward.create({
            data: {
              sourceId, sourceType: normalizedType,
              rmCode: rmCode || sourceId, qtyIssued: issuedQty,
              remarks: [remarks, issuedTo ? `Issued to: ${issuedTo}` : '', txBy ? `By: ${txBy}` : ''].filter(Boolean).join(' | ') || null,
              indentId: bomNo || null, timestamp,
            }
          })
          const pb = await prisma.packBalance.findUnique({ where: { packId: sourceId } })
          if (pb) {
            await prisma.packBalance.update({ where: { packId: sourceId }, data: { remainingQty: Math.max(0, pb.remainingQty - issuedQty) } })
          }
          results.outward++
        } catch (e) { results.errors.push(`Outward row: ${e.message}`) }
      }
    }

    // ── CUSTOMER PROFILE ───────────────────────────────────────────────────
    const cpSheet = wb.SheetNames.find(s => /customer.?profile|customer.?master|client.?list|customers/i.test(s))
    if (cpSheet) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[cpSheet], { defval: '' })
      const profileMap = {}
      for (const row of rows) {
        const name = col(row, 'customer name', 'customername', 'customer', 'name')
        if (!name) continue
        const key = name.trim().toUpperCase()
        const co  = col(row, 'company', 'co', 'firm') || ''
        const ot  = col(row, 'order type', 'ordertype', 'type') || 'DOMESTIC'
        if (!profileMap[key]) profileMap[key] = { co: {}, ot: {} }
        profileMap[key].co[co] = (profileMap[key].co[co] || 0) + 1
        profileMap[key].ot[ot] = (profileMap[key].ot[ot] || 0) + 1
      }
      for (const [name, counts] of Object.entries(profileMap)) {
        try {
          const company   = Object.entries(counts.co).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
          const orderType = Object.entries(counts.ot).sort((a, b) => b[1] - a[1])[0]?.[0] || 'DOMESTIC'
          const orderCount = Object.values(counts.co).reduce((a, b) => a + b, 0)
          const existing = await prisma.customerProfile.findUnique({ where: { customerName: name } })
          if (existing) {
            if (orderCount > existing.orderCount) {
              await prisma.customerProfile.update({ where: { customerName: name }, data: { company, orderType, orderCount } })
            }
          } else {
            await prisma.customerProfile.create({ data: { customerName: name, company, orderType, orderCount } })
            results.customerProfiles = (results.customerProfiles || 0) + 1
          }
        } catch (e) { results.errors.push(`CustomerProfile: ${e.message}`) }
      }
    }

    return res.json({
      success: true,
      data: results,
      message: `Import complete — Products: ${results.productMaster}, Equipment: ${results.equipmentMaster}, RM: ${results.rmMaster}, Recipe/BOM: ${results.recipeBom}, Customer Profiles: ${results.customerProfiles || 0}, Packs: ${results.printMaster}, Inward: ${results.inward}, Outward: ${results.outward}`
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ success: false, error: e.message, code: 'INTERNAL_ERROR' })
  }
}
