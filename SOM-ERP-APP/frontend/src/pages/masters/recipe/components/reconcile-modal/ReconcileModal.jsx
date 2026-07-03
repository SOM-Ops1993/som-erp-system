import { useState, useEffect } from 'react'
import { X, Link, XCircle } from 'lucide-react'
import { recipeApi } from '../../../../../api/masters.js'
import { Button, IconButton } from '../../../../../components/ui'
import './ReconcileModal.css'

const CONFIDENCE_STYLES = {
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  green:   'bg-green-100 text-green-700 border-green-200',
  amber:   'bg-amber-100 text-amber-700 border-amber-200',
  red:     'bg-red-100 text-red-700 border-red-200',
}

export default function ReconcileModal({ onClose, onFixed }) {
  const [loading, setLoading]             = useState(false)
  const [data, setData]                   = useState(null)
  const [pendingMappings, setPendingMappings] = useState({})
  const [fixing, setFixing]               = useState(false)
  const [fixResult, setFixResult]         = useState(null)

  // Load reconcile data on mount
  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const res = await recipeApi.checkRmMapping()
        setData(res.data)
        const auto = {}
        for (const u of res.data.unmatched || []) {
          if (u.autoSuggest) auto[u.recipeRmCode] = u.autoSuggest.itemCode
        }
        setPendingMappings(auto)
      } catch (e) { alert(e.message) }
      setLoading(false)
    })()
  }, [])

  const applyFixes = async () => {
    const mappings = Object.entries(pendingMappings)
      .filter(([, toCode]) => toCode)
      .map(([fromCode, toCode]) => ({ fromCode, toCode }))
    if (!mappings.length) { alert('No mappings selected'); return }
    setFixing(true)
    try {
      const res = await recipeApi.fixRmMapping(mappings)
      setFixResult(res)
      onFixed()
    } catch (e) { alert(e.message) }
    setFixing(false)
  }

  const handleClose = () => { setData(null); setFixResult(null); onClose() }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">🔗 Fix RM Mapping</h2>
            <p className="text-xs text-gray-500 mt-0.5">Recipe rows with RMs not matching RM Master</p>
          </div>
          <IconButton icon={X} tooltip="Close" onClick={handleClose} />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-10 text-gray-400">Scanning recipe vs RM Master…</div>
          ) : !data ? null : (
            <>
              {/* Stats */}
              <div className="flex gap-4 mb-4 text-sm">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 flex-1 text-center">
                  <p className="text-xl font-bold text-emerald-700">{data.matched}</p>
                  <p className="text-xs text-emerald-600">Correctly Matched</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex-1 text-center">
                  <p className="text-xl font-bold text-red-600">{data.unmatched?.length || 0}</p>
                  <p className="text-xs text-red-500">Unmatched / Broken</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 flex-1 text-center">
                  <p className="text-xl font-bold text-gray-700">{data.total}</p>
                  <p className="text-xs text-gray-500">Total RM Lines</p>
                </div>
              </div>

              {data.unmatched?.length === 0 ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center text-emerald-700">
                  <p className="text-3xl mb-2">✅</p>
                  <p className="font-semibold">All RM codes correctly matched!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.unmatched.map(u => (
                    <div key={u.recipeRmCode} className="border border-amber-200 bg-amber-50 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-amber-100 border-b border-amber-200 flex items-center gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-red-700">{u.recipeRmName}</span>
                            <span className="font-mono text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">{u.recipeRmCode}</span>
                            <span className="text-xs text-gray-500">· {u.affectedRows} recipe row{u.affectedRows !== 1 ? 's' : ''}</span>
                          </div>
                          <p className="text-xs text-red-600 mt-0.5">⚠ This RM code does not exist in RM Master</p>
                        </div>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Map to:</p>
                        <div className="space-y-2">
                          {u.suggestions.map(s => (
                            <label key={s.itemCode} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition
                              ${pendingMappings[u.recipeRmCode] === s.itemCode ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200' : 'bg-white border-gray-200 hover:border-indigo-300'}`}>
                              <input type="radio" name={`map_${u.recipeRmCode}`} value={s.itemCode}
                                checked={pendingMappings[u.recipeRmCode] === s.itemCode}
                                onChange={() => setPendingMappings(m => ({ ...m, [u.recipeRmCode]: s.itemCode }))}
                                className="accent-indigo-600" />
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold text-sm text-gray-900">{s.itemName}</span>
                                <span className="font-mono text-xs text-indigo-600 ml-2">{s.itemCode}</span>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${CONFIDENCE_STYLES[s.color]}`}>
                                {s.confidence} {s.pct}%
                              </span>
                            </label>
                          ))}
                          <label className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition
                            ${!pendingMappings[u.recipeRmCode] ? 'bg-gray-50 border-gray-400 ring-2 ring-gray-200' : 'bg-white border-gray-200 hover:border-gray-400'}`}>
                            <input type="radio" name={`map_${u.recipeRmCode}`} value=""
                              checked={!pendingMappings[u.recipeRmCode]}
                              onChange={() => setPendingMappings(m => { const n = { ...m }; delete n[u.recipeRmCode]; return n })}
                              className="accent-gray-500" />
                            <span className="text-sm text-gray-500 italic">Skip — don't remap this one</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {fixResult && (
                <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
                  <p className="font-semibold">✅ {fixResult.totalFixed} recipe row(s) updated successfully</p>
                </div>
              )}
            </>
          )}
        </div>

        {data?.unmatched?.length > 0 && !fixResult && (
          <div className="px-6 pb-5 pt-3 border-t flex gap-3 flex-shrink-0">
            <Button
              variant="purple"
              icon={Link}
              onClick={applyFixes}
              disabled={fixing || Object.keys(pendingMappings).length === 0}
              loading={fixing}
              fullWidth
            >
              {fixing ? 'Applying…' : `Apply ${Object.keys(pendingMappings).length} Mapping(s)`}
            </Button>
            <Button variant="secondary" icon={XCircle} onClick={handleClose}>Cancel</Button>
          </div>
        )}
        {(fixResult || data?.unmatched?.length === 0) && (
          <div className="px-6 pb-5 pt-3 border-t flex-shrink-0">
            <Button variant="primary" onClick={handleClose} fullWidth>Close</Button>
          </div>
        )}
      </div>
    </div>
  )
}
