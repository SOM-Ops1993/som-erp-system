import { useState, useEffect } from 'react'
import { ledgerApi, rmApi } from '../api/client.js'

const TX_COLORS = {
  INWARD:           'bg-green-100 text-green-800',
  BOM_ISSUANCE:     'bg-blue-100 text-blue-800',
  PACK_TO_CONTAINER:'bg-purple-100 text-purple-800',
  STOCK_RECON:      'bg-orange-100 text-orange-800',
}

export default function Ledger() {
  const [rows, setRows] = useState([])
  const [rmList, setRmList] = useState([])
  const [filterItem, setFilterItem] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [detail, setDetail] = useState(null)
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
        <button onClick={loadLedger} className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm">
          ↻ Refresh
        </button>
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
          <button onClick={() => { setFilterItem(''); setPage(1) }} className="text-xs text-gray-400 hover:text-gray-600">✕ Clear</button>
        )}
        <span className="text-xs text-gray-400 ml-auto">{total} total entries · Page {page} of {totalPages || 1}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="text-left px-4 py-3">Date & Time</th>
                <th className="text-left px-4 py-3">Item Code</th>
                <th className="text-left px-4 py-3">Transaction</th>
                <th className="text-right px-4 py-3">In Qty</th>
                <th className="text-right px-4 py-3">Out Qty</th>
                <th className="text-right px-4 py-3">Balance</th>
                <th className="text-left px-4 py-3">Reference</th>
                <th className="px-4 py-3 text-center">Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">No transactions found</td></tr>
              ) : rows.map(row => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-blue-50 transition cursor-pointer"
                  onClick={() => openDetail(row)}>
                  <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(row.timestamp).toLocaleString('en-IN', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-blue-700">{row.itemCode}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TX_COLORS[row.transactionType] || 'bg-gray-100 text-gray-600'}`}>
                      {row.transactionType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-green-700 font-medium">
                    {row.inQty > 0 ? `+${Number(row.inQty).toFixed(3)}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right text-red-600 font-medium">
                    {row.outQty > 0 ? `−${Number(row.outQty).toFixed(3)}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-gray-800">{Number(row.balance).toFixed(3)}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs max-w-xs truncate">{row.reference || '—'}</td>
                  <td className="px-4 py-2.5 text-center text-blue-400 hover:text-blue-600">🔍</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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

      {/* ── DETAIL MODAL ───────────────────────────────────────────────── */}
      {detail && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900">Transaction Detail</h2>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {detail.loading ? (
                <p className="text-gray-400">Loading details...</p>
              ) : detail.error ? (
                <p className="text-red-500">{detail.error}</p>
              ) : (
                <>
                  {/* Core entry */}
                  <DSection title="📋 Transaction">
                    <DGrid>
                      <DRow label="Date & Time" value={new Date(detail.entry.timestamp).toLocaleString('en-IN')} />
                      <DRow label="Item Code" value={detail.entry.itemCode} mono />
                      <DRow label="Type" value={detail.entry.transactionType} />
                      <DRow label="Source / Pack ID" value={detail.entry.sourceId} mono />
                      <DRow label="In Qty" value={detail.entry.inQty > 0 ? `+${Number(detail.entry.inQty).toFixed(3)}` : '—'} />
                      <DRow label="Out Qty" value={detail.entry.outQty > 0 ? `−${Number(detail.entry.outQty).toFixed(3)}` : '—'} />
                      <DRow label="Balance After" value={Number(detail.entry.balance).toFixed(3)} />
                      <DRow label="Reference" value={detail.entry.reference || '—'} />
                    </DGrid>
                  </DSection>

                  {detail.detail?.pack && (
                    <DSection title="📦 Pack / Bag Details">
                      <DGrid>
                        <DRow label="Pack ID" value={detail.detail.pack.packId} mono />
                        <DRow label="Item Name" value={detail.detail.pack.itemName} />
                        <DRow label="Lot No" value={detail.detail.pack.lotNo} />
                        <DRow label="Bag No" value={`#${detail.detail.pack.bagNo}`} />
                        <DRow label="Pack Qty" value={`${detail.detail.pack.packQty} ${detail.detail.pack.uom}`} />
                        {detail.detail.pack.supplier && <DRow label="Supplier" value={detail.detail.pack.supplier} />}
                        {detail.detail.pack.invoiceNo && <DRow label="Invoice No" value={detail.detail.pack.invoiceNo} />}
                        {detail.detail.pack.receivedDate && (
                          <DRow label="Received Date" value={new Date(detail.detail.pack.receivedDate).toLocaleDateString('en-IN')} />
                        )}
                      </DGrid>
                    </DSection>
                  )}

                  {detail.detail?.inward && (
                    <DSection title="📥 Inward Details">
                      <DGrid>
                        <DRow label="Warehouse" value={detail.detail.inward.warehouse} />
                        <DRow label="Inward Time" value={new Date(detail.detail.inward.inwardTime).toLocaleString('en-IN')} />
                      </DGrid>
                    </DSection>
                  )}

                  {detail.detail?.indent && (
                    <DSection title="📝 Production Indent">
                      <DGrid>
                        <DRow label="Indent ID" value={detail.detail.indent.indentId} mono />
                        <DRow label="Product" value={detail.detail.indent.productName} />
                        <DRow label="DI No" value={detail.detail.indent.diNo} />
                        <DRow label="Batch No" value={detail.detail.indent.batchNo} />
                        <DRow label="Batch Size" value={detail.detail.indent.batchSize} />
                        <DRow label="Status" value={detail.detail.indent.status} />
                        {detail.detail.indent.plant && <DRow label="Plant" value={detail.detail.indent.plant} />}
                        {detail.detail.indent.equipment && <DRow label="Equipment" value={detail.detail.indent.equipment} />}
                        <DRow label="Planned Date" value={new Date(detail.detail.indent.createdAt).toLocaleDateString('en-IN')} />
                      </DGrid>
                    </DSection>
                  )}

                  {detail.detail?.sfg && (
                    <DSection title="🧪 SFG Status (at time of query)">
                      <DGrid>
                        <DRow label="Formulated Qty" value={Number(detail.detail.sfg.formulatedQty).toFixed(2)} />
                        <DRow label="Packed Qty" value={Number(detail.detail.sfg.packedQty).toFixed(2)} />
                        <DRow label="SFG Balance" value={Number(detail.detail.sfg.sfgQty).toFixed(2)} />
                        <DRow label="SFG Status" value={detail.detail.sfg.status} />
                      </DGrid>
                    </DSection>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DSection({ title, children }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">{title}</h3>
      {children}
    </div>
  )
}
function DGrid({ children }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-2">{children}</div>
}
function DRow({ label, value, mono }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`font-medium text-gray-800 break-all ${mono ? 'font-mono text-blue-700 text-xs' : ''}`}>{value}</p>
    </div>
  )
}
