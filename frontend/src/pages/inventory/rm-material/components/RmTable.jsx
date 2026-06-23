import { useNavigate } from 'react-router-dom'
import Pagination from '../../../../components/erp/Pagination.jsx'

function fmt(n, dec = 3) {
  if (n == null) return '—'
  const v = Number(n)
  if (isNaN(v)) return '—'
  if (v === 0) return '0'
  return v % 1 === 0
    ? v.toLocaleString('en-IN')
    : v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: dec })
}

function StockBadge({ value }) {
  const v = Number(value) || 0
  if (v <= 0) return <span className="text-red-500 font-semibold">0</span>
  return <span className="text-gray-900 font-semibold">{fmt(v)}</span>
}

function SkeletonRow() {
  return (
    <tr className="border-t border-gray-100 animate-pulse">
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 rounded w-3/4" />
        </td>
      ))}
    </tr>
  )
}

export default function RmTable({ loading, items, filtered, paginated, page, limit, onPageChange, onLimitChange }) {
  const navigate = useNavigate()

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900">Raw Material Register</span>
        {!loading && (
          <span className="text-xs text-gray-400">
            {filtered.length} of {items.length} items
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-700 text-white text-xs">
              <th className="text-left px-4 py-3 font-semibold">#</th>
              <th className="text-left px-4 py-3 font-semibold">Raw Material</th>
              <th className="text-center px-4 py-3 font-semibold">UOM</th>
              <th className="text-right px-4 py-3 font-semibold">In Pack</th>
              <th className="text-right px-4 py-3 font-semibold">In Container</th>
              <th className="text-right px-4 py-3 font-semibold">Total Qty</th>
              <th className="text-center px-4 py-3 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-14 text-gray-400">No raw materials found.</td>
              </tr>
            ) : (
              paginated.map((it, idx) => {
                const hasStock = it.totalStock > 0
                return (
                  <tr key={it.itemCode} className="border-t border-gray-100 hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 text-xs text-gray-400 tabular-nums">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{it.itemName}</div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">{it.itemCode}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-md">{it.uom || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <div><StockBadge value={it.stockInPacks} /></div>
                      {it.activePacks > 0 && (
                        <div className="text-xs text-gray-400 mt-0.5">{it.activePacks} bag{it.activePacks !== 1 ? 's' : ''}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <StockBadge value={it.stockInContainer} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <div className={`text-base font-bold tabular-nums ${hasStock ? 'text-gray-900' : 'text-red-400'}`}>
                        {fmt(it.totalStock)}
                      </div>
                      {!hasStock && <div className="text-[10px] text-red-400 font-medium">OUT OF STOCK</div>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => navigate(`/rm-material/${encodeURIComponent(it.itemCode)}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition-colors">
                        View Details
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="px-5 pb-3">
        <Pagination page={page} total={filtered.length} limit={limit} onChange={onPageChange} onLimitChange={onLimitChange} />
      </div>
    </div>
  )
}
