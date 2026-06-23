// ─────────────────────────────────────────────────────────────────────────────
// shared/utils.js
// Pure helper functions — no React, no imports.
// Safe to use in any component or test.
// ─────────────────────────────────────────────────────────────────────────────

// ── Date formatting ───────────────────────────────────────────────────────────

/** Format a date value → "DD Mon YYYY" (Indian locale) */
export function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

/** Add N calendar days to "YYYY-MM-DD" → "YYYY-MM-DD" */
export function addDays(dateStr, days) {
  if (!dateStr || !days) return ''
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

/** Days until a date (negative = overdue, null if no date given) */
export function etdDays(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000)
}

// ── Batch number helpers ──────────────────────────────────────────────────────

/**
 * Parse "AQ260501" → { prefix:'AQ', yy:'26', mm:'05', seq:'01' }
 * Returns null if the format doesn't match.
 */
export function parseBatch(batchNo) {
  if (!batchNo) return null
  const m = batchNo.match(/^([A-Za-z]+)(\d{2})(\d{2})(\d{2,3})$/)
  if (!m) return null
  return { prefix: m[1], yy: m[2], mm: m[3], seq: m[4] }
}

/**
 * Suggest the next batch number based on the previous one.
 * - Keeps the prefix
 * - Updates YYMM to today
 * - Same month → increments seq; new month → resets seq to 01
 */
export function suggestNextBatch(lastBatchNo) {
  const p = parseBatch(lastBatchNo)
  if (!p) return lastBatchNo || ''
  const now  = new Date()
  const yy   = String(now.getFullYear()).slice(-2)
  const mm   = String(now.getMonth() + 1).padStart(2, '0')
  const sameMonth = p.yy === yy && p.mm === mm
  const nextSeq = sameMonth
    ? String(parseInt(p.seq) + 1).padStart(p.seq.length, '0')
    : '01'.padStart(p.seq.length, '0')
  return p.prefix + yy + mm + nextSeq
}

// ── Packing calculation ───────────────────────────────────────────────────────

/**
 * Auto-calculate total secondary packs.
 * totalCS = ceil(totalQty / (unitQty × unitsPerCS))
 * Returns '' when any input is missing or invalid.
 */
export function calcTotalCS(totalQty, unitQty, unitsPerCS) {
  const tq = parseFloat(totalQty)
  const uq = parseFloat(unitQty)
  const up = parseInt(unitsPerCS)
  if (!tq || !uq || !up || uq <= 0 || up <= 0) return ''
  return String(Math.ceil(tq / (uq * up)))
}
