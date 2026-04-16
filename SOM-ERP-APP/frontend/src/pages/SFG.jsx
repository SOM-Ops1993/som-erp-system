import { useState, useEffect } from 'react'
import { sfgApi } from '../api/client.js'

const STATUS_COLOR = {
  OPEN:     'bg-gray-100 text-gray-600',
  PARTIAL:  'bg-indigo-100 text-indigo-700',
  COMPLETE: 'bg-emerald-100 text-emerald-700',
}

export default function SFG() {
  const [entries, setEntries] = useState([])
  const [summary, setSummary] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [localEdits, setLocalEdits] = useState({})  // { sfgId: { packedQty, sfgQty } }
  const [saving, setSaving] = useState({})

  const loadData = async () => {
    setLoading(true)
    try {
      const [listRes, sumRes] = await Promise.all([
        showAll
          ? sfgApi.listAll(statusFilter ? { status: statusFilter } : {})
          : sfgApi.list(statusFilter ? { status: statusFilter } : {}),
        sfgApi.summary(),
      ])
      setEntries(listRes.data || [])
      setSummary(sumRes.data || [])
      setLocalEdits({})
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [statusFilter, showAll])

  // Initialize local edits when an entry is expanded
  const handleExpand = (sfgId) => {
    if (expanded === sfgId) {
      setExpanded(null)
      return
    }
    setExpanded(sfgId)
    const entry = entries.find(e => e.sfgId === sfgId)
    if (entry && !localEdits[sfgId]) {
      setLocalEdits(prev => ({
        ...prev,
        [sfgId]: {
          packedQty: Number(entry.packedQty),
          sfgQty: Number(entry.sfgQty),
        }
      }))
    }
  }

  const handleEditChange = (sfgId, field, value) => {
    setLocalEdits(prev => ({
      ...prev,
      [sfgId]: { ...prev[sfgId], [field]: value }
    }))
  }

  const handleSave = async (sfgId) => {
    const edits = localEdits[sfgId]
    if (!edits) return
    setSaving(s => ({ ...s, [sfgId]: true }))
    try {
      const existing = entries.find(e => e.sfgId === sfgId)
      const payload = {
        formulatedQty: Number(existing.formulatedQty),
        packedQty: parseFloat(edits.packedQty) || 0,
        sfgQty: parseFloat(edits.sfgQty) || 0,
      }
      const res = await sfgApi.update(sfgId, payload)
      setEntries(prev => prev.map(e => e.sfgId === sfgId ? { ...e, ...res.data } : e))
      // Reset local edits to saved values
      setLocalEdits(prev => ({
        ...prev,
        [sfgId]: {
          packedQty: Number(res.data.packedQty),
          sfgQty: Number(res.data.sfgQty),
        }
      }))
      sfgApi.summary().then(r => setSummary(r.data || []))
    } catch (err) {
      alert('Failed to save: ' + err.message)
    }
    setSaving(s => ({ ...s, [sfgId]: false }))
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🧪 SFG Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">Semi-Finished Goods — visible after all RM for the indent is fully issued</p>
        </div>
        <button onClick={loadData} className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600">
          ↻ Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {summary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {summary.map(s => {
            const totals = s.entries?.reduce((acc, e) => ({
              formulated: acc.formulated + Number(e.formulatedQty),
              packed: acc.packed + Number(e.packedQty),
              sfg: acc.sfg + Number(e.sfgQty),
            }), { formulated: 0, packed: 0, sfg: 0 })
            return (
              <div key={s.productCode} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="text-xs text-gray-400 font-mono mb-0.5">{s.productCode}</div>
                <div className="font-bold text-gray-800 truncate">{s.productName}</div>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Formulated</span>
                    <span className="font-semibold text-indigo-600">{totals?.formulated.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Packed</span>
                    <span className="font-semibold text-emerald-600">{totals?.packed.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1.5">
                    <span className="text-gray-700 font-medium">Qty in Hand</span>
                    <span className={`font-bold ${totals?.sfg > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {totals?.sfg.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[
          { key: '', label: 'All' },
          { key: 'OPEN', label: 'Open' },
          { key: 'PARTIAL', label: 'In Progress' },
          { key: 'COMPLETE', label: 'Complete' },
        ].map(f => (
          <button key={f.key} onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1.5 text-sm rounded border font-medium transition
              ${statusFilter === f.key ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 text-gray-500 hover:bg-gray-50'}`}>
            {f.label}
          </button>
        ))}
        <label className="flex items-center gap-2 ml-auto text-sm text-gray-500 cursor-pointer">
          <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="rounded" />
          Show all (incl. pending issuance)
        </label>
      </div>

      {!showAll && entries.length === 0 && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800 mb-4">
          <strong>ℹ️ SFG entries appear here only after all RM for that indent have been issued (outward).</strong>
          <br />To see all SFG entries including those still in progress, enable "Show all" above.
        </div>
      )}

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
          No SFG entries found.{showAll ? '' : ' Enable "Show all" or complete RM issuance for indents.'}
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(sfg => {
            const formulated = Number(sfg.formulatedQty)
            const packed = Number(sfg.packedQty)
            const sfgQty = Number(sfg.sfgQty)
            const target = Number(sfg.targetQty)
            const pct = target > 0 ? Math.min(100, (formulated / target) * 100) : 0
            const isSaving = saving[sfg.sfgId]
            const isExpanded = expanded === sfg.sfgId
            const edits = localEdits[sfg.sfgId] || { packedQty: packed, sfgQty }

            return (
              <div key={sfg.sfgId} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Collapsed header — click to expand */}
                <div
                  className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => handleExpand(sfg.sfgId)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900">{sfg.productName}</span>
                      <span className="text-gray-400 font-mono text-xs">[{sfg.productCode}]</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLOR[sfg.status] || 'bg-gray-100 text-gray-500'}`}>
                        {sfg.status}
                      </span>
                      {isSaving && <span className="text-xs text-indigo-500 animate-pulse">Saving...</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 flex gap-3 flex-wrap">
                      <span>Indent: <span className="font-mono">{sfg.indentId.slice(-8)}</span></span>
                      <span>Target: <strong>{target.toFixed(2)}</strong></span>
                      <span>Formulated: <strong className="text-indigo-600">{formulated.toFixed(2)}</strong></span>
                      <span>Packed: <strong className="text-emerald-600">{packed.toFixed(2)}</strong></span>
                      {sfgQty > 0 && <span className="text-orange-500 font-medium">In Hand: {sfgQty.toFixed(2)}</span>}
                    </div>
                  </div>
                  <div className="w-28 hidden sm:block">
                    <div className="text-right text-xs text-gray-400 mb-1">{pct.toFixed(0)}%</div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-gray-300">{isExpanded ? '▲' : '▼'}</span>
                </div>

                {/* Expanded detail with direct input fields */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 px-5 py-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-5">
                      {/* Target — read only */}
                      <div>
                        <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide font-medium">Target (Batch Size)</p>
                        <p className="font-bold text-xl text-gray-700">{target.toFixed(2)}</p>
                      </div>

                      {/* Post Formulation — read only, auto-filled */}
                      <div>
                        <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide font-medium">Post Formulation Qty</p>
                        <p className="font-bold text-xl text-indigo-600">{formulated.toFixed(2)}</p>
                        {formulated === target && (
                          <p className="text-xs text-gray-400 mt-0.5">auto-filled = target</p>
                        )}
                      </div>

                      {/* Packed Qty — direct input */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide font-medium block">
                          Packed Qty
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={edits.packedQty}
                          onChange={e => handleEditChange(sfg.sfgId, 'packedQty', e.target.value)}
                          className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-base font-semibold text-emerald-700
                            focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white"
                        />
                      </div>

                      {/* Qty in Hand — direct input (was sfgQty) */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide font-medium block">
                          Qty in Hand
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={edits.sfgQty}
                          onChange={e => handleEditChange(sfg.sfgId, 'sfgQty', e.target.value)}
                          className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-base font-semibold text-orange-600
                            focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white"
                        />
                        <p className="text-xs text-gray-400 mt-0.5">= Formulated − Packed (adjustable)</p>
                      </div>
                    </div>

                    {/* Save button */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleSave(sfg.sfgId)}
                        disabled={isSaving}
                        className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
                      >
                        {isSaving ? 'Saving…' : '💾 Save Changes'}
                      </button>
                      <button
                        onClick={() => {
                          // Reset to server values
                          setLocalEdits(prev => ({
                            ...prev,
                            [sfg.sfgId]: { packedQty: packed, sfgQty }
                          }))
                        }}
                        className="border border-gray-300 text-gray-500 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 transition"
                      >
                        Reset
                      </button>
                    </div>

                    {/* Progress bars */}
                    <div className="mt-4 space-y-2">
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Formulation vs Target</span>
                          <span>{formulated.toFixed(2)} / {target.toFixed(2)} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      {formulated > 0 && (
                        <div>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Packing Progress</span>
                            <span>{packed.toFixed(2)} / {formulated.toFixed(2)} ({formulated > 0 ? ((packed / formulated) * 100).toFixed(1) : 0}%)</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-400"
                              style={{ width: `${formulated > 0 ? Math.min(100, (packed / formulated) * 100) : 0}%` }} />
                          </div>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 mt-3">
                      Indent: {sfg.indentId} ·
                      Created: {new Date(sfg.createdAt).toLocaleString('en-IN')} ·
                      Updated: {new Date(sfg.updatedAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
