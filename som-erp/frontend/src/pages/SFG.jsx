import { useState, useEffect } from 'react'
import { sfgApi } from '../api/client'
import { FlaskConical, RefreshCw, ChevronDown, ChevronRight, Edit2, Check, X } from 'lucide-react'

const STATUS_COLOR = {
  OPEN:        'bg-gray-100 text-gray-600',
  FORMULATING: 'bg-blue-100 text-blue-700',
  PACKING:     'bg-yellow-100 text-yellow-700',
  COMPLETE:    'bg-green-100 text-green-700',
}

function EditableQty({ label, value, onSave, unit }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')

  const startEdit = () => { setVal(Number(value).toString()); setEditing(true) }
  const cancel = () => setEditing(false)
  const save = () => { onSave(parseFloat(val) || 0); setEditing(false) }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number" step="0.001" min="0"
          className="border rounded px-2 py-1 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-primary"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
          autoFocus
        />
        <button onClick={save} className="text-green-600 hover:text-green-700"><Check size={14} /></button>
        <button onClick={cancel} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>
    )
  }
  return (
    <button
      onClick={startEdit}
      className="flex items-center gap-1 group hover:text-primary transition"
      title={`Edit ${label}`}
    >
      <span className="font-semibold">{Number(value).toFixed(2)}</span>
      <span className="text-gray-400 text-xs">{unit}</span>
      <Edit2 size={11} className="text-gray-300 group-hover:text-primary" />
    </button>
  )
}

export default function SFG() {
  const [view, setView] = useState('list') // list | summary
  const [entries, setEntries] = useState([])
  const [summary, setSummary] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [statusFilter, setStatusFilter] = useState('OPEN,FORMULATING,PACKING')
  const [saving, setSaving] = useState({}) // sfgId -> bool

  const loadData = async () => {
    setLoading(true)
    try {
      const [listRes, sumRes] = await Promise.all([
        sfgApi.list({ status: statusFilter }),
        sfgApi.summary(),
      ])
      setEntries(listRes.data || [])
      setSummary(sumRes.data || [])
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [statusFilter])

  const handleUpdate = async (sfgId, field, value) => {
    setSaving((s) => ({ ...s, [sfgId]: true }))
    try {
      const existing = entries.find((e) => e.sfgId === sfgId)
      const payload = {
        formulatedQty: field === 'formulatedQty' ? value : Number(existing.formulatedQty),
        packedQty: field === 'packedQty' ? value : Number(existing.packedQty),
      }
      const res = await sfgApi.update(sfgId, payload)
      setEntries((prev) => prev.map((e) => (e.sfgId === sfgId ? res.data : e)))
      // Refresh summary
      sfgApi.summary().then((r) => setSummary(r.data || []))
    } catch (err) {
      alert('Update failed: ' + err.message)
    }
    setSaving((s) => ({ ...s, [sfgId]: false }))
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FlaskConical size={24} className="text-primary" />
          <div>
            <h1 className="text-xl font-bold text-primary">SFG Tracker</h1>
            <p className="text-xs text-gray-400">Semi-Finished Goods — formulation & packing progress</p>
          </div>
        </div>
        <button onClick={loadData} className="btn-outline flex items-center gap-1.5">
          <RefreshCw size={14} />Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {summary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {summary.map((s) => {
            const sfgPct = s.totalTarget > 0 ? Math.min(100, (s.totalSfgQty / s.totalTarget) * 100) : 0
            return (
              <div key={s.productCode} className="card">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide truncate">
                  {s.productCode}
                </p>
                <p className="font-bold text-gray-800 truncate mt-0.5">{s.productName}</p>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Formulated</span>
                    <span className="font-semibold text-blue-600">{s.totalFormulated.toFixed(2)} {s.batchUnit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Packed</span>
                    <span className="font-semibold text-green-600">{s.totalPacked.toFixed(2)} {s.batchUnit}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1.5">
                    <span className="text-gray-700 font-medium">Available SFG</span>
                    <span className={`font-bold ${s.totalSfgQty > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {s.totalSfgQty.toFixed(2)} {s.batchUnit}
                    </span>
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${sfgPct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tabs + filter */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex rounded-lg border overflow-hidden">
          {[
            { key: 'OPEN,FORMULATING,PACKING', label: 'Active' },
            { key: 'COMPLETE', label: 'Completed' },
            { key: 'OPEN,FORMULATING,PACKING,COMPLETE', label: 'All' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 text-sm font-medium transition ${statusFilter === f.key ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">{entries.length} entries • Click qty to edit</p>
      </div>

      {/* List */}
      {loading && <div className="text-center text-gray-400 py-10">Loading SFG entries…</div>}

      {!loading && entries.length === 0 && (
        <div className="text-center text-gray-400 py-10">
          No SFG entries found. They are auto-created when an indent is created.
        </div>
      )}

      <div className="space-y-2">
        {entries.map((sfg) => {
          const isSaving = saving[sfg.sfgId]
          const sfgQty = Number(sfg.sfgQty)
          const formulated = Number(sfg.formulatedQty)
          const packed = Number(sfg.packedQty)
          const target = Number(sfg.targetQty)
          const pct = target > 0 ? Math.min(100, (formulated / target) * 100) : 0
          const statusCfg = STATUS_COLOR[sfg.status] || 'bg-gray-100 text-gray-500'

          return (
            <div key={sfg.sfgId} className="card p-0 overflow-hidden">
              {/* Row header */}
              <div
                className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => setExpanded(expanded === sfg.sfgId ? null : sfg.sfgId)}
              >
                {expanded === sfg.sfgId
                  ? <ChevronDown size={16} className="shrink-0 text-gray-400" />
                  : <ChevronRight size={16} className="shrink-0 text-gray-400" />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{sfg.productName}</span>
                    <span className="text-gray-400 text-xs">[{sfg.productCode}]</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg}`}>
                      {sfg.status}
                    </span>
                    {isSaving && <span className="text-xs text-blue-500 animate-pulse">Saving…</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 flex gap-3">
                    <span>Indent: {sfg.indentId}</span>
                    <span>Target: {target.toFixed(2)} {sfg.batchUnit}</span>
                    {sfgQty > 0 && (
                      <span className="text-orange-500 font-medium">SFG: {sfgQty.toFixed(2)} {sfg.batchUnit}</span>
                    )}
                  </div>
                </div>
                {/* Mini progress */}
                <div className="w-24 hidden sm:block">
                  <div className="text-right text-xs text-gray-400 mb-1">{pct.toFixed(0)}%</div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-primary'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === sfg.sfgId && (
                <div className="border-t bg-gray-50 px-4 py-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Target Qty</p>
                      <p className="font-bold text-gray-700">{target.toFixed(2)} <span className="text-gray-400 text-xs font-normal">{sfg.batchUnit}</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Formulated Qty <span className="text-blue-400">(click to edit)</span></p>
                      <EditableQty
                        label="Formulated"
                        value={sfg.formulatedQty}
                        unit={sfg.batchUnit}
                        onSave={(v) => handleUpdate(sfg.sfgId, 'formulatedQty', v)}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Packed Qty <span className="text-blue-400">(click to edit)</span></p>
                      <EditableQty
                        label="Packed"
                        value={sfg.packedQty}
                        unit={sfg.batchUnit}
                        onSave={(v) => handleUpdate(sfg.sfgId, 'packedQty', v)}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">SFG Balance</p>
                      <p className={`font-bold text-lg ${sfgQty > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                        {sfgQty.toFixed(2)} <span className="text-sm font-normal text-gray-400">{sfg.batchUnit}</span>
                      </p>
                      <p className="text-xs text-gray-400">= Formulated − Packed</p>
                    </div>
                  </div>

                  {sfg.remarks && (
                    <p className="text-xs text-gray-500 mt-3 bg-white rounded px-3 py-2 border">
                      📝 {sfg.remarks}
                    </p>
                  )}

                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Formulation Progress ({pct.toFixed(1)}%)</span>
                      <span>{formulated.toFixed(2)} / {target.toFixed(2)} {sfg.batchUnit}</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-primary'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {packed > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Packing Progress</span>
                        <span>{packed.toFixed(2)} / {formulated.toFixed(2)} {sfg.batchUnit}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-400 rounded-full transition-all"
                          style={{ width: `${formulated > 0 ? Math.min(100, (packed / formulated) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-2">
                    Created: {new Date(sfg.createdAt).toLocaleString()} ·
                    Updated: {new Date(sfg.updatedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
