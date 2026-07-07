// Thin orchestration around the verbatim paperwork templates in bomPrintTemplates.js —
// decides which sheets to append per the current print settings and hands back a
// print-ready HTML document, mirroring the legacy printBomAsPdf()/downloadAll() behavior.
import {
  state, fmtDate, buildPrintHtml, isDualCopy, bomDualHalfPage, bomInnerHtml,
  technicalSheet, formulationSheet, packingSheet, coaSheet,
  nanoSheet1, nanoSheet2, nanoSheet3, nanoQcSheet, masterRequisitionSheet,
} from './bomPrintTemplates.js'

function composePages(boms) {
  const skipBOMs = state.skipCycleBOMs === true
  const pages = boms.map(b => {
    let set = ''
    if (!skipBOMs) set += isDualCopy(b) ? bomDualHalfPage(b) : bomInnerHtml(b)
    if (state.inclTechnical)   set += technicalSheet(b)
    if (state.inclFormulation) set += formulationSheet(b, skipBOMs)
    if (state.inclPacking)     set += packingSheet(b)
    if (state.inclCOA)         set += coaSheet(b)
    if (state.inclNano)        set += nanoSheet1(b) + nanoSheet2(b) + nanoSheet3(b) + nanoQcSheet(b)
    return set
  }).join('')
  const masterPage = state.inclMasterSheet !== false ? masterRequisitionSheet(boms) : ''
  return masterPage + pages
}

export function bomTitle(bom) {
  const prodName = (bom.productName || 'BOM').replace(/[^a-zA-Z0-9_ -]/g, '').trim().replace(/\s+/g, '_')
  const planned  = bom.datePlanned ? fmtDate(bom.datePlanned).replace(/\s+/g, '-') : fmtDate(bom.dateRequisition).replace(/\s+/g, '-')
  return prodName + (planned ? '_' + planned : '')
}

export function buildBomPrintHtml(boms, title) {
  return buildPrintHtml(composePages(boms), title)
}

// Opens a new tab with the print-ready document and triggers the browser print
// dialog (same "Save as PDF" flow as the legacy tool). Falls back to a plain
// HTML download when the browser blocks the popup.
export function printBoms(boms, title) {
  const html = buildBomPrintHtml(boms, title)
  const blob = new Blob([html], { type: 'text/html' })
  const url  = URL.createObjectURL(blob)
  const w    = window.open(url, '_blank')
  if (!w) {
    const a = document.createElement('a')
    a.href = url; a.download = title + '.html'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 30000)
    return 'download'
  }
  w.onload = () => setTimeout(() => w.print(), 600)
  setTimeout(() => URL.revokeObjectURL(url), 30000)
  return 'print'
}
