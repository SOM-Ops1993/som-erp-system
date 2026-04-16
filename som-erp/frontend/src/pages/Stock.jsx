import { useState, useEffect } from 'react'
import { stockApi } from '../api/client'
import { BarChart2, Search, Package, TrendingDown, AlertTriangle } from 'lucide-react'

const STATUS_COLORS = {
  IN_STOCK:    { cls: 'badge-green',  icon: '🟢' },
  LOW_STOCK:   { cls: 'badge-yellow', icon: '🟡' },
  OUT_OF_STOCK: { cls: 'badge-red',  icon: '🔴' },
}

export default function Stock() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [detail, setDetail] = useState({})

  const load = () => {
    setLoading(true)
    stockApi.summary().then((r) => { setItems(r.data || []); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const filtered = items.filter((item) => {
    const matchSearch = !search ||
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.itemCode.includes(search)
    const matchFilter = filter === 'ALL' || item.stockStatus === filter
    return matchSearch && matchFilter
  })

  const loadDetail = async (itemCode) => {
    if (expanded === itemCode) { setExpanded(null); return }
    setExpanded(itemCode)
    if (!detail[itemCode]) {
      const res = await stockApi.item(itemCode)
      setDetail((d) => ({ ...d, [itemCode]: res.data }))
    }
  }

  const summary = {
    total: items.length,
    inStock: items.filter((i) => i.stockStatus === 'IN_STOCK').length,
    low: items.filter((i) => i.stockStatus === 'LOW_STOCK').length,
    out: items.filter((i) => i.stockStatus === 'OUT_OF_STOCK').length,
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <BarChart2 size={24} className="text-primary" />
        <h1 className="text-xl font-bold text-primary">Stock Dashboard</h1>
        <button onClick={load} className="ml-auto text-xs text-gray-400 hover:text-primary">↻ Refresh</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Items', value: summary.total, color: 'text-primary', icon: Package },
          { label: 'In Stock',    value: summary.inStock, color: 'text-green-600', icon: Package },
          { label: 'Low Stock',   value: summary.low, color: 'text-yellow-600', icon: AlertTriangle },
          { label: 'Out of Stock',value: summary.out, color: 'text-red-600', icon: TrendingDown },
        ].map((c) => (
          <div key={c.label} className="card text-center py-3">
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search item name or code…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              filter === f ? 'bg-primary text-white' : 'bg-white border text-gray-600 hover:border-primary'
            }`}>
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Items table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading stock…</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Item</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Balance</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Packs</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">No items match your filters</td></tr>
              )}
              {filtered.map((item) => {
                const d = detail[item.itemCode]
                return [
                  <tr key={item.itemCode}
                    className={`border-t cursor-pointer hover:bg-gray-50 transition-colors ${expanded === item.itemCode ? 'bg-blue-50/40' : ''}`}
                    onClick={() => loadDetail(item.itemCode)}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-sm">{item.itemName}</p>
                      <p className="text-xs text-gray-400">{item.itemCode} · {item.uom}
                        {item.reorderLevel ? ` · Reorder @ ${item.reorderLevel}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`font-bold ${item.currentBalance <= 0 ? 'text-red-600' : item.stockStatus === 'LOW_STOCK' ? 'text-yellow-600' : 'text-gray-800'}`}>
                        {item.currentBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">{item.uom}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right hidden md:table-cell">
                      <span className="text-xs text-gray-500">
                        {item.packsInStock + item.packsPartiallyIssued} in stock
                        {item.packsAwaitingInward > 0 && ` · ${item.packsAwaitingInward} awaiting`}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={STATUS_COLORS[item.stockStatus]?.cls || 'badge-gray'}>
                        {STATUS_COLORS[item.stockStatus]?.icon} {item.stockStatus.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>,
                  // Expanded detail
                  expanded === item.itemCode && d && (
                    <tr key={`${item.itemCode}-detail`}>
                      <td colSpan={4} className="px-4 py-3 bg-blue-50/30 border-t border-blue-100">
                        <div className="text-xs">
                          <p className="font-semibold text-gray-600 mb-2">Pack breakdown:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                            {d.packs?.slice(0, 20).map((p) => (
                              <div key={p.packId} className="flex justify-between bg-white rounded px-2 py-1 border text-xs">
                                <span className="font-mono">{p.packId}</span>
                                <span className="text-gray-500">{p.remainingQty}/{p.originalQty} {item.uom}</span>
                                <span className="text-gray-400">{p.warehouse}</span>
                              </div>
                            ))}
                            {d.packs?.length > 20 && (
                              <div className="text-gray-400 text-center py-1">+{d.packs.length - 20} more packs</div>
                            )}
                          </div>
                          {d.container && d.container.currentQty > 0 && (
                            <div className="mt-2 bg-purple-50 border border-purple-100 rounded px-2 py-1">
                              Container {d.container.containerId}: {Number(d.container.currentQty)} {d.container.uom}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ),
                ]
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
