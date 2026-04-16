import prisma from '../db.js'
import * as XLSX from 'xlsx'
import { findBestRmMatch } from '../utils/fuzzy.js'

// Flexible column finder - matches any variant of expected names
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

// Auto-generate next product code: PROD-001, PROD-002, ...
async function nextProductCode(existingCodes) {
  const allCodes = await prisma.productMaster.findMany({ select: { productCode: true } })
  const dbNums = allCodes
    .map(p => parseInt(p.productCode.replace(/\D/g, '')))
    .filter(n => !isNaN(n))
  const localNums = existingCodes
    .map(c => parseInt(c.replace(/\D/g, '')))
    .filter(n => !isNaN(n))
  const max = Math.max(0, ...dbNums, ...localNums)
  return `PROD-${String(max + 1).padStart(3, '0')}`
}

// Auto-generate next RM code: RM-001, RM-002, ...
async function nextRmCode(existingCodes) {
  const allCodes = await prisma.rmMaster.findMany({ select: { itemCode: true } })
  const dbNums = allCodes
    .map(p => parseInt(p.itemCode.replace(/\D/g, '')))
    .filter(n => !isNaN(n))
  const localNums = existingCodes
    .map(c => parseInt(c.replace(/\D/g, '')))
    .filter(n => !isNaN(n))
  const max = Math.max(0, ...dbNums, ...localNums)
  return `RM-${String(max + 1).padStart(3, '0')}`
}

export default async function importRoutes(fastify) {

  // Preview - read and summarise without writing
  fastify.post('/preview', async (req, reply) => {
    try {
      const data = await req.file()
      if (!data) return reply.status(400).send({ success: false, error: 'No file uploaded' })
      const buffer = await data.toBuffer()
      const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
      const summary = {}
      for (const name of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' })
        summary[name] = {
          rowCount: rows.length,
          columns: rows.length > 0 ? Object.keys(rows[0]) : [],
          sample: rows.slice(0, 3)
        }
      }
      return { success: true, data: { sheets: wb.SheetNames, summary, totalSheets: wb.SheetNames.length } }
    } catch (e) {
      fastify.log.error(e)
      return reply.status(500).send({ success: false, error: e.message })
    }
  })

  // Execute import
  fastify.post('/execute', async (req, reply) => {
    try {
      const data = await req.file()
      if (!data) return reply.status(400).send({ success: false, error: 'No file uploaded' })
      const buffer = await data.toBuffer()
      const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })

      const results = {
        rmMaster: 0, productMaster: 0, equipmentMaster: 0,
        recipeBom: 0, printMaster: 0, inward: 0, outward: 0,
        fuzzyMatches: 0, fuzzyLog: [],
        errors: []
      }

      // ── PRODUCT MASTER ────────────────────────────────────────────────────
      // Matches sheet: product master, products, product (but NOT print/pack/recipe/bom)
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

            // Check if product exists by name
            const existing = await prisma.productMaster.findFirst({ where: { productName } })
            if (existing) {
              await prisma.productMaster.update({
                where: { productCode: existing.productCode },
                data: { plant }
              })
              results.productMaster++
              continue
            }

            // Auto-generate product code if not provided
            if (!productCode) {
              productCode = await nextProductCode([])
            }
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
      // Sheet name: "Equipment Master" or "Equipment"
      // Required cols: Equipment Name | Working Volume | Operation | Plant
      const equipSheet = wb.SheetNames.find(s => /equipment|equip/i.test(s))
      if (equipSheet) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[equipSheet], { defval: '' })
        for (const row of rows) {
          try {
            const equipName = col(row, 'equipname', 'equip name', 'equipment name', 'name', 'equipment')
            const plant = col(row, 'plant', 'location', 'unit') || ''
            const workingVolumeRaw = col(row, 'workingvolume', 'working volume', 'volume', 'capacity', 'vol')
            const workingVolume = workingVolumeRaw ? parseFloat(workingVolumeRaw) || null : null
            const operation = col(row, 'operation', 'operations', 'process', 'type') || ''
            if (!equipName) continue
            // Try with new fields first; fallback to basic if migration not yet applied
            try {
              await prisma.equipmentMaster.upsert({
                where: { equipName },
                create: { equipName, plant, workingVolume, operation },
                update: { plant, workingVolume, operation }
              })
            } catch {
              await prisma.equipmentMaster.upsert({
                where: { equipName },
                create: { equipName, plant },
                update: { plant }
              })
            }
            results.equipmentMaster++
          } catch (e) { results.errors.push(`Equipment row: ${e.message}`) }
        }
      }

      // ── RM MASTER ─────────────────────────────────────────────────────────
      const rmSheet = wb.SheetNames.find(s =>
        /rm|material|raw.?mat/i.test(s) && !/print|pack|inward|outward|recipe|bom|product/i.test(s)
      )
      if (rmSheet) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[rmSheet], { defval: '' })
        for (const row of rows) {
          try {
            const itemCode = col(row, 'itemcode', 'item code', 'code', 'rm code')
            const itemName = col(row, 'itemname', 'item name', 'name', 'rm name', 'material name')
            const uom = col(row, 'uom', 'unit', 'unit of measure') || 'KG'
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
      // Matches sheet: recipe, bom, bill of materials, formula, formulation
      const recipeSheet = wb.SheetNames.find(s =>
        /recipe|bom|bill.?of.?material|formula/i.test(s)
      )
      if (recipeSheet) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[recipeSheet], { defval: '' })

        // Build lookup maps
        const productsByName = {}
        const existingProducts = await prisma.productMaster.findMany()
        existingProducts.forEach(p => { productsByName[p.productName.toLowerCase()] = p })

        const rmsByName = {}
        const existingRms = await prisma.rmMaster.findMany()
        existingRms.forEach(r => { rmsByName[r.itemName.toLowerCase()] = r })

        // Track new codes generated in this batch
        const newProductCodes = []
        const newRmCodes = []

        for (const row of rows) {
          try {
            const productName = col(row, 'productname', 'product name', 'product', 'finished good', 'fg name')
            const rmName = col(row, 'rawmaterial', 'raw material', 'rm name', 'material name', 'ingredient', 'rm')
            const qtyPerUnit = safeNum(col(row, 'qty', 'qtyperunit', 'qty per unit', 'quantity', 'qty/unit'))
            const uom = col(row, 'uom', 'unit', 'unit of measure') || 'KG'

            if (!productName || !rmName || qtyPerUnit <= 0) continue

            // Resolve or create product
            let product = productsByName[productName.toLowerCase()]
            if (!product) {
              const newCode = await nextProductCode(newProductCodes)
              newProductCodes.push(newCode)
              product = await prisma.productMaster.create({
                data: { productCode: newCode, productName, plant: '' }
              })
              productsByName[productName.toLowerCase()] = product
            }

            // Resolve RM — try exact, then fuzzy, then create new
            let rm = rmsByName[rmName.toLowerCase()]
            let fuzzyNote = null
            if (!rm) {
              // Build candidate list from all known RMs (DB + batch)
              const candidates = Object.values(rmsByName)
              const fuzzyMatch = findBestRmMatch(rmName, candidates.map(r => ({ itemCode: r.itemCode, itemName: r.itemName })))
              if (fuzzyMatch && fuzzyMatch.score >= 0.80) {
                // Use the matched RM — don't create a new one
                rm = rmsByName[fuzzyMatch.candidate.itemName.toLowerCase()]
                fuzzyNote = `Fuzzy matched "${rmName}" → "${fuzzyMatch.candidate.itemName}" (${(fuzzyMatch.score * 100).toFixed(0)}%)`
                results.fuzzyMatches = (results.fuzzyMatches || 0) + 1
                if (fuzzyNote) results.fuzzyLog = [...(results.fuzzyLog || []), fuzzyNote]
              } else {
                // Genuinely new RM — create it
                const newCode = await nextRmCode(newRmCodes)
                newRmCodes.push(newCode)
                rm = await prisma.rmMaster.create({
                  data: { itemCode: newCode, itemName: rmName, uom }
                })
                rmsByName[rmName.toLowerCase()] = rm
              }
            }

            // Upsert recipe row
            await prisma.recipeDb.upsert({
              where: { productCode_rmCode: { productCode: product.productCode, rmCode: rm.itemCode } },
              create: {
                productCode: product.productCode,
                productName: product.productName,
                rmCode: rm.itemCode,
                rmName: rm.itemName,
                qtyPerUnit,
                uom
              },
              update: { qtyPerUnit, uom, productName: product.productName, rmName: rm.itemName }
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
              await prisma.rmMaster.upsert({
                where: { itemCode },
                create: { itemCode, itemName, uom },
                update: {}
              })
            }

            const statusRaw = col(row, 'status').toLowerCase()
            const status = statusRaw.includes('inward') || statusRaw === 'inwarded'
              ? 'INWARDED' : 'AWAITING_INWARD'

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
              await tx.inward.create({
                data: { packId, itemCode: pack.itemCode, itemName: pack.itemName, lotNo: pack.lotNo, bagNo: pack.bagNo, qty: pack.packQty, inwardTime, warehouse }
              })
              await tx.packBalance.upsert({
                where: { packId },
                create: { packId, itemCode: pack.itemCode, totalQty: pack.packQty, remainingQty: pack.packQty },
                update: {}
              })
              await tx.printMaster.update({ where: { packId }, data: { status: 'INWARDED' } })
              const prev = await tx.stockLedger.findFirst({ where: { itemCode: pack.itemCode }, orderBy: { timestamp: 'desc' } })
              await tx.stockLedger.create({
                data: { itemCode: pack.itemCode, sourceId: packId, transactionType: 'INWARD', inQty: pack.packQty, balance: (prev?.balance || 0) + pack.packQty, reference: `Import | ${warehouse}` }
              })
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
              const newQty = Math.max(0, pb.remainingQty - issuedQty)
              await prisma.packBalance.update({ where: { packId: sourceId }, data: { remainingQty: newQty } })
            }
            results.outward++
          } catch (e) { results.errors.push(`Outward row: ${e.message}`) }
        }
      }

      return {
        success: true,
        data: results,
        message: `Import complete — Products: ${results.productMaster}, Equipment: ${results.equipmentMaster}, RM: ${results.rmMaster}, Recipe/BOM: ${results.recipeBom}, Packs: ${results.printMaster}, Inward: ${results.inward}, Outward: ${results.outward}`
      }
    } catch (e) {
      fastify.log.error(e)
      return reply.status(500).send({ success: false, error: e.message })
    }
  })
}
