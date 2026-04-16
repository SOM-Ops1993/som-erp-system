/**
 * Legacy Data Import Service
 * Imports existing Excel data (QR- INVENTORY SYSTEM.xlsx)
 * Maps all 5 outward transaction types
 * Cleans lot number anomalies
 * Rebuilds stock ledger from scratch
 */

import XLSX from 'xlsx'
import prisma from '../db.js'
import { extractLbl } from './pack-generator.js'

/**
 * Clean a raw lot number value (from Excel).
 * Handles: date objects, numeric years, slash-separated codes.
 */
function cleanLotNo(raw) {
  if (!raw || raw === 'nan' || raw === 'NaN') return '1'
  const s = String(raw).trim()
  // Excel date artefact: "2627-01-01 00:00:00" → "2627/01"
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const parts = s.split('-')
    return `${parts[0]}/${parts[1]}`
  }
  return s
}

/**
 * Map outward transaction type from Excel string to enum value.
 */
function mapTransactionType(excelType) {
  const map = {
    'ISSUED TO PRODUCTION': 'BOM_ISSUANCE',
    'WAREHOUSE TRANSFER': 'WAREHOUSE_TRANSFER',
    'STOCK RECON ADJUSTMENT': 'STOCK_RECON',
    'JOB WORK': 'JOB_WORK',
    'PACK SIZE REDUCTION': 'PACK_REDUCTION',
  }
  return map[excelType?.trim()] || 'BOM_ISSUANCE'
}

/**
 * Parse the uploaded Excel buffer and return structured preview.
 */
export async function previewImport(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })

  const summary = {
    printMaster: 0,
    inward: 0,
    outward: 0,
    items: 0,
    containers: 0,
    awaitingInward: 0,
    legacyLotNormalizations: 0,
    negativeStockItems: [],
    warnings: [],
  }

  // Count rows
  const pmSheet = wb.Sheets['PRINT MASTER']
  if (pmSheet) {
    const rows = XLSX.utils.sheet_to_json(pmSheet, { defval: null })
    summary.printMaster = rows.filter((r) => r['PACK ID\n(AUTO · UNIQUE)']).length
    summary.awaitingInward = rows.filter(
      (r) => r['PACK ID YET TO BE SCANNED'] !== 'SCANNED'
    ).length
  }

  const inSheet = wb.Sheets['INWARD']
  if (inSheet) {
    const rows = XLSX.utils.sheet_to_json(inSheet, { defval: null })
    summary.inward = rows.filter((r) => r['PACK ID\n🔍 SCAN HERE']).length
  }

  const outSheet = wb.Sheets['OUTWARD']
  if (outSheet) {
    const rows = XLSX.utils.sheet_to_json(outSheet, { defval: null })
    summary.outward = rows.filter((r) => r['SOURCE ID\n🔍 SCAN']).length
  }

  const stockSheet = wb.Sheets['STOCK']
  if (stockSheet) {
    const rows = XLSX.utils.sheet_to_json(stockSheet, { defval: null })
    summary.items = rows.filter((r) => r['ITEM NAME']).length
    const negItems = rows.filter(
      (r) => r['BAGS IN\nSTOCK'] < 0
    )
    summary.negativeStockItems = negItems.map((r) => ({
      itemName: r['ITEM NAME'],
      itemCode: r['ITEM CODE'],
      bags: r['BAGS IN\nSTOCK'],
    }))
  }

  const contSheet = wb.Sheets['CONTAINER MASTER']
  if (contSheet) {
    const rows = XLSX.utils.sheet_to_json(contSheet, { defval: null })
    summary.containers = rows.filter((r) => r['CONTAINER ID\n(AUTO: CONT001…)']).length
  }

  return summary
}

/**
 * Execute the full import in one transaction.
 * Order: RM Master → Print Master → Inward → Outward → Containers → Ledger rebuild
 */
export async function executeImport(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })

  const results = {
    rmInserted: 0,
    packsInserted: 0,
    inwardInserted: 0,
    outwardInserted: 0,
    containersInserted: 0,
    ledgerEntries: 0,
    errors: [],
  }

  // ── 1. Parse all sheets ──────────────────────────────────────
  const stockRows = wb.Sheets['STOCK']
    ? XLSX.utils.sheet_to_json(wb.Sheets['STOCK'], { defval: null })
      .filter((r) => r['ITEM NAME'] && r['ITEM CODE'])
    : []

  const pmRows = wb.Sheets['PRINT MASTER']
    ? XLSX.utils.sheet_to_json(wb.Sheets['PRINT MASTER'], { defval: null })
      .filter((r) => r['PACK ID\n(AUTO · UNIQUE)'])
    : []

  const inwardRows = wb.Sheets['INWARD']
    ? XLSX.utils.sheet_to_json(wb.Sheets['INWARD'], { defval: null })
      .filter((r) => r['PACK ID\n🔍 SCAN HERE'])
    : []

  const outwardRows = wb.Sheets['OUTWARD']
    ? XLSX.utils.sheet_to_json(wb.Sheets['OUTWARD'], { defval: null })
      .filter((r) => r['SOURCE ID\n🔍 SCAN'])
    : []

  const contRows = wb.Sheets['CONTAINER MASTER']
    ? XLSX.utils.sheet_to_json(wb.Sheets['CONTAINER MASTER'], { defval: null })
      .filter((r) => r['CONTAINER ID\n(AUTO: CONT001…)'])
    : []

  // ── 2. Build inward pack ID set for quick lookup ──────────────
  const inwaredPackIds = new Set(inwardRows.map((r) => r['PACK ID\n🔍 SCAN HERE']))

  // ── Execute in transaction ────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    // ── RM Master ───────────────────────────────────────────────
    for (const row of stockRows) {
      const itemCode = String(row['ITEM CODE']).trim()
      const itemName = String(row['ITEM NAME']).trim()
      const uom = row['UOM'] ? String(row['UOM']).trim() : 'Kg'
      const reorderLevel = row['REORDER\nLEVEL (kG)'] || null

      await tx.rmMaster.upsert({
        where: { itemCode },
        update: { itemName, uom, reorderLevel: reorderLevel ? Number(reorderLevel) : null },
        create: { itemCode, itemName, uom, reorderLevel: reorderLevel ? Number(reorderLevel) : null },
      })
      results.rmInserted++
    }

    // ── Print Master ────────────────────────────────────────────
    for (const row of pmRows) {
      const packId = String(row['PACK ID\n(AUTO · UNIQUE)']).trim()
      const itemCode = String(row['ITEM\nCODE']).trim()
      const itemName = String(row['ITEM NAME']).trim()
      const rawLotNo = row['LOT NO.']
      const lotNo = cleanLotNo(rawLotNo)
      const bagNo = parseInt(row['BAG NO']) || 1
      const packQty = parseFloat(row['PACK\nQTY']) || 0
      const uom = row['UOM'] ? String(row['UOM']).trim() : 'Kg'
      const isInwarded = inwaredPackIds.has(packId)
      const labelName = extractLbl(itemName)

      let receivedDate = null
      if (row['RECEIVED\nDATE']) {
        const d = row['RECEIVED\nDATE']
        receivedDate = d instanceof Date ? d : new Date(d)
        if (isNaN(receivedDate.getTime())) receivedDate = null
      }

      try {
        await tx.printMaster.upsert({
          where: { packId },
          update: {},
          create: {
            packId,
            itemCode,
            itemName,
            lotNo,
            bagNo,
            packQty,
            uom,
            labelName,
            receivedDate,
            supplier: row['SUPPLIER'] ? String(row['SUPPLIER']).trim() : null,
            invoiceNo: row['INVOICE\nNO.'] ? String(row['INVOICE\nNO.']).trim() : null,
            supplierBatch: row['BATCH CODE\n(If Avl.)'] ? String(row['BATCH CODE\n(If Avl.)']).trim() : null,
            remarks: row['REMARKS'] ? String(row['REMARKS']).trim() : null,
            status: isInwarded ? 'INWARDED' : 'AWAITING_INWARD',
            isLegacy: true,
          },
        })
        results.packsInserted++
      } catch (e) {
        results.errors.push(`Pack ${packId}: ${e.message}`)
      }
    }

    // ── Inward records ───────────────────────────────────────────
    for (const row of inwardRows) {
      const packId = String(row['PACK ID\n🔍 SCAN HERE']).trim()
      const itemCode = String(row['ITEM CODE\n(AUTO)']).trim()
      const itemName = String(row['ITEM NAME\n(AUTO)']).trim()
      const lotNo = cleanLotNo(row['LOT NO.\n(AUTO)'])
      const bagNo = parseInt(row['BAG NO.\n(AUTO)']) || 1
      const qty = parseFloat(row['PACK QTY\n(AUTO)']) || 0
      const uom = row['UOM\n(AUTO)'] ? String(row['UOM\n(AUTO)']).trim() : 'Kg'
      const warehouse = row['WAREHOUSE'] ? String(row['WAREHOUSE']).trim() : 'MAIN'
      const rawDate = row['DATE OF INWARD']
      const inwardDate = rawDate instanceof Date ? rawDate : rawDate ? new Date(rawDate) : new Date()

      try {
        await tx.inward.upsert({
          where: { packId },
          update: {},
          create: {
            packId,
            itemCode,
            itemName,
            lotNo,
            bagNo,
            qty,
            uom,
            warehouse,
            inwardDate: new Date(inwardDate.toISOString().split('T')[0]),
            inwardTime: inwardDate,
            batchId: 'LEGACY_IMPORT',
            isLegacy: true,
          },
        })

        // Pack balance
        await tx.packBalance.upsert({
          where: { packId },
          update: {},
          create: {
            packId,
            itemCode,
            originalQty: qty,
            issuedQty: 0,
            remainingQty: qty,
            isExhausted: false,
          },
        })

        results.inwardInserted++
      } catch (e) {
        results.errors.push(`Inward ${packId}: ${e.message}`)
      }
    }

    // ── Outward records ──────────────────────────────────────────
    for (const row of outwardRows) {
      const sourceId = String(row['SOURCE ID\n🔍 SCAN']).trim()
      const excelType = row['TRANSACTION\nTYPE'] ? String(row['TRANSACTION\nTYPE']).trim() : ''
      const transactionType = mapTransactionType(excelType)
      const itemCode = String(row['ITEM CODE\n(AUTO)']).trim()
      const qtyIssued = parseFloat(row['ISSUED \nQTY (kG)']) || 0
      const uom = row['UOM\n(AUTO)'] ? String(row['UOM\n(AUTO)']).trim() : 'Kg'
      const rawDate = row['DATE OF\nISSUE']
      const timestamp = rawDate instanceof Date ? rawDate : rawDate ? new Date(rawDate) : new Date()

      try {
        await tx.outward.create({
          data: {
            transactionType,
            sourceId,
            sourceType: 'PACK',
            rmCode: itemCode,
            qtyIssued,
            uom,
            destination: row['ISSUED TO\n(Dept / Plant)'] ? String(row['ISSUED TO\n(Dept / Plant)']).trim() : null,
            bomRef: row['BOM\nNO.'] ? String(row['BOM\nNO.']).trim() : null,
            remarks: row['REMARKS'] ? String(row['REMARKS']).trim() : null,
            isLegacy: true,
            timestamp,
          },
        })

        // Update pack balance (reduce remaining)
        const pb = await tx.packBalance.findUnique({ where: { packId: sourceId } })
        if (pb) {
          const newRemaining = Math.max(0, Number(pb.remainingQty) - qtyIssued)
          await tx.packBalance.update({
            where: { packId: sourceId },
            data: {
              issuedQty: { increment: qtyIssued },
              remainingQty: newRemaining,
              isExhausted: newRemaining === 0,
            },
          })
        }

        results.outwardInserted++
      } catch (e) {
        results.errors.push(`Outward ${sourceId}: ${e.message}`)
      }
    }

    // ── Containers ───────────────────────────────────────────────
    for (const row of contRows) {
      const rawId = row['CONTAINER ID\n(AUTO: CONT001…)']
      if (!rawId) continue
      const containerId = String(rawId).trim()
      const itemCode = String(row['ITEM CODE']).trim()
      const itemName = String(row['ITEM NAME']).trim()
      const currentQty = parseFloat(row['CURRENT\nQTY (Kg)']) || 0
      const capacity = row['CAPACITY\n(Kg / L)'] ? parseFloat(row['CAPACITY\n(Kg / L)']) : null
      const uom = row['UOM'] ? String(row['UOM']).trim() : 'Kg'
      const rawStatus = row['STATUS\n(Active / Inactive)'] || ''
      const status = rawStatus.includes('Active') ? 'ACTIVE' : 'EMPTY'

      try {
        await tx.containerMaster.upsert({
          where: { itemCode },
          update: { currentQty, status, capacity },
          create: { containerId, itemCode, itemName, capacity, currentQty, uom, status },
        })
        results.containersInserted++
      } catch (e) {
        results.errors.push(`Container ${containerId}: ${e.message}`)
      }
    }

    // ── Rebuild Stock Ledger ─────────────────────────────────────
    // Replay all inward and outward in timestamp order
    // Clear any existing legacy ledger entries first
    await tx.stockLedger.deleteMany({ where: { isLegacy: true } })

    // Get all items
    const allItems = await tx.rmMaster.findMany({ select: { itemCode: true } })

    for (const { itemCode } of allItems) {
      let balance = 0

      // Get all inward records for this item sorted by time
      const ins = await tx.inward.findMany({
        where: { itemCode, isLegacy: true },
        orderBy: { inwardTime: 'asc' },
      })

      // Get all outward records for this item sorted by time
      const outs = await tx.outward.findMany({
        where: { rmCode: itemCode, isLegacy: true },
        orderBy: { timestamp: 'asc' },
      })

      // Merge and sort
      const events = [
        ...ins.map((r) => ({ ts: r.inwardTime, type: 'IN', qty: Number(r.qty), ref: `Pack: ${r.packId}` })),
        ...outs.map((r) => ({ ts: r.timestamp, type: 'OUT', qty: Number(r.qtyIssued), ref: r.bomRef || r.remarks || '' })),
      ].sort((a, b) => a.ts - b.ts)

      for (const ev of events) {
        if (ev.type === 'IN') balance += ev.qty
        else balance -= ev.qty

        await tx.stockLedger.create({
          data: {
            itemCode,
            sourceId: ev.ref.slice(0, 60) || 'LEGACY',
            sourceType: ev.type === 'IN' ? 'PACK' : 'OUTWARD',
            transactionType: ev.type === 'IN' ? 'INWARD' : 'OUTWARD',
            inQty: ev.type === 'IN' ? ev.qty : 0,
            outQty: ev.type === 'OUT' ? ev.qty : 0,
            balance,
            reference: ev.ref,
            isLegacy: true,
            timestamp: ev.ts,
          },
        })
        results.ledgerEntries++
      }
    }
  }, { timeout: 300000 }) // 5 minute timeout for large imports

  return results
}
