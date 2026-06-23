import { useState, useEffect } from 'react'
import { outwardApi } from '../../../../../api/inventory.js'
import BackButton from '../../../../../components/erp/BackButton.jsx'
import WarehouseToWarehouse from '../components/WarehouseToWarehouse.jsx'
import WarehouseToContainer from '../components/WarehouseToContainer.jsx'
import MaterialIssueByBOM from '../components/MaterialIssueByBOM.jsx'
import StockLossAdjustment from '../components/StockLossAdjustment.jsx'

const MODES = [
  {
    key: 'wh-wh',
    icon: '🏭',
    label: 'Warehouse → Warehouse',
    desc: 'Transfer a pack from one warehouse/location to another',
    color: 'border-blue-300 hover:border-blue-500 hover:bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    key: 'bom-issue',
    icon: '📋',
    label: 'Material Issue by BOM',
    desc: 'Issue raw materials to plant based on product recipe — scan pack or container QR per RM',
    color: 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50',
    badge: 'bg-indigo-100 text-indigo-700',
  },
  {
    key: 'wh-cont',
    icon: '🛢️',
    label: 'Warehouse → Container',
    desc: 'Fill a container from warehouse packs — scan bag QR to select material',
    color: 'border-orange-300 hover:border-orange-500 hover:bg-orange-50',
    badge: 'bg-orange-100 text-orange-700',
  },
  {
    key: 'stock-loss',
    icon: '⚠️',
    label: 'Stock Loss Adjustment',
    desc: 'Record material lost during production, spillage, damage or weighing errors — scan bag QR',
    color: 'border-red-300 hover:border-red-500 hover:bg-red-50',
    badge: 'bg-red-100 text-red-700',
  },
]

function fmt(ts) {
  return new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const TYPE_COLOR = {
  BOM_ISSUANCE:      'bg-indigo-100 text-indigo-700',
  DIRECT_ISSUE:      'bg-blue-100 text-blue-700',
  PACK_REDUCTION:    'bg-orange-100 text-orange-700',
  CONTAINER_ISSUE:   'bg-green-100 text-green-700',
  WAREHOUSE_TRANSFER:'bg-gray-100 text-gray-700',
  STOCK_ADJUSTMENT:  'bg-red-100 text-red-700',
}

export default function Outward() {
  const [mode, setMode]       = useState(null)
  const [history, setHistory] = useState([])
  const [histPage, setHistPage] = useState(1)
  const [histTotal, setHistTotal] = useState(0)
  const LIMIT = 15

  useEffect(() => { loadHistory() }, [histPage])

  const loadHistory = async () => {
    try {
      const r = await outwardApi.history({ page: histPage, limit: LIMIT })
      setHistory(r.data || [])
      setHistTotal(r.total || 0)
    } catch { /* silent */ }
  }

  const goBack = () => { setMode(null); loadHistory() }

  // ── Mode panels ──────────────────────────────────────────────────────────────
  if (mode === 'wh-wh')      return <Panel mode={MODES[0]} onBack={goBack}><WarehouseToWarehouse /></Panel>
  if (mode === 'bom-issue')  return <Panel mode={MODES[1]} onBack={goBack}><MaterialIssueByBOM /></Panel>
  if (mode === 'wh-cont')    return <Panel mode={MODES[2]} onBack={goBack}><WarehouseToContainer /></Panel>
  if (mode === 'stock-loss') return <Panel mode={MODES[3]} onBack={goBack}><StockLossAdjustment /></Panel>

  // ── Landing: mode selector + recent history ──────────────────────────────────
  const totalPages = Math.ceil(histTotal / LIMIT)

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Outward — Issue Materials</h1>
          <p className="text-sm text-gray-500">Select the type of outward transaction</p>
        </div>
        <BackButton />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {MODES.map(m => (
          <button key={m.key} onClick={() => setMode(m.key)}
            className={`bg-white border-2 rounded-xl p-5 text-left transition-all ${m.color}`}>
            <div className="text-3xl mb-3">{m.icon}</div>
            <div className="font-bold text-gray-900 text-sm mb-1">{m.label}</div>
            <div className="text-xs text-gray-500">{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Recent history */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Recent Transactions</h2>
          <button onClick={loadHistory} className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">Refresh</button>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-700 text-white">
              <tr>
                <th className="text-left px-4 py-2.5">Date &amp; Time</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">RM Name</th>
                <th className="text-left px-4 py-2.5">Source (Pack / Container)</th>
                <th className="text-right px-4 py-2.5">Qty Issued</th>
                <th className="text-left px-4 py-2.5">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No transactions yet</td></tr>
              ) : history.map(h => (
                <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{fmt(h.timestamp)}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLOR[h.sourceType] || 'bg-gray-100 text-gray-600'}`}>
                      {h.sourceType?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-800 font-medium">{h.rmName || h.rmCode}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-600 max-w-[160px] truncate">{h.sourceId}</td>
                  <td className="px-4 py-2 text-right font-semibold text-red-600">{Number(h.qtyIssued).toFixed(3)}</td>
                  <td className="px-4 py-2 text-xs text-gray-400 max-w-[140px] truncate">{h.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-3">
            <button disabled={histPage <= 1} onClick={() => setHistPage(p => p - 1)}
              className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Prev</button>
            <span className="text-sm text-gray-600 self-center">Page {histPage} / {totalPages}</span>
            <button disabled={histPage >= totalPages} onClick={() => setHistPage(p => p + 1)}
              className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        )}
      </div>
    </div>
  )
}

function Panel({ mode, onBack, children }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-0 border-b border-gray-200 bg-white">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 mb-3">← Back to Outward</button>
        <div className="flex items-center gap-3 pb-4">
          <span className="text-2xl">{mode.icon}</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{mode.label}</h1>
            <p className="text-sm text-gray-500">{mode.desc}</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
