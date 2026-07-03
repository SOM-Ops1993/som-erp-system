// Archive persistence — same localStorage keys the legacy bom-issuance.html tool used
// (sp3_boms / sp3_meta) so BOMs already archived on a device stay visible after this
// React rewrite replaces the embedded HTML prototype.
const SK = { boms: 'sp3_boms', meta: 'sp3_meta' }

export function readArchivedBoms() {
  try { return JSON.parse(localStorage.getItem(SK.boms) || '[]') } catch { return [] }
}

function writeArchivedBoms(list) {
  try { localStorage.setItem(SK.boms, JSON.stringify(list)) } catch { /* storage full/unavailable */ }
}

export function readMeta() {
  try { return JSON.parse(localStorage.getItem(SK.meta) || 'null') || { lastBomNo: '', lastBatchNo: '' } }
  catch { return { lastBomNo: '', lastBatchNo: '' } }
}

function writeMeta(meta) {
  try { localStorage.setItem(SK.meta, JSON.stringify(meta)) } catch { /* storage full/unavailable */ }
}

// Appends newly-confirmed BOMs to the archive and advances the "last issued" meta.
export function archiveBoms(newBoms) {
  const boms = readArchivedBoms()
  boms.push(...newBoms)
  writeArchivedBoms(boms)
  const last = newBoms[newBoms.length - 1]
  const meta = { lastBomNo: last.bomNo, lastBatchNo: last.batchNo }
  writeMeta(meta)
  return meta
}
