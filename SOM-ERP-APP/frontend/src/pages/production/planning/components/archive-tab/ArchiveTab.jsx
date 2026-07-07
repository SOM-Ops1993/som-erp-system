import { useState, useMemo } from 'react'
import { fmtDate } from '../../utils/bomPrintTemplates.js'
import { printBoms, bomTitle } from '../../utils/bomIssuancePrint.js'

export default function ArchiveTab({ boms, recipeCount, meta }) {
  const [prodFilter, setProdFilter] = useState('')
  const [search, setSearch]         = useState('')
  const [copyMsg, setCopyMsg]       = useState('')

  const products = useMemo(() => [...new Set(boms.map(b => b.productName))], [boms])

  const filtered = useMemo(() => {
    const pf = prodFilter.toLowerCase()
    const sq = search.toLowerCase()
    return boms.slice().reverse().filter(b => {
      const matchProd = !pf || b.productName.toLowerCase().includes(pf)
      const matchQ = !sq
        || b.bomNo.toLowerCase().includes(sq)
        || (b.batchNo || '').toLowerCase().includes(sq)
        || b.productName.toLowerCase().includes(sq)
      return matchProd && matchQ
    })
  }, [boms, prodFilter, search])

  const stats = [
    { label: 'Total BOMs Issued', val: boms.length },
    { label: 'Unique Products',   val: new Set(boms.map(b => b.productName)).size },
    { label: 'Recipes in Master', val: recipeCount },
    { label: 'Last BOM No',       val: meta?.lastBomNo || '—' },
  ]

  const copyForExcel = async () => {
    const header = ['BOM Number', 'Product Name', 'Batch Size', 'UOM', 'Batch No', 'Date Issued', 'Batch Planned', 'Cycle', 'DI No'].join('\t')
    const lines = filtered.map(b => [
      b.bomNo, b.productName, b.batchSize, b.batchSizeUom, b.batchNo,
      fmtDate(b.issuedAt || b.dateRequisition), fmtDate(b.datePlanned),
      `${b.cycleNo}/${b.totalCycles}`, b.diNumber || '',
    ].join('\t'))
    const text = [header, ...lines].join('\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    }
    setCopyMsg(`✓ Copied ${filtered.length} row(s) — paste into Excel`)
    setTimeout(() => setCopyMsg(''), 3500)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2.5">
        <p className="font-semibold text-gray-900">BOM Archive</p>
        <div className="flex gap-2 flex-wrap items-center">
          <select value={prodFilter} onChange={e => setProdFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-[13px] bg-white w-48">
            <option value="">All products</option>
            {products.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search BOM / Batch No…"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-[13px] w-44" />
          <button onClick={copyForExcel}
            className="px-3 py-1.5 text-[13px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
            📋 Copy for Excel
          </button>
        </div>
      </div>

      {copyMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-[12px] rounded-lg px-3.5 py-2 mb-3">{copyMsg}</div>
      )}

      <div className="grid grid-cols-4 gap-3 mb-4">
        {stats.map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl px-4 py-3">
            <div className="text-[11px] text-gray-400 mb-0.5">{s.label}</div>
            <div className="text-xl font-bold text-gray-900">{s.val}</div>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-14 text-gray-400">No BOMs issued yet.</div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-slate-700 text-white text-[11px]">
              <tr>
                {['BOM Number', 'Product Name', 'Batch Size', 'Batch No', 'Date Issued', 'Batch Planned', 'Cycle', 'DI No', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold">{b.bomNo}</td>
                  <td className="px-3 py-2 font-medium">{b.productName}</td>
                  <td className="px-3 py-2">{b.batchSize} {b.batchSizeUom}</td>
                  <td className="px-3 py-2">{b.batchNo}</td>
                  <td className="px-3 py-2 text-gray-500">{fmtDate(b.issuedAt || b.dateRequisition)}</td>
                  <td className="px-3 py-2 text-gray-500">{fmtDate(b.datePlanned)}</td>
                  <td className="px-3 py-2 text-center text-gray-400">{b.cycleNo}/{b.totalCycles}</td>
                  <td className="px-3 py-2 text-gray-500">{b.diNumber || ''}</td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => printBoms([b], bomTitle(b))} title="Reprint / Save as PDF"
                      className="px-2 py-1 text-[12px] border border-gray-300 rounded-md hover:bg-gray-100">⬇</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
