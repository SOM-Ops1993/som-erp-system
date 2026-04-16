import { useState, useEffect, useRef } from 'react'
import { indentApi, recipeApi } from '../api/client'
import {
  ClipboardList, Plus, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle, Clock, Package, Info
} from 'lucide-react'

const STATUS_CONFIG = {
  OPEN:           { color: 'bg-blue-100 text-blue-700',   label: 'OPEN' },
  PARTIAL:        { color: 'bg-yellow-100 text-yellow-700', label: 'PARTIAL' },
  COMPLETE:       { color: 'bg-green-100 text-green-700',  label: 'COMPLETE' },
  CANCELLED:      { color: 'bg-gray-100 text-gray-500',    label: 'CANCELLED' },
  PENDING_STOCK:  { color: 'bg-red-100 text-red-700',      label: 'PENDING STOCK' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { color: 'bg-gray-100 text-gray-500', label: status }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      {status === 'PENDING_STOCK' && <AlertTriangle size={10} />}
      {cfg.label}
    </span>
  )
}

export default function Indent() {
  const [tab, setTab] = useState('list')
  const [indents, setIndents] = useState([])
  const [products, setProducts] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState(true)

  // Create form state
  const [form, setForm] = useState({
    productCode: '', productName: '', batchSize: '',
    batchUnit: 'Kg', plant: '', equipment: '', diNo: '',
  })
  const [batchNo, setBatchNo] = useState('')
  const [sfgAvailable, setSfgAvailable] = useState(null)
  const [previewRm, setPreviewRm] = useState([])
  const [stockCheck, setStockCheck] = useState(null) // { allOk, checks }
  const [checkingStock, setCheckingStock] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createResult, setCreateResult] = useState(null)
  const [createError, setCreateError] = useState(null)

  // Stock shortfall modal
  const [showStockModal, setShowStockModal] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState(false)

  const stockCheckTimer = useRef(null)

  const loadIndents = async () => {
    setLoading(true)
    try {
      const r = await indentApi.list({ status: 'OPEN,PARTIAL,COMPLETE,PENDING_STOCK', limit: 50 })
      setIndents(r.data || [])
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => {
    loadIndents()
    recipeApi.products().then((r) => setProducts(r.data || []))
  }, [])

  // When product selected — auto-fill plant/equipment, fetch batch no, SFG available
  const handleProductChange = async (productCode) => {
    const product = products.find(
      (p) => (p.product_code || p.productCode) === productCode
    )
    setForm((f) => ({
      ...f,
      productCode,
      productName: product?.product_name || product?.productName || '',
      batchUnit: product?.batch_unit || product?.batchUnit || 'Kg',
      plant: product?.plant || '',
      equipment: product?.equipment || '',
    }))
    setStockCheck(null)
    setBatchNo('')
    setSfgAvailable(null)

    if (!productCode) {
      setPreviewRm([])
      return
    }

    // Parallel fetches
    const [rmRes, batchRes, sfgRes] = await Promise.allSettled([
      recipeApi.list({ productCode }),
      indentApi.nextBatchNo(productCode),
      indentApi.sfgAvailable(productCode),
    ])

    if (rmRes.status === 'fulfilled') setPreviewRm(rmRes.value.data || [])
    if (batchRes.status === 'fulfilled') setBatchNo(batchRes.value.batchNo || '')
    if (sfgRes.status === 'fulfilled') {
      const val = sfgRes.value
      if (val.totalSfg > 0) setSfgAvailable(val)
    }
  }

  // Debounced stock check when batchSize changes
  const handleBatchSizeChange = (val) => {
    setForm((f) => ({ ...f, batchSize: val }))
    setStockCheck(null)
    if (stockCheckTimer.current) clearTimeout(stockCheckTimer.current)
    if (val && form.productCode) {
      stockCheckTimer.current = setTimeout(() => runStockCheck(form.productCode, val), 600)
    }
  }

  const runStockCheck = async (productCode, batchSize) => {
    if (!productCode || !batchSize) return
    setCheckingStock(true)
    try {
      const res = await indentApi.stockCheck(productCode, batchSize)
      setStockCheck(res)
    } catch { /* silent */ }
    setCheckingStock(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // If stock not checked yet, run it first
    if (!stockCheck && form.productCode && form.batchSize) {
      await runStockCheck(form.productCode, form.batchSize)
    }
    // If stock not ok, show confirmation modal
    if (stockCheck && !stockCheck.allOk) {
      setShowStockModal(true)
      return
    }
    doCreate()
  }

  const doCreate = async () => {
    setShowStockModal(false)
    setCreating(true)
    setCreateError(null)
    try {
      const payload = {
        productCode: form.productCode,
        productName: form.productName,
        batchSize: form.batchSize,
        batchUnit: form.batchUnit,
        plant: form.plant,
        diNo: form.diNo,
      }
      const res = await indentApi.create(payload)
      setCreateResult(res)
      loadIndents()
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setForm({ productCode: '', productName: '', batchSize: '', batchUnit: 'Kg', plant: '', equipment: '', diNo: '' })
    setBatchNo('')
    setSfgAvailable(null)
    setPreviewRm([])
    setStockCheck(null)
    setCreateResult(null)
    setCreateError(null)
  }

  const shortfallItems = stockCheck?.checks?.filter((c) => !c.ok) || []

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList size={24} className="text-primary" />
          <div>
            <h1 className="text-xl font-bold text-primary">Indent Management</h1>
            <p className="text-xs text-gray-400">Production work orders with BOM-driven RM issuance</p>
          </div>
        </div>
        <button
          onClick={() => { setTab(tab === 'create' ? 'list' : 'create'); resetForm() }}
          className={tab === 'create' ? 'btn-outline' : 'btn-primary'}
        >
          {tab === 'create' ? '← Back to List' : <><Plus size={15} className="inline mr-1" />New Indent</>}
        </button>
      </div>

      {/* ── CREATE FORM ─────────────────────────────────── */}
      {tab === 'create' && (
        <div className="space-y-4">
          {createResult ? (
            <div className={`card text-center ${createResult.stockOk ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
              {createResult.stockOk ? (
                <>
                  <CheckCircle size={40} className="text-green-500 mx-auto mb-2" />
                  <p className="font-bold text-green-700 text-lg">✅ Indent Created: {createResult.indentId}</p>
                  <p className="text-sm text-gray-600 mt-1">Batch No: <strong>{createResult.batchNo}</strong></p>
                  <p className="text-xs text-gray-400 mt-1">{createResult.detailCount} RM lines auto-generated • SFG tracking entry created</p>
                </>
              ) : (
                <>
                  <AlertTriangle size={40} className="text-orange-500 mx-auto mb-2" />
                  <p className="font-bold text-orange-700 text-lg">⚠️ Indent Created (PENDING STOCK): {createResult.indentId}</p>
                  <p className="text-sm text-gray-600 mt-1">Batch No: <strong>{createResult.batchNo}</strong></p>
                  <p className="text-xs text-gray-500 mt-1">
                    Insufficient stock for {createResult.stockChecks?.length} RM(s). Indent will auto-open when stock arrives.
                  </p>
                  {createResult.stockChecks?.length > 0 && (
                    <div className="mt-3 text-left bg-orange-100 rounded-lg p-3">
                      {createResult.stockChecks.map((c) => (
                        <div key={c.rmCode} className="text-xs text-orange-800">
                          ⚠ {c.rmName}: Need <strong>{c.requiredQty.toFixed(2)} {c.uom}</strong> · Available: {c.availableQty.toFixed(2)} · Short: {c.shortfall.toFixed(2)}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              <div className="flex gap-2 justify-center mt-4">
                <button className="btn-primary" onClick={() => { setTab('list'); loadIndents() }}>
                  View Indents
                </button>
                <button onClick={resetForm} className="btn-outline">Create Another</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Product + Batch */}
              <div className="card">
                <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Production Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="label">Product *</label>
                    <select
                      className="input"
                      value={form.productCode}
                      onChange={(e) => handleProductChange(e.target.value)}
                      required
                    >
                      <option value="">— Select Product (from Recipe DB) —</option>
                      {products.map((p) => {
                        const code = p.product_code || p.productCode
                        const name = p.product_name || p.productName
                        return (
                          <option key={code} value={code}>{name} [{code}]</option>
                        )
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="label">Batch Size *</label>
                    <div className="flex gap-2">
                      <input
                        type="number" step="0.001" className="input flex-1"
                        value={form.batchSize}
                        onChange={(e) => handleBatchSizeChange(e.target.value)}
                        placeholder="e.g. 1000"
                        required
                      />
                      <input
                        type="text" className="input w-20"
                        value={form.batchUnit}
                        onChange={(e) => setForm((f) => ({ ...f, batchUnit: e.target.value }))}
                        placeholder="Kg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">
                      Batch No
                      {batchNo && <span className="text-primary font-semibold ml-1">(Auto: {batchNo})</span>}
                    </label>
                    <input
                      type="text" className="input bg-gray-50"
                      value={batchNo}
                      onChange={(e) => setBatchNo(e.target.value)}
                      placeholder="Auto-generated"
                    />
                  </div>

                  <div>
                    <label className="label">Plant / Line</label>
                    <input
                      type="text" className="input"
                      value={form.plant}
                      onChange={(e) => setForm((f) => ({ ...f, plant: e.target.value }))}
                      placeholder="e.g. MPFU / Line-1"
                    />
                  </div>

                  <div>
                    <label className="label">Equipment</label>
                    <input
                      type="text" className="input"
                      value={form.equipment}
                      onChange={(e) => setForm((f) => ({ ...f, equipment: e.target.value }))}
                      placeholder="e.g. Fermenter-2 / Dryer"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="label">BOM / DI Reference No.</label>
                    <input
                      type="text" className="input"
                      value={form.diNo}
                      onChange={(e) => setForm((f) => ({ ...f, diNo: e.target.value }))}
                      placeholder="e.g. DVS/BOM-2627-0019"
                    />
                  </div>
                </div>
              </div>

              {/* SFG Availability Warning */}
              {sfgAvailable && sfgAvailable.totalSfg > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3">
                  <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-700">
                      SFG Available: {sfgAvailable.totalSfg.toFixed(2)} {form.batchUnit}
                    </p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      There is existing Semi-Finished Goods inventory for this product from previous batches.
                      Consider using it before creating a new indent.
                    </p>
                  </div>
                </div>
              )}

              {/* RM Preview with Stock Check */}
              {previewRm.length > 0 && (
                <div className="card p-0 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      BOM — {previewRm.length} Raw Materials
                    </p>
                    {checkingStock && (
                      <span className="text-xs text-blue-500 flex items-center gap-1">
                        <span className="animate-spin inline-block">⟳</span> Checking stock…
                      </span>
                    )}
                    {stockCheck && !checkingStock && (
                      <span className={`text-xs font-semibold flex items-center gap-1 ${stockCheck.allOk ? 'text-green-600' : 'text-red-600'}`}>
                        {stockCheck.allOk
                          ? <><CheckCircle size={12} /> All stock available</>
                          : <><AlertTriangle size={12} /> {shortfallItems.length} item(s) short</>
                        }
                      </span>
                    )}
                  </div>
                  <div className="overflow-auto max-h-52">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">RM Name</th>
                          <th className="px-3 py-2 text-right">Qty/Unit</th>
                          <th className="px-3 py-2 text-right">Required</th>
                          {stockCheck && <th className="px-3 py-2 text-right">Available</th>}
                          {stockCheck && <th className="px-3 py-2 text-center">Status</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRm.map((r) => {
                          const rmCode = r.rmCode || r.rm_code
                          const rmName = r.rmName || r.rm_name
                          const qtyPer = Number(r.qtyPerUnit || r.qty_per_unit)
                          const required = form.batchSize ? qtyPer * parseFloat(form.batchSize) : null
                          const chk = stockCheck?.checks?.find((c) => c.rmCode === rmCode)
                          return (
                            <tr key={rmCode} className={`border-t ${chk && !chk.ok ? 'bg-red-50' : ''}`}>
                              <td className="px-3 py-1.5">{rmName}</td>
                              <td className="px-3 py-1.5 text-right">{qtyPer} {r.uom}</td>
                              <td className="px-3 py-1.5 text-right font-semibold">
                                {required ? required.toFixed(3) : '—'} {r.uom}
                              </td>
                              {stockCheck && (
                                <td className={`px-3 py-1.5 text-right ${chk && !chk.ok ? 'text-red-600 font-semibold' : 'text-green-600'}`}>
                                  {chk ? chk.availableQty.toFixed(3) : '—'}
                                </td>
                              )}
                              {stockCheck && (
                                <td className="px-3 py-1.5 text-center">
                                  {chk ? (
                                    chk.ok
                                      ? <span className="text-green-600">✓</span>
                                      : <span className="text-red-600 font-bold">−{chk.shortfall.toFixed(2)}</span>
                                  ) : '—'}
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
                  ❌ {createError}
                </div>
              )}

              <button
                type="submit"
                disabled={creating || !form.productCode || !form.batchSize}
                className="btn-primary w-full py-3 text-base"
              >
                {creating
                  ? 'Creating Indent…'
                  : checkingStock
                  ? 'Checking Stock…'
                  : 'Create Indent & Auto-generate RM List'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── STOCK SHORTFALL MODAL ──────────────────────────── */}
      {showStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={28} className="text-red-500" />
              <h2 className="text-lg font-bold text-red-700">Insufficient Stock Warning</h2>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              The following raw materials do not have enough stock for this indent.
              The indent will be created as <strong>PENDING STOCK</strong> and automatically
              activated when stock arrives.
            </p>
            <div className="bg-red-50 rounded-xl p-3 mb-4 space-y-2">
              {shortfallItems.map((c) => (
                <div key={c.rmCode} className="text-sm">
                  <div className="font-semibold text-red-700">{c.rmName}</div>
                  <div className="text-xs text-red-600 flex gap-4">
                    <span>Required: {c.requiredQty.toFixed(2)} {c.uom}</span>
                    <span>Available: {c.availableQty.toFixed(2)} {c.uom}</span>
                    <span className="font-bold">Short: {c.shortfall.toFixed(2)} {c.uom}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={doCreate}
                disabled={creating}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-lg transition"
              >
                {creating ? 'Creating…' : 'Create as PENDING STOCK'}
              </button>
              <button
                onClick={() => setShowStockModal(false)}
                className="flex-1 btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INDENT LIST ─────────────────────────────────────── */}
      {tab === 'list' && (
        <div className="space-y-2">
          {/* Summary bar */}
          {indents.length > 0 && (
            <div className="flex gap-3 text-xs text-gray-500 mb-3 flex-wrap">
              {['OPEN', 'PARTIAL', 'PENDING_STOCK', 'COMPLETE'].map((s) => {
                const count = indents.filter((i) => i.status === s).length
                if (!count) return null
                const cfg = STATUS_CONFIG[s]
                return (
                  <span key={s} className={`px-2 py-1 rounded-full font-semibold ${cfg.color}`}>
                    {count} {cfg.label}
                  </span>
                )
              })}
            </div>
          )}

          {loading && <div className="text-center text-gray-400 py-10">Loading indents…</div>}

          {!loading && indents.length === 0 && (
            <div className="text-center text-gray-400 py-10">
              No indents yet. Click <strong>New Indent</strong> to create one.
            </div>
          )}

          {indents.map((ind) => (
            <div
              key={ind.indentId}
              className={`card p-0 overflow-hidden border ${ind.status === 'PENDING_STOCK' ? 'border-red-200' : 'border-gray-200'}`}
            >
              <button
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition"
                onClick={() => setExpanded(expanded === ind.indentId ? null : ind.indentId)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {expanded === ind.indentId
                    ? <ChevronDown size={16} className="shrink-0 text-gray-400" />
                    : <ChevronRight size={16} className="shrink-0 text-gray-400" />
                  }
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {ind.indentId}
                      <span className="text-gray-400 font-normal ml-2">·</span>
                      <span className="ml-2">{ind.productName}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Batch: {Number(ind.batchSize)} {ind.batchUnit}
                      {ind.plant ? ` · ${ind.plant}` : ''}
                      {ind.diNo ? ` · Ref: ${ind.diNo}` : ''}
                      {' · '}
                      {new Date(ind.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <StatusBadge status={ind.status} />
              </button>

              {expanded === ind.indentId && (
                <div className="border-t">
                  {ind.status === 'PENDING_STOCK' && (
                    <div className="bg-red-50 px-4 py-2 border-b border-red-100 text-xs text-red-700 flex items-center gap-2">
                      <AlertTriangle size={13} />
                      <span>
                        Waiting for stock. This indent will auto-activate when missing materials are inwarded.
                      </span>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">RM Code</th>
                          <th className="px-4 py-2 text-left">RM Name</th>
                          <th className="px-4 py-2 text-right">Required</th>
                          <th className="px-4 py-2 text-right">Issued</th>
                          <th className="px-4 py-2 text-right">Balance</th>
                          <th className="px-4 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ind.details.map((d) => {
                          const balance = d.balanceQty ?? (Number(d.requiredQty) - Number(d.issuedQty))
                          return (
                            <tr key={d.rmCode} className="border-t hover:bg-gray-50">
                              <td className="px-4 py-1.5 text-gray-400">{d.rmCode}</td>
                              <td className="px-4 py-1.5 font-medium">{d.rmName}</td>
                              <td className="px-4 py-1.5 text-right">{Number(d.requiredQty).toFixed(2)}</td>
                              <td className="px-4 py-1.5 text-right text-blue-600">{Number(d.issuedQty).toFixed(2)}</td>
                              <td className={`px-4 py-1.5 text-right font-semibold ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                {Number(balance).toFixed(2)}
                              </td>
                              <td className="px-4 py-1.5 text-center">
                                {d.status === 'COMPLETE'
                                  ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">Done</span>
                                  : d.status === 'PARTIAL'
                                  ? <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs">Partial</span>
                                  : <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs">Pending</span>
                                }
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Progress bar */}
                  {ind.details.length > 0 && (() => {
                    const totalReq = ind.details.reduce((s, d) => s + Number(d.requiredQty), 0)
                    const totalIss = ind.details.reduce((s, d) => s + Number(d.issuedQty), 0)
                    const pct = totalReq > 0 ? Math.min(100, (totalIss / totalReq) * 100) : 0
                    return (
                      <div className="px-4 py-3 border-t bg-gray-50">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Issuance Progress</span>
                          <span>{pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
