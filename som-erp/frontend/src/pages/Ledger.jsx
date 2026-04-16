import { useState, useEffect } from 'react'
import { ledgerApi, rmApi } from '../api/client'
import { ScrollText, Search } from 'lucide-react'
import dayjs from 'dayjs'

const TX_COLORS = {
  INWARD: 'badge-green', BOM_ISSUANCE: 'badge-red', OUTWARD: 'badge-red',
  STOCK_RECON: 'badge-yellow', PACK_REDUCTION_OUT: 'badge-gray',
  WAREHOUSE_TRANSFER: 'badge-blue', CONTAINER_IN: 'badge-blue',
}

export default function Ledger() {
  const [items, setItems] = useState([])
  const [entries, setEntries] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ itemCode: '', dateFrom: '', dateTo: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => { rmApi.list().then((r) => setItems(r.data || [])) }, [])

  const load = async (pg = 1) => {
    setLoading(true)
    try {
      const params = { page: pg, limit: 100, ...filters }
      const res = filters.itemCode
        ? await ledgerApi.item(filters.itemCode, params)
        : await ledgerApi.all(params)
      setEntries(res.entries || [])
      setTotal(res.total || 0)
      setPage(pg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1) }, [])

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <ScrollText size={24} className="text-primary" />
        <h1 className="text-xl font-bold text-primary">Stock Ledger</h1>
        <span className="text-xs text-gray-400 ml-auto">Immutable audit trail · {total.toLocaleString()} entries</span>
      </div>

      {/* Filters */}
      <div className="card mb-4 flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48">
          <label className="label">Item</label>
          <select className="input" value={filters.itemCode}
            onChange={(e) => setFilters((f) => ({ ...f, itemCode: e.target.value }))}>
            <option value="">All Items</option>
            {items.map((i) => <option key={i.itemCode} value={i.itemCode}>{i.itemName} [{i.itemCode}]</option>)}
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={filters.dateFrom}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={filters.dateTo}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} />
        </div>
        <div className="self-end">
          <button onClick={() => load(1)} className="btn-primary">Search</button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                <th className="px-3 py-2.5 text-left">Timestamp</th>
                <th className="px-3 py-2.5 text-left">Item</th>
                <th className="px-3 py-2.5 text-left">Transaction</th>
                <th className="px-3 py-2.5 text-left">Source</th>
                <th className="px-3 py-2.5 text-right text-green-600">IN</th>
                <th className="px-3 py-2.5 text-right text-red-600">OUT</th>
                <th className="px-3 py-2.5 text-right font-bold">Balance</th>
                <th className="px-3 py-2.5 text-left">Reference</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading…</td></tr>
              )}
              {!loading && entries.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">No entries found</td></tr>
              )}
              {entries.map((e) => (
                <tr key={e.ledgerId} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">
                    {dayjs(e.timestamp).format('DD-MMM-YY HH:mm')}
                  </td>
                  <td className="px-3 py-1.5">
                    <p className="font-medium">{e.rmMaster?.itemName || e.itemCode}</p>
                    <p className="text-gray-400">{e.itemCode}</p>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className={TX_COLORS[e.transactionType] || 'badge-gray'}>
                      {e.transactionType.replace(/_/g, ' ')}
                    </span>
                    {e.isLegacy && <span className="badge-gray ml-1">Legacy</span>}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-gray-500 max-w-[140px] truncate">{e.sourceId}</td>
                  <td className="px-3 py-1.5 text-right text-green-600 font-semibold">
                    {Number(e.inQty) > 0 ? `+${Number(e.inQty).toLocaleString('en-IN', { maximumFractionDigits: 3 })}` : '—'}
                  </td>
                  <td className="px-3 py-1.5 text-right text-red-600 font-semibold">
                    {Number(e.outQty) > 0 ? `-${Number(e.outQty).toLocaleString('en-IN', { maximumFractionDigits: 3 })}` : '—'}
                  </td>
                  <td className="px-3 py-1.5 text-right font-bold">
                    {Number(e.balance).toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                  </td>
                  <td className="px-3 py-1.5 text-gray-500 max-w-[160px] truncate">{e.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 100 && (
          <div className="flex justify-between items-center px-4 py-2.5 border-t text-sm">
            <span className="text-gray-500">Showing {entries.length} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => load(page - 1)} disabled={page === 1} className="btn-outline text-xs">← Prev</button>
              <span className="text-xs text-gray-500 self-center">Page {page}</span>
              <button onClick={() => load(page + 1)} disabled={entries.length < 100} className="btn-outline text-xs">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
