/**
 * Fuzzy name matching utility for RM reconciliation.
 * Uses Jaro-Winkler similarity + normalisation to handle:
 *   - Case differences       (bacillus subtilis  ↔  Bacillus Subtilis)
 *   - Extra punctuation      (B. subtilis WP     ↔  B subtilis WP)
 *   - Abbreviations / spaces (trichodermaviridae ↔  Trichoderma viridae)
 *   - Minor typos            (Silcion dioxide    ↔  Silicon dioxide)
 */

// ── Normalise a name for comparison ──────────────────────────────────────────
export function normalizeName(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')   // drop punctuation
    .replace(/\b(wdg|wp|wsg|sc|ec|sl|gr|wg|sp)\b/g, match => match)  // keep common formulation suffixes
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Jaro similarity ──────────────────────────────────────────────────────────
function jaro(s1, s2) {
  if (s1 === s2) return 1
  const l1 = s1.length, l2 = s2.length
  if (l1 === 0 || l2 === 0) return 0
  const matchDist = Math.floor(Math.max(l1, l2) / 2) - 1
  const m1 = new Array(l1).fill(false)
  const m2 = new Array(l2).fill(false)
  let matches = 0

  for (let i = 0; i < l1; i++) {
    const lo = Math.max(0, i - matchDist)
    const hi = Math.min(i + matchDist + 1, l2)
    for (let j = lo; j < hi; j++) {
      if (m2[j] || s1[i] !== s2[j]) continue
      m1[i] = m2[j] = true
      matches++
      break
    }
  }
  if (matches === 0) return 0

  let k = 0, trans = 0
  for (let i = 0; i < l1; i++) {
    if (!m1[i]) continue
    while (!m2[k]) k++
    if (s1[i] !== s2[k]) trans++
    k++
  }
  return (matches / l1 + matches / l2 + (matches - trans / 2) / matches) / 3
}

// ── Jaro-Winkler similarity (prefix bonus) ───────────────────────────────────
export function jaroWinkler(s1, s2, p = 0.1) {
  const j = jaro(s1, s2)
  let prefix = 0
  const maxPfx = Math.min(4, s1.length, s2.length)
  for (let i = 0; i < maxPfx; i++) {
    if (s1[i] === s2[i]) prefix++
    else break
  }
  return j + prefix * p * (1 - j)
}

// ── Find best match from a list of candidates ────────────────────────────────
// candidates: [{ itemCode, itemName }]  (from RM Master)
// Returns: { candidate, score, method } or null if below threshold
export function findBestRmMatch(query, candidates, threshold = 0.80) {
  const normQ = normalizeName(query)
  let best = null
  let bestScore = 0
  let bestMethod = ''

  for (const c of candidates) {
    const normC = normalizeName(c.itemName)

    // 1. Exact normalised match
    if (normQ === normC) return { candidate: c, score: 1.0, method: 'exact' }

    // 2. One name contains the other (handles leading/trailing words)
    if (normQ.includes(normC) || normC.includes(normQ)) {
      const shorter = Math.min(normQ.length, normC.length)
      const longer  = Math.max(normQ.length, normC.length)
      const score = 0.80 + 0.15 * (shorter / longer)   // 0.80–0.95 range
      if (score > bestScore) { best = c; bestScore = score; bestMethod = 'contains' }
      continue
    }

    // 3. Jaro-Winkler on normalised names
    const jw = jaroWinkler(normQ, normC)
    if (jw > bestScore) { best = c; bestScore = jw; bestMethod = 'fuzzy' }

    // 4. Token-set match (handles word order differences)
    const tq = normQ.split(' ').sort().join(' ')
    const tc = normC.split(' ').sort().join(' ')
    if (tq !== normQ || tc !== normC) {
      const ts = jaroWinkler(tq, tc)
      if (ts > bestScore) { best = c; bestScore = ts; bestMethod = 'token-set' }
    }
  }

  if (bestScore >= threshold) return { candidate: best, score: bestScore, method: bestMethod }
  return null
}

// ── Confidence label for UI display ─────────────────────────────────────────
export function confidenceLabel(score) {
  if (score >= 0.97) return { label: 'Exact', color: 'emerald' }
  if (score >= 0.90) return { label: 'High',  color: 'green' }
  if (score >= 0.82) return { label: 'Good',  color: 'amber' }
  return { label: 'Low', color: 'red' }
}
