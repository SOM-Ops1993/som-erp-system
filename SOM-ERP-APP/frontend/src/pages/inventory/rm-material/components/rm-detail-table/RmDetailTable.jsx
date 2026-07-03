import './RmDetailTable.css'
import Pagination from '../../../../../components/pagination/Pagination.jsx'
import { fmtQty, fmtDate, statusMeta, groupStatus } from '../rmDetailHelpers.js'
import { Button } from '../../../../../components/ui'

export default function RmDetailTable({ loading, filteredGroups, paginatedGroups, allGroups, hasFilters, expanded, onToggle, onExpandAll, onCollapseAll, totalBags, uom, page, limit, onPageChange, onLimitChange }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-900">Inward History</h2>
          {!loading && (
            <span className="text-xs text-gray-400">
              {filteredGroups.length} lot{filteredGroups.length !== 1 ? 's' : ''} · {totalBags} bags
              {hasFilters && allGroups.length !== filteredGroups.length && (
                <span className="text-indigo-500 ml-1">(filtered from {allGroups.length})</span>
              )}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="xs" onClick={onExpandAll}>Expand all</Button>
          <Button variant="outline-gray" size="xs" onClick={onCollapseAll}>Collapse all</Button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading history…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-700 text-white text-xs">
                <th className="w-8 px-3 py-2.5" />
                <th className="text-left px-3 py-2.5 font-semibold">Lot / Invoice</th>
                <th className="text-left px-3 py-2.5 font-semibold">Supplier</th>
                <th className="text-center px-3 py-2.5 font-semibold">Bags</th>
                <th className="text-right px-3 py-2.5 font-semibold">Total Qty</th>
                <th className="text-right px-3 py-2.5 font-semibold">Remaining</th>
                <th className="text-left px-3 py-2.5 font-semibold">Received</th>
                <th className="text-left px-3 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-14 text-gray-400">
                    {hasFilters ? 'No records match your filters.' : 'No inward history found.'}
                  </td>
                </tr>
              ) : paginatedGroups.map(g => {
                const isOpen   = expanded.has(g.key)
                const totalQty = g.bags.reduce((s, b) => s + (Number(b.packQty) || 0), 0)
                const remQty   = g.bags.reduce((s, b) => s + (b.remainingQty != null ? Number(b.remainingQty) : 0), 0)
                const gStatus  = groupStatus(g.bags)
                const sm       = statusMeta(gStatus)

                return (
                  <>
                    {/* Group row */}
                    <tr key={g.key} onClick={() => onToggle(g.key)}
                      className={`border-t border-gray-200 cursor-pointer select-none transition-colors ${isOpen ? 'bg-indigo-50 hover:bg-indigo-100/60' : 'hover:bg-gray-50'}`}>
                      <td className="px-3 py-3 text-center text-gray-400 text-xs">{isOpen ? '▼' : '▶'}</td>
                      <td className="px-3 py-3">
                        <div className="font-mono text-xs font-semibold text-gray-800">{g.lotNo || '—'}</div>
                        {g.invoiceNo && <div className="text-xs text-gray-400 mt-0.5">Inv: {g.invoiceNo}</div>}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">{g.supplier || '—'}</td>
                      <td className="px-3 py-3 text-center">
                        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{g.bags.length}</span>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-gray-800 tabular-nums">
                        {fmtQty(totalQty)} <span className="text-xs text-gray-400 font-normal">{g.uom}</span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        <span className={`font-semibold ${remQty > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>{fmtQty(remQty)}</span>
                        {totalQty > 0 && (
                          <div className="text-[10px] text-gray-400">{Math.round(((totalQty - remQty) / totalQty) * 100)}% used</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-500">{fmtDate(g.receivedDate)}</td>
                      <td className="px-3 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${sm.cls}`}>{sm.label}</span>
                      </td>
                    </tr>

                    {/* Bag sub-rows */}
                    {isOpen && g.bags.map(bag => {
                      const bTotal = Number(bag.packQty) || 0
                      const bRem   = bag.remainingQty != null ? Number(bag.remainingQty) : bTotal
                      const bUsed  = Math.max(0, bTotal - bRem)
                      const bPct   = bTotal > 0 ? Math.min(100, (bUsed / bTotal) * 100) : 0
                      const bMeta  = statusMeta(bag.status)
                      const barCls = bPct >= 100 ? 'bg-gray-400' : bPct >= 70 ? 'bg-amber-400' : 'bg-emerald-500'

                      return (
                        <tr key={bag.packId} className="border-t border-gray-100 bg-slate-50">
                          <td className="px-3 py-2.5" />
                          <td className="px-3 py-2.5" colSpan={1}>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                {bag.bagNo || '—'}
                              </div>
                              <div>
                                <div className="text-xs font-mono text-gray-600 leading-tight">{bag.packId}</div>
                                <div className="text-[10px] text-gray-400">Bag #{bag.bagNo}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-400">{bag.supplier || '—'}</td>
                          <td className="px-3 py-2.5" />
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            <span className="text-xs font-semibold text-gray-700">{fmtQty(bTotal)}</span>
                            <span className="text-xs text-gray-400 ml-1">{bag.uom}</span>
                          </td>
                          <td className="px-3 py-2.5" colSpan={1}>
                            <div className="flex flex-col gap-1 min-w-36">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all duration-500 ${barCls}`} style={{ width: `${bPct}%` }} />
                                </div>
                                <span className="text-[10px] text-gray-500 tabular-nums w-8 text-right flex-shrink-0">{Math.round(bPct)}%</span>
                              </div>
                              <div className="flex justify-between text-[10px] text-gray-400">
                                <span>Used: {fmtQty(bUsed)}</span>
                                <span className="text-emerald-600 font-medium">{fmtQty(bRem)} left</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-400">{fmtDate(bag.receivedDate)}</td>
                          <td className="px-3 py-2.5">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${bMeta.cls}`}>{bMeta.label}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </>
                )
              })}
            </tbody>
          </table>
          <div className="px-4 pb-3">
            <Pagination page={page} total={filteredGroups.length} limit={limit} onChange={onPageChange} onLimitChange={onLimitChange} />
          </div>
        </div>
      )}
    </div>
  )
}
