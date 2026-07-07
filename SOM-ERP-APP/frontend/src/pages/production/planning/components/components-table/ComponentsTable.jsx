import { useMemo, useRef, useState } from 'react'
import { Link2 } from 'lucide-react'

const UOM_OPTIONS = ['kg', 'L', 'g', 'mg', 'mL', 'pcs', 'nos', 'bags', 'drums', '%w/w', '%v/v', 'MT']
const COLS = ['sno', 'comp', 'qty', 'uom', 'rem']

export function emptyRow(sno) {
  return { sno: String(sno), comp: '', qty: '', uom: '', rem: '', rmCode: '' }
}

export function makeRows(n) {
  return Array.from({ length: n }, (_, i) => emptyRow(i + 1))
}

// Mirrors the legacy getComponents() — reads the table into the {component,isHeader,...}
// shape the print templates expect. rmCode carries through so a later reload of this
// same BOM (or a "save corrections" pass) still knows which RM Master item each row
// was originally loaded from.
export function toComponents(rows) {
  let sno = 0
  const out = []
  for (const r of rows) {
    const comp = (r.comp || '').trim()
    if (!comp) continue
    const isHeader = comp.startsWith('##')
    if (!isHeader) sno++
    out.push({
      sno:       isHeader ? '' : (r.sno?.trim() || String(sno)),
      component: isHeader ? comp.replace(/^##\s*/, '').trim() : comp,
      qty:       isHeader ? '' : (r.qty || '').trim(),
      uom:       isHeader ? '' : (r.uom || ''),
      remarks:   isHeader ? '' : (r.rem || '').trim(),
      rmCode:    isHeader ? '' : (r.rmCode || ''),
      isHeader,
    })
  }
  return out
}

// Mirrors setComponents() — used when a recipe is loaded/scaled into the table.
export function fromComponents(comps, minRows) {
  const rows = makeRows(Math.max(minRows, comps.length))
  comps.forEach((c, i) => {
    rows[i] = {
      sno: c.sno || String(i + 1),
      comp: c.isHeader ? `## ${c.component || ''}` : (c.component || ''),
      qty: c.qty || '',
      uom: c.uom || '',
      rem: c.remarks || '',
      rmCode: c.rmCode || '',
    }
  })
  return rows
}

export default function ComponentsTable({ rows, onChange, rmList = [], onSaveCorrections, savingCorrections }) {
  const rowCountRef = useRef(null)
  const [suggestIdx, setSuggestIdx] = useState(null)

  const rmByNameLower = useMemo(() => {
    const map = new Map()
    rmList.forEach(rm => map.set((rm.itemName || '').trim().toLowerCase(), rm))
    return map
  }, [rmList])

  const rmByCode = useMemo(() => {
    const map = new Map()
    rmList.forEach(rm => map.set(rm.itemCode, rm))
    return map
  }, [rmList])

  const matchFor = (name) => rmByNameLower.get((name || '').trim().toLowerCase())

  const suggestionsFor = (text) => {
    const q = (text || '').trim().toLowerCase()
    if (!q || !rmList.length) return []
    return rmList.filter(rm => (rm.itemName || '').toLowerCase().includes(q)).slice(0, 8)
  }

  // Rows whose typed name now resolves to a *different* RM than the one this
  // row was originally loaded from (recipe_db) — real, save-able corrections.
  // Manually typed rows (no rmCode, never came from a saved recipe) have
  // nothing to reconcile against, so they're excluded here even if unmatched.
  const corrections = useMemo(() => {
    const seen = new Map()
    for (const r of rows) {
      if (!r.rmCode || (r.comp || '').trim().startsWith('##')) continue
      const matched = matchFor(r.comp)
      if (matched && matched.itemCode !== r.rmCode) {
        seen.set(r.rmCode, { fromCode: r.rmCode, toCode: matched.itemCode })
      }
    }
    return [...seen.values()]
  }, [rows, rmByNameLower])

  const applyRowCount = () => {
    const n = Math.max(1, Math.min(200, parseInt(rowCountRef.current.value, 10) || 25))
    rowCountRef.current.value = n
    const next = rows.slice(0, n)
    while (next.length < n) next.push(emptyRow(next.length + 1))
    onChange(next)
  }

  const updateCell = (idx, key, value) => {
    const next = rows.slice()
    next[idx] = { ...next[idx], [key]: value }
    onChange(next)
  }

  const pickSuggestion = (idx, rm) => {
    updateCell(idx, 'comp', rm.itemName)
    setSuggestIdx(null)
  }

  // Multi-row/column paste from Excel — fills down from the pasted cell,
  // extending the table with new rows if the pasted block runs past the end.
  const handleCellPaste = (e, rowIdx, colKey) => {
    const text = e.clipboardData.getData('text')
    const lines = text.replace(/\r/g, '').split('\n').filter((_, i, arr) => !(i === arr.length - 1 && arr[i] === ''))
    if (lines.length <= 1 && !text.includes('\t')) return // single cell — let the browser handle it
    e.preventDefault()
    const startCol = COLS.indexOf(colKey)
    const next = rows.slice()
    lines.forEach((line, li) => {
      const targetIdx = rowIdx + li
      while (next.length <= targetIdx) next.push(emptyRow(next.length + 1))
      const cells = line.split('\t')
      cells.forEach((cell, ci) => {
        const col = COLS[startCol + ci]
        if (!col) return
        next[targetIdx] = { ...next[targetIdx], [col]: cell.trim() }
      })
    })
    onChange(next)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex-wrap">
        <span className="font-semibold text-[13px] text-gray-700">🧪 BOM Components</span>
        <div className="ml-auto flex items-center gap-2 text-[12px]">
          <label className="text-gray-500 font-medium">Rows:</label>
          <input ref={rowCountRef} type="number" defaultValue={rows.length} min={1} max={200}
            onKeyDown={e => e.key === 'Enter' && applyRowCount()}
            className="w-16 border border-gray-300 rounded-md px-2 py-1 text-center outline-none focus:ring-2 focus:ring-indigo-400" />
          <button type="button" onClick={applyRowCount}
            className="px-2.5 py-1 border border-gray-300 rounded-md hover:bg-gray-100 font-medium">Apply</button>
          <span className="text-gray-400">· paste rows from Excel directly</span>
        </div>
      </div>

      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-[12px] text-blue-800">
        💡 <b>Section headers:</b> start any Component name with <code className="bg-white/60 px-1 rounded">##</code> to
        insert a section divider (e.g. <code className="bg-white/60 px-1 rounded">## NITROBACTER SP BROTH — Preparation</code>).
        Leave qty/uom blank for that row.
      </div>

      {corrections.length > 0 && (
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-3 flex-wrap text-[12px]">
          <span className="text-amber-800">
            ⚠ <b>{corrections.length}</b> corrected name{corrections.length !== 1 ? 's' : ''} ready to save back to Recipe Master.
            This updates the RM mapping for <b>every product</b> that uses the old code, not just this batch.
          </span>
          <button type="button" onClick={() => onSaveCorrections?.(corrections)} disabled={savingCorrections}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-semibold whitespace-nowrap">
            <Link2 size={13} />
            {savingCorrections ? 'Saving…' : `Save ${corrections.length} Correction${corrections.length !== 1 ? 's' : ''} to Recipe`}
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wide">
              <th className="w-14 px-2 py-2 text-left font-semibold">S.No</th>
              <th className="px-2 py-2 text-left font-semibold">Component / Raw Material</th>
              <th className="w-28 px-2 py-2 text-left font-semibold">Item Code</th>
              <th className="w-24 px-2 py-2 text-left font-semibold">Quantity</th>
              <th className="w-24 px-2 py-2 text-left font-semibold">UOM</th>
              <th className="w-40 px-2 py-2 text-left font-semibold">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const isHeader = (r.comp || '').trim().startsWith('##')
              const matched  = !isHeader ? matchFor(r.comp) : null
              const hasText  = !!(r.comp || '').trim()
              const suggestions = suggestIdx === idx ? suggestionsFor(r.comp) : []
              return (
                <tr key={idx} className={`border-t border-gray-100 ${isHeader ? 'bg-amber-50/50' : idx % 2 ? 'bg-gray-50/40' : ''}`}>
                  <td className="p-0"><input value={r.sno} onChange={e => updateCell(idx, 'sno', e.target.value)}
                    onPaste={e => handleCellPaste(e, idx, 'sno')}
                    className="w-full px-2 py-1.5 outline-none bg-transparent focus:bg-indigo-50" /></td>
                  <td className="p-0 relative">
                    <input value={r.comp}
                      onChange={e => { updateCell(idx, 'comp', e.target.value); setSuggestIdx(idx) }}
                      onFocus={() => setSuggestIdx(idx)}
                      onBlur={() => setTimeout(() => setSuggestIdx(s => (s === idx ? null : s)), 150)}
                      onPaste={e => handleCellPaste(e, idx, 'comp')}
                      autoComplete="off"
                      className={`w-full px-2 py-1.5 outline-none bg-transparent focus:bg-indigo-50 ${isHeader ? 'font-bold text-amber-800' : ''}`} />
                    {suggestions.length > 0 && (
                      <div className="absolute z-30 left-0 right-0 top-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                        {suggestions.map(rm => (
                          <button key={rm.itemCode} type="button" onMouseDown={() => pickSuggestion(idx, rm)}
                            className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-indigo-50 border-b border-gray-50 last:border-0 flex items-center justify-between gap-2">
                            <span className="font-medium text-gray-800 truncate">{rm.itemName}</span>
                            <span className="font-mono text-[10px] text-gray-400 flex-shrink-0">{rm.itemCode}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-0 px-2">
                    {isHeader || !hasText ? null : matched ? (
                      <span className="font-mono text-[12px] text-emerald-700">{matched.itemCode}</span>
                    ) : (
                      <span className="font-mono text-[12px] font-bold text-red-600" title="This name doesn't match any Raw Material Master item">NAN</span>
                    )}
                  </td>
                  <td className="p-0"><input value={r.qty} onChange={e => updateCell(idx, 'qty', e.target.value)}
                    onPaste={e => handleCellPaste(e, idx, 'qty')} disabled={isHeader}
                    className="w-full px-2 py-1.5 outline-none bg-transparent focus:bg-indigo-50 disabled:bg-gray-50" /></td>
                  <td className="p-0"><input value={r.uom} onChange={e => updateCell(idx, 'uom', e.target.value)}
                    onPaste={e => handleCellPaste(e, idx, 'uom')} disabled={isHeader} list="bom-uom-list"
                    placeholder="kg/L/g…"
                    className="w-full px-2 py-1.5 outline-none bg-transparent focus:bg-indigo-50 disabled:bg-gray-50" /></td>
                  <td className="p-0"><input value={r.rem} onChange={e => updateCell(idx, 'rem', e.target.value)}
                    onPaste={e => handleCellPaste(e, idx, 'rem')} disabled={isHeader}
                    className="w-full px-2 py-1.5 outline-none bg-transparent focus:bg-indigo-50 disabled:bg-gray-50" /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <datalist id="bom-uom-list">
        {UOM_OPTIONS.map(u => <option key={u} value={u} />)}
      </datalist>
    </div>
  )
}
