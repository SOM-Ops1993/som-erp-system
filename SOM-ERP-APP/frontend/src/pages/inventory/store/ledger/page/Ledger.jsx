import { useState, useEffect } from 'react'
import { ledgerApi, rmApi } from '../../../../../api/inventory.js'
import { BackButton, Button } from '../../../../../components/ui'
import LedgerTable             from '../components/ledger-table/LedgerTable.jsx'
import TransactionDetailModal  from '../components/transaction-detail-modal/TransactionDetailModal.jsx'
import { RefreshCw, X } from 'lucide-react'
import './Ledger.css'

export default function Ledger() {
  const [rows,       setRows]       = useState([])
  const [rmList,     setRmList]     = useState([])
  const [filterItem, setFilterItem] = useState('')
  const [loading,    setLoading]    = useState(true)
  const [page,       setPage]       = useState(1)
  const [total,      setTotal]      = useState(0)
  const [detail,     setDetail]     = useState(null)
  const LIMIT = 50

  useEffect(() => { loadLedger() }, [page, filterItem])
  useEffect(() => {
    rmApi.list({}).then(r => setRmList(r.data || [])).catch(() => {})
  }, [])

  const loadLedger = async () => {
    setLoading(true)
    try {
      const params = { page, limit: LIMIT }
      if (filterItem) params.itemCode = filterItem
      const res = await ledgerApi.all(params)
      setRows(res.data || [])
      setTotal(res.total || 0)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const openDetail = async (entry) => {
    setDetail({ entry, detail: null, loading: true })
    try {
      const res = await ledgerApi.entryDetail(entry.id)
      setDetail({ entry: res.data, detail: res.data.detail, loading: false })
    } catch (e) {
      setDetail({ entry, detail: null, loading: false, error: e.message })
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📒 Stock Ledger</h1>
          <p className="text-sm text-gray-500 mt-0.5">Full transaction history — click any row for complete detail</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={loadLedger} variant="outline-gray" size="sm" icon={RefreshCw}>Refresh</Button>
          <BackButton />
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-medium text-gray-700">Filter by Item:</label>
        <select value={filterItem} onChange={e => { setFilterItem(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">— All Items —</option>
          {rmList.map(r => <option key={r.itemCode} value={r.itemCode}>{r.itemName} ({r.itemCode})</option>)}
        </select>
        {filterItem && (
          <Button onClick={() => { setFilterItem(''); setPage(1) }} variant="ghost" size="xs" icon={X}>Clear</Button>
        )}
        <span className="text-xs text-gray-400 ml-auto">{total} total entries · Page {page} of {totalPages || 1}</span>
      </div>

      <LedgerTable loading={loading} rows={rows} onOpenDetail={openDetail} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">← Prev</button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
            if (pg < 1 || pg > totalPages) return null
            return (
              <button key={pg} onClick={() => setPage(pg)}
                className={`px-3 py-1.5 border rounded-lg text-sm ${pg === page ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}>
                {pg}
              </button>
            )
          })}
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Next →</button>
        </div>
      )}

      <TransactionDetailModal detail={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
