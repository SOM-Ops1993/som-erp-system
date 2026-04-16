/**
 * Lot Number Auto-Generator
 * Format: YYYY-SEQ (e.g., 2026-001)
 * Sequence resets per (item_code, year)
 * Uses atomic DB function — safe for concurrent requests
 */

import prisma from '../db.js'

/**
 * Generate next lot number for an item in the current year.
 * Returns a string like "2026-001"
 * @param {string} itemCode
 * @param {number} [year] - defaults to current year
 * @returns {Promise<string>}
 */
export async function generateLotNo(itemCode, year) {
  const y = year || new Date().getFullYear()

  // Atomic increment using DB function (prevents race conditions)
  const result = await prisma.$queryRaw`
    SELECT get_next_lot_seq(${itemCode}::varchar, ${y}::int) AS seq
  `
  const seq = Number(result[0].seq)
  const lotNo = `${y}-${String(seq).padStart(3, '0')}`
  return lotNo
}

/**
 * Get current lot sequence without incrementing (for display purposes)
 * @param {string} itemCode
 * @param {number} [year]
 * @returns {Promise<number>}
 */
export async function getCurrentLotSeq(itemCode, year) {
  const y = year || new Date().getFullYear()
  const record = await prisma.lotSequence.findUnique({
    where: { itemCode_year: { itemCode, year: y } },
  })
  return record?.lastSeq || 0
}

/**
 * Preview what the next lot_no will be (without consuming it)
 * @param {string} itemCode
 * @param {number} [year]
 * @returns {Promise<string>}
 */
export async function previewNextLotNo(itemCode, year) {
  const y = year || new Date().getFullYear()
  const current = await getCurrentLotSeq(itemCode, y)
  return `${y}-${String(current + 1).padStart(3, '0')}`
}
