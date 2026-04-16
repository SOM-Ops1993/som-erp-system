/**
 * Pack ID & Batch Generator
 *
 * Pack ID Format: <LBL>-<ITEMCODE>-<YEAR>-<LOTSEQ>-<BAGNO>
 * Example:        CIT-151464-2026-001-001
 *
 * Rules:
 *  - LBL = first 3 ALPHANUMERIC chars of item_name (uppercase, no spaces/symbols)
 *  - LOTSEQ = last 3 digits of lot_no (e.g., "2026-001" → "001")
 *  - BAGNO = 3-digit zero-padded sequential within lot
 *  - Globally unique (enforced by DB unique constraint)
 */

import prisma from '../db.js'
import { generateLotNo } from './lot-generator.js'

/**
 * Extract the 3-letter label prefix from item name.
 * Takes first 3 alphanumeric characters (uppercase).
 */
export function extractLbl(itemName) {
  const alphanum = itemName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return alphanum.slice(0, 3).padEnd(3, 'X') // pad if name too short
}

/**
 * Build a Pack ID string from its components.
 */
export function buildPackId(lbl, itemCode, year, lotNo, bagNo) {
  // lotNo format is "YYYY-SEQ", extract just SEQ part
  const lotSeq = lotNo.split('-').pop() // "2026-001" → "001"
  const bagStr = String(bagNo).padStart(3, '0')
  return `${lbl}-${itemCode}-${year}-${lotSeq}-${bagStr}`
}

/**
 * Generate a batch of packs for a single lot.
 * Creates one new lot automatically.
 *
 * @param {object} params
 * @param {string} params.itemCode
 * @param {number} params.numBags
 * @param {number} params.packQty   - qty per bag
 * @param {string} params.uom
 * @param {string} [params.supplier]
 * @param {string} [params.invoiceNo]
 * @param {string} [params.supplierBatch]
 * @param {string} [params.receivedDate]  - ISO date string
 * @param {string} [params.remarks]
 * @returns {Promise<{ lotNo: string, packs: PrintMaster[] }>}
 */
export async function generatePackBatch(params) {
  const {
    itemCode, numBags, packQty, uom,
    supplier, invoiceNo, supplierBatch, receivedDate, remarks,
  } = params

  // Fetch item details
  const item = await prisma.rmMaster.findUnique({ where: { itemCode } })
  if (!item) throw new Error(`Item code ${itemCode} not found in RM Master`)

  const year = new Date().getFullYear()
  const lotNo = await generateLotNo(itemCode, year)
  const lbl = extractLbl(item.itemName)

  // Build all pack records
  const packs = []
  for (let i = 1; i <= numBags; i++) {
    const packId = buildPackId(lbl, itemCode, year, lotNo, i)
    packs.push({
      packId,
      itemCode,
      itemName: item.itemName,
      lotNo,
      bagNo: i,
      packQty: parseFloat(packQty),
      uom: uom || item.uom,
      labelName: lbl,
      receivedDate: receivedDate ? new Date(receivedDate) : null,
      supplier: supplier || null,
      invoiceNo: invoiceNo || null,
      supplierBatch: supplierBatch || null,
      remarks: remarks || null,
      status: 'AWAITING_INWARD',
      isLegacy: false,
    })
  }

  // Bulk insert (transaction — all or nothing)
  await prisma.$transaction(async (tx) => {
    await tx.printMaster.createMany({ data: packs, skipDuplicates: false })
  })

  return { lotNo, lbl, year, packs }
}

/**
 * Get all packs for a lot (for label printing)
 */
export async function getPacksForLot(itemCode, lotNo) {
  return prisma.printMaster.findMany({
    where: { itemCode, lotNo },
    orderBy: { bagNo: 'asc' },
  })
}

/**
 * Get pending (AWAITING_INWARD) packs grouped by item+lot
 * Used in Inward module to show what can be inwarded
 */
export async function getPendingInwardGroups() {
  const groups = await prisma.$queryRaw`
    SELECT
      pm.item_code,
      pm.item_name,
      pm.lot_no,
      pm.uom,
      COUNT(*)::int AS pending_bags,
      SUM(pm.pack_qty)::numeric AS total_qty,
      MIN(pm.received_date) AS received_date,
      MAX(pm.created_at) AS last_generated
    FROM print_master pm
    WHERE pm.status = 'AWAITING_INWARD'
    GROUP BY pm.item_code, pm.item_name, pm.lot_no, pm.uom
    ORDER BY pm.item_name, pm.lot_no
  `
  return groups
}
