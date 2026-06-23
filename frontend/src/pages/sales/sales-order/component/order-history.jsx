import { Fragment, useState } from 'react'
import Pagination from '../../../../components/erp/Pagination.jsx'
import { STATUS_STYLE, STATUS_LABELS } from '../shared/constants.js'
import { fmtDate, etdDays } from '../shared/utils.js'

function TypeBadge({ type }) {
  const isExport = type === 'EXPORT'
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isExport ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
      {type || 'DOMESTIC'}
    </span>
  )
}

function EtdCell({ date }) {
  const days    = etdDays(date)
  const overdue = days !== null && days < 0
  const urgent  = days !== null && days >= 0 && days <= 7
  const cls     = overdue ? 'text-red-500 font-semibold' : urgent ? 'text-orange-500 font-semibold' : 'text-gray-500'
  if (!date) return <span className="text-gray-300">—</span>
  return (
    <span className={`text-xs ${cls}`}>
      {fmtDate(date)}
      {days !== null && (
        <span className="ml-1 opacity-70">
          ({overdue ? `${Math.abs(days)}d overdue` : `${days}d`})
        </span>
      )}
    </span>
  )
}

export default function OrderHistory({ orders, loading, onOpenDispatch }) {
  const [limit,        setLimit]        = useState(15)
  const [page,         setPage]         = useState(1)
  const [expandedKeys, setExpandedKeys] = useState(new Set())

  const paginated = orders.slice((page - 1) * limit, page * limit)

  const toggle      = (id) => setExpandedKeys(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const expandAll   = () => setExpandedKeys(new Set(paginated.map(o => o.id)))
  const collapseAll = () => setExpandedKeys(new Set())

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>

  if (!orders.length) return (
    <div className="bg-white rounded-xl border border-gray-200 py-20 text-center text-gray-400">
      <div className="text-4xl mb-3">📋</div>
      <p className="font-semibold text-gray-500">No orders found</p>
      <p className="text-sm mt-1">Try clearing the filters</p>
    </div>
  )

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-gray-800">Order History</h2>
            <span className="text-xs text-gray-400">
              {orders.length} order{orders.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={expandAll}
              className="text-xs text-blue-600 px-2.5 py-1 border border-blue-200 rounded-lg hover:bg-blue-50">
              Expand all
            </button>
            <button onClick={collapseAll}
              className="text-xs text-gray-500 px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-gray-50">
              Collapse all
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* Dark header — same pattern as InwardHistory */}
            <thead className="bg-slate-700 text-white text-xs">
              <tr>
                <th className="w-8 px-3 py-2.5" />
                <th className="text-left px-3 py-2.5 font-semibold">DI No.</th>
                <th className="text-left px-3 py-2.5 font-semibold">Date</th>
                <th className="text-left px-3 py-2.5 font-semibold">Customer</th>
                <th className="text-left px-3 py-2.5 font-semibold">Type</th>
                <th className="text-right px-3 py-2.5 font-semibold">Total Qty</th>
                <th className="text-left px-3 py-2.5 font-semibold">ETD</th>
                <th className="text-left px-3 py-2.5 font-semibold">Invoice</th>
                <th className="text-center px-3 py-2.5 font-semibold">Items</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>

            <tbody>
              {paginated.map(order => {
                const isOpen   = expandedKeys.has(order.id)
                const totalQty = order.items.reduce((n, it) => n + parseFloat(it.totalQty || 0), 0)
                const uom      = order.items[0]?.totalUom || 'KG'

                return (
                  <Fragment key={order.id}>
                    {/* ── Main row — click to expand ── */}
                    <tr
                      onClick={() => toggle(order.id)}
                      className={`border-t border-gray-100 cursor-pointer select-none transition-colors ${
                        isOpen ? 'bg-indigo-50 hover:bg-indigo-100/60' : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Toggle indicator */}
                      <td className="px-3 py-3.5 text-center text-gray-400 text-xs">
                        {isOpen ? '▼' : '▶'}
                      </td>

                      {/* DI No. */}
                      <td className="px-3 py-3.5">
                        <span className="font-mono text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          {order.diNo}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-3 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                        {fmtDate(order.orderReceivedDate)}
                      </td>

                      {/* Customer */}
                      <td className="px-3 py-3.5 font-semibold text-gray-800">
                        {order.customerName}
                      </td>

                      {/* Type */}
                      <td className="px-3 py-3.5">
                        <TypeBadge type={order.orderType} />
                      </td>

                      {/* Total Qty */}
                      <td className="px-3 py-3.5 text-right font-bold text-gray-700 whitespace-nowrap">
                        {totalQty} <span className="text-xs font-normal text-gray-400">{uom}</span>
                      </td>

                      {/* ETD */}
                      <td className="px-3 py-3.5">
                        <EtdCell date={order.estimatedDispatchDate} />
                      </td>

                      {/* Invoice */}
                      <td className="px-3 py-3.5 text-xs text-gray-400 font-mono">
                        {order.invoiceNo || '—'}
                      </td>

                      {/* Items count badge */}
                      <td className="px-3 py-3.5 text-center">
                        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                          {order.items.length}
                        </span>
                      </td>

                      {/* Edit button */}
                      <td className="px-3 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => onOpenDispatch(order)}
                          className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>

                    {/* ── Item sub-rows (visible when expanded) ── */}
                    {isOpen && order.items.map((it, idx) => (
                      <tr key={it.id || idx} className="bg-indigo-50/30 border-t border-indigo-100/60">
                        <td colSpan={10} className="px-0 py-0">
                          <div className="flex items-center pl-8 pr-4 py-2 gap-0">
                            {/* Vertical connector line */}
                            <div className="w-px h-8 bg-indigo-300 mr-4 shrink-0" />

                            {/* Product name + sub-label */}
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-semibold text-gray-800">
                                {it.inhouseProductName || it.customerProductName || '—'}
                              </span>
                              {it.customerProductName && it.customerProductName !== it.inhouseProductName && (
                                <span className="ml-2 text-[10px] text-gray-400 italic">
                                  ({it.customerProductName})
                                </span>
                              )}
                            </div>

                            {/* Qty */}
                            <span className="text-sm font-bold text-gray-700 w-28 shrink-0">
                              {it.totalQty} <span className="text-xs font-normal text-gray-400">{it.totalUom}</span>
                            </span>

                            {/* Packing */}
                            <span className="text-xs text-gray-500 w-52 shrink-0">
                              {[it.unitPackType, it.packingType].filter(Boolean).join(' / ') || '—'}
                            </span>

                            {/* Status */}
                            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full w-28 text-center shrink-0 ${STATUS_STYLE[it.status] || 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_LABELS[it.status] || it.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 pb-3 pt-1">
          <Pagination
            page={page}
            total={orders.length}
            limit={limit}
            onChange={setPage}
            onLimitChange={l => { setLimit(l); setPage(1) }}
          />
        </div>
      </div>
    </>
  )
}
