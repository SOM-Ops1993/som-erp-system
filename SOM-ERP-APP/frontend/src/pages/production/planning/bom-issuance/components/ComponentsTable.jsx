import { useRef } from 'react'

const UOM_OPTIONS = ['kg', 'L', 'g', 'mg', 'mL', 'pcs', 'nos', 'bags', 'drums', '%w/w', '%v/v', 'MT']
const COLS = ['sno', 'comp', 'qty', 'uom', 'rem']

export function emptyRow(sno) {
  return { sno: String(sno), comp: '', qty: '', uom: '', rem: '' }
}

export function makeRows(n) {
  return Array.from({ length: n }, (_, i) => emptyRow(i + 1))
}

// Mirrors the legacy getComponents() — reads the table into the {component,isHeader,...}
// shape the print templates expect.
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
    }
  })
  return rows
}

export default function ComponentsTable({ rows, onChange }) {
  const rowCountRef = useRef(null)

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

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wide">
              <th className="w-14 px-2 py-2 text-left font-semibold">S.No</th>
              <th className="px-2 py-2 text-left font-semibold">Component / Raw Material</th>
              <th className="w-24 px-2 py-2 text-left font-semibold">Quantity</th>
              <th className="w-24 px-2 py-2 text-left font-semibold">UOM</th>
              <th className="w-40 px-2 py-2 text-left font-semibold">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const isHeader = (r.comp || '').trim().startsWith('##')
              return (
                <tr key={idx} className={`border-t border-gray-100 ${isHeader ? 'bg-amber-50/50' : idx % 2 ? 'bg-gray-50/40' : ''}`}>
                  <td className="p-0"><input value={r.sno} onChange={e => updateCell(idx, 'sno', e.target.value)}
                    onPaste={e => handleCellPaste(e, idx, 'sno')}
                    className="w-full px-2 py-1.5 outline-none bg-transparent focus:bg-indigo-50" /></td>
                  <td className="p-0"><input value={r.comp} onChange={e => updateCell(idx, 'comp', e.target.value)}
                    onPaste={e => handleCellPaste(e, idx, 'comp')}
                    className={`w-full px-2 py-1.5 outline-none bg-transparent focus:bg-indigo-50 ${isHeader ? 'font-bold text-amber-800' : ''}`} /></td>
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
