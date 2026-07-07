import { useState, useEffect, useMemo } from 'react'
import { recipeApi } from '../../../../../api/masters.js'

export default function RecipeLibraryTab() {
  const [products, setProducts] = useState([])
  const [search, setSearch]     = useState('')
  const [openCode, setOpenCode] = useState(null)
  const [lines, setLines]       = useState([])
  const [loadingLines, setLoadingLines] = useState(false)

  useEffect(() => {
    recipeApi.products().then(r => setProducts(r.data || [])).catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return !q ? products : products.filter(p => p.productName?.toLowerCase().includes(q))
  }, [products, search])

  const toggle = async (p) => {
    if (openCode === p.productCode) { setOpenCode(null); return }
    setOpenCode(p.productCode)
    setLoadingLines(true)
    try {
      const r = await recipeApi.list({ productCode: p.productCode })
      setLines(r.data || [])
    } finally {
      setLoadingLines(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <p className="font-semibold text-gray-900 mb-1">Recipe Library</p>
      <p className="text-[13px] text-gray-500 mb-4">
        Sourced live from the Recipe Master — quantities are stored per 1 unit of batch size and auto-scale
        when loaded into the Issue BOM form. Manage recipes from Masters → Recipe Master.
      </p>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product…"
        className="border border-gray-300 rounded-lg px-3 py-2 text-[13px] w-64 mb-4 outline-none focus:ring-2 focus:ring-indigo-400" />

      {filtered.length === 0 ? (
        <div className="text-center py-14 text-gray-400">No recipes found in the Recipe Master.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p.productCode} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button onClick={() => toggle(p)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-left">
                <span className="font-semibold text-[13px] text-gray-800">{p.productName}</span>
                <span className="text-[11px] text-gray-400 font-mono">{p.productCode}</span>
              </button>
              {openCode === p.productCode && (
                <div className="overflow-x-auto">
                  {loadingLines ? (
                    <p className="text-center text-gray-400 text-[13px] py-4">Loading…</p>
                  ) : (
                    <table className="w-full text-[12px]">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr>
                          <th className="text-left px-3 py-1.5 font-medium border-b border-gray-100">RM Code</th>
                          <th className="text-left px-3 py-1.5 font-medium border-b border-gray-100">RM Name</th>
                          <th className="text-left px-3 py-1.5 font-medium border-b border-gray-100">Qty / 1 unit</th>
                          <th className="text-left px-3 py-1.5 font-medium border-b border-gray-100">UOM</th>
                          <th className="text-left px-3 py-1.5 font-medium border-b border-gray-100">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map(l => (
                          <tr key={l.id} className="border-t border-gray-50">
                            <td className="px-3 py-1.5 font-mono text-gray-500">{l.rmCode}</td>
                            <td className="px-3 py-1.5 font-medium text-gray-800">{l.rmName}</td>
                            <td className="px-3 py-1.5">{l.qtyPerUnit}</td>
                            <td className="px-3 py-1.5">{l.uom}</td>
                            <td className="px-3 py-1.5 text-gray-500">{l.roleType || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
