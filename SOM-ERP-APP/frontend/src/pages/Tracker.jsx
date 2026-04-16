import { useState, useEffect } from 'react'
import { trackerApi } from '../api/client.js'

export default function Tracker() {
  const [diNo, setDiNo] = useState('')
  const [allIndents, setAllIndents] = useState([])       // default full list
  const [filtered, setFiltered] = useState([])           // search-filtered view
  const [loadingAll, setLoadingAll] = useState(true)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [expandedRm, setExpandedRm] = useState(null)

  // Load all indents on mount
  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoadingAll(true)
    try {
      const res = await trackerApi.searchDiNo('')   // empty = all
      const list = res.data || []
      setAllIndents(list)
      setFiltered(list)
    } catch { /* silent */ }
    setLoadingAll(false)
  }

  // Live search filter
  useEffect(() => {
    if (!diNo.trim()) {
      setFiltered(allIndents)
    } else {
      const q = diNo.trim().toLowerCase()
      setFiltered(allIndents.filter(i =>
        (i.diNo || '').toLowerCase().includes(q) ||
        (i.productName || '').toLowerCase().includes(q) ||
        (i.batchNo || '').toLowerCase().includes(q)
      ))
    }
  }, [diNo, allIndents])

  const loadDetail = async (indent) => {
    setSelected(indent)
    setDetail(null)
    setExpandedRm(null)
    setLoadingDetail(true)
    try {
      const res = await trackerApi.getDetail(indent.indentId)
      setDetail(res.data)
    } catch (e) {
      alert('Failed to load detail: ' + e.message)
    }
    setLoadingDetail(false)
  }

  const statusColor = (s) => {
    if (s === 'CLOSED') return 'bg-emerald-100 text-emerald-700'
    if (s === 'OPEN') return 'bg-slate-100 text-slate-600'
    return 'bg-amber-100 text-amber-700'
  }

  return (
    <div className="flex h-full" style={{ minHeight: 0 }}>
      {/* ── Left panel: indent list ── */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col" style={{ overflowY: 'auto' }}>
        {/* Search bar */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">🔍 Batch Tracker</h2>
          <input
            type="text"
            placeholder="Search DI No, product, batch…"
            value={diNo}
            onChange={e => setDiNo(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            {filtered.length} of {allIndents.length} batches
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {loadingAll ? (
            <div className="p-6 text-center text-gray-400 text-sm">Loading batches…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No batches found</div>
          ) : (
            filtered.map(indent => (
              <button
                key={indent.indentId}
                onClick={() => loadDetail(indent)}
                className={`w-full text-left px-4 py-3 transition hover:bg-indigo-50
                  ${selected?.indentId === indent.indentId ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}
              >
                <div className="flex items-start justify-between gap-1">
                  <p className="font-semibold text-gray-900 text-sm truncate flex-1">{indent.productName}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${statusColor(indent.status)}`}>
                    {indent.status}
                  </span>
                </div>
                <p className="text-xs text-indigo-600 font-mono mt-0.5">{indent.diNo}</p>
                <div className="flex gap-3 text-xs text-gray-400 mt-1">
                  <span className="font-mono">{indent.batchNo}</span>
                  <span>·</span>
                  <span>{new Date(indent.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: full detail ── */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {!selected && !loadingDetail && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <p className="text-5xl mb-4">📋</p>
            <p className="font-semibold text-gray-500 text-lg">Select a batch from the left</p>
            <p className="text-sm mt-1">Full A-Z production diary will appear here</p>
          </div>
        )}

        {loadingDetail && (
          <div className="flex items-center justify-center h-40 text-gray-400">Loading production diary…</div>
        )}

        {detail && !loadingDetail && (
          <div className="space-y-4 max-w-4xl">
            {/* Summary card */}
            <div className="bg-slate-800 text-white rounded-xl px-6 py-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Product</p>
                  <p className="text-xl font-bold">{detail.indent.productName}</p>
                  <p className="font-mono text-slate-400 text-sm mt-0.5">{detail.indent.productCode}</p>
                </div>
                <span className={`px-3 py-1 rounded text-sm font-semibold ${
                  detail.indent.status === 'CLOSED' ? 'bg-emerald-500' :
                  detail.indent.status === 'OPEN' ? 'bg-slate-500' : 'bg-amber-500'}`}>
                  {detail.indent.status}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <InfoChip label="DI No" value={detail.indent.diNo} mono />
                <InfoChip label="Batch No" value={detail.indent.batchNo} mono />
                <InfoChip label="Batch Size" value={detail.indent.batchSize} />
                <InfoChip label="Planned Date" value={new Date(detail.indent.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
                {detail.indent.plant && <InfoChip label="Plant" value={detail.indent.plant} />}
                {detail.indent.equipment && <InfoChip label="Equipment" value={detail.indent.equipment} />}
              </div>
            </div>

            {/* SFG Status */}
            {detail.sfg && (
              <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">🧪 Semi-Finished Goods</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <Stat label="Target (Batch Size)" value={Number(detail.sfg.targetQty).toFixed(2)} />
                  <Stat label="Post Formulation Qty" value={Number(detail.sfg.formulatedQty).toFixed(2)} color="text-indigo-600" />
                  <Stat label="Packed Qty" value={Number(detail.sfg.packedQty).toFixed(2)} color="text-emerald-600" />
                  <Stat label="SFG Balance" value={Number(detail.sfg.sfgQty).toFixed(2)}
                    color={Number(detail.sfg.sfgQty) > 0 ? 'text-orange-500' : 'text-gray-400'} />
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Formulation Progress</span>
                    <span>{Number(detail.sfg.formulatedQty).toFixed(2)} / {Number(detail.sfg.targetQty).toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${Number(detail.sfg.formulatedQty) >= Number(detail.sfg.targetQty) ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                      style={{ width: `${Math.min(100, (Number(detail.sfg.formulatedQty) / Number(detail.sfg.targetQty)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* RM Issuance Diary */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">📋 RM Issuance Diary</h3>
                <span className="text-xs text-gray-400">
                  {detail.rmHistory?.length || 0} materials · click to expand bag detail
                </span>
              </div>

              {(!detail.rmHistory || detail.rmHistory.length === 0) ? (
                <p className="text-center text-gray-400 py-6 text-sm">No RM lines in this indent</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {detail.rmHistory.map(rm => {
                    const isOpen = expandedRm === rm.rmCode
                    const totalIssued = rm.transactions?.reduce((s, t) => s + Number(t.qtyIssued), 0) || 0
                    const required = Number(rm.requiredQty)
                    const pct = required > 0 ? Math.min(100, (totalIssued / required) * 100) : 0

                    return (
                      <div key={rm.rmCode}>
                        <div
                          onClick={() => setExpandedRm(isOpen ? null : rm.rmCode)}
                          className="px-5 py-3 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900 text-sm">{rm.rmName}</span>
                              <span className="text-xs font-mono text-indigo-600">{rm.rmCode}</span>
                              {rm.fullyIssued && (
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">✓ Complete</span>
                              )}
                              {totalIssued === 0 && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-medium">Pending</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                              <div className="flex-1 max-w-xs h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                  style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                <strong className={totalIssued >= required && required > 0 ? 'text-emerald-600' : 'text-indigo-600'}>
                                  {totalIssued.toFixed(3)}
                                </strong>
                                {' / '}{required.toFixed(3)}
                              </span>
                            </div>
                          </div>
                          <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                        </div>

                        {isOpen && (
                          <div className="bg-indigo-50 border-t border-indigo-100 px-5 py-4">
                            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3">
                              Bag-level transactions ({rm.transactions?.length || 0})
                            </p>
                            {(!rm.transactions || rm.transactions.length === 0) ? (
                              <p className="text-sm text-gray-400 py-2">No issuance transactions recorded yet for this RM</p>
                            ) : (
                              <div className="space-y-2">
                                {rm.transactions.map((tx, i) => (
                                  <div key={tx.outwardId || i} className="bg-white rounded-lg border border-indigo-100 px-4 py-3">
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                      <div>
                                        <p className="text-xs text-gray-400 mb-0.5">
                                          {tx.timestamp ? new Date(tx.timestamp).toLocaleString('en-IN', {
                                            day: '2-digit', month: 'short', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                          }) : '—'}
                                        </p>
                                        <p className="font-mono text-indigo-700 text-sm font-semibold">{tx.packId || tx.sourceId || '—'}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-red-600 font-bold text-lg">−{Number(tx.qtyIssued).toFixed(3)}</p>
                                      </div>
                                    </div>

                                    {tx.packDetails && (
                                      <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                        <div>
                                          <p className="text-gray-400">Pack ID</p>
                                          <p className="font-mono text-gray-700 font-medium">{tx.packDetails.packId}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-400">Lot No</p>
                                          <p className="font-medium text-gray-700">{tx.packDetails.lotNo}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-400">Bag No</p>
                                          <p className="font-medium text-gray-700">#{tx.packDetails.bagNo}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-400">Pack Qty</p>
                                          <p className="font-medium text-gray-700">{Number(tx.packDetails.packQty).toFixed(3)} {tx.packDetails.uom}</p>
                                        </div>
                                        {tx.packDetails.supplier && (
                                          <div>
                                            <p className="text-gray-400">Supplier</p>
                                            <p className="font-medium text-gray-700">{tx.packDetails.supplier}</p>
                                          </div>
                                        )}
                                        {tx.packDetails.invoiceNo && (
                                          <div>
                                            <p className="text-gray-400">Invoice</p>
                                            <p className="font-medium text-gray-700">{tx.packDetails.invoiceNo}</p>
                                          </div>
                                        )}
                                        {tx.packDetails.receivedDate && (
                                          <div>
                                            <p className="text-gray-400">Received</p>
                                            <p className="font-medium text-gray-700">
                                              {new Date(tx.packDetails.receivedDate).toLocaleDateString('en-IN')}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="mt-3 flex justify-between text-sm border-t border-indigo-200 pt-2">
                              <span className="text-gray-600">Total Issued for this RM</span>
                              <span className={`font-bold ${totalIssued >= required && required > 0 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                {totalIssued.toFixed(3)} / {required.toFixed(3)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Summary stats */}
            {detail.summary && (
              <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Stat label="Total RM Lines" value={detail.summary.totalRms} />
                  <Stat label="Fully Issued" value={detail.summary.fullyIssuedRms} color="text-emerald-600" />
                  <Stat label="Pending" value={(detail.summary.totalRms || 0) - (detail.summary.fullyIssuedRms || 0)}
                    color={(detail.summary.totalRms - detail.summary.fullyIssuedRms) > 0 ? 'text-red-500' : 'text-gray-400'} />
                  <Stat label="Total Transactions" value={detail.summary.totalOutwardTxns} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoChip({ label, value, mono }) {
  return (
    <div>
      <p className="text-slate-400 text-xs uppercase tracking-wide">{label}</p>
      <p className={`text-white font-semibold mt-0.5 ${mono ? 'font-mono text-sm' : ''}`}>{value ?? '—'}</p>
    </div>
  )
}

function Stat({ label, value, color = 'text-gray-900' }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
