import { useState, useEffect, useRef } from 'react'
import { recipeApi, rmApi, productApi, importApi } from '../api/client.js'

const CONFIDENCE_STYLES = {
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  green:   'bg-green-100 text-green-700 border-green-200',
  amber:   'bg-amber-100 text-amber-700 border-amber-200',
  red:     'bg-red-100 text-red-700 border-red-200',
}

const EMPTY_ROW = () => ({ id: null, rmCode: '', rmName: '', qtyPerUnit: '', uom: 'KG', _dirty: true })

export default function RecipeDB() {
  const [productList, setProductList] = useState([])
  const [rmList, setRmList] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [bomRows, setBomRows] = useState([])
  const [prodSearch, setProdSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [rmDropIdx, setRmDropIdx] = useState(null)
  const [rmSearch, setRmSearch] = useState({})

  // Excel import
  const [importModal, setImportModal] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileRef = useRef(null)

  // RM Reconciliation
  const [reconcileModal, setReconcileModal] = useState(false)
  const [reconcileLoading, setReconcileLoading] = useState(false)
  const [reconcileData, setReconcileData] = useState(null)   // { unmatched, matched, total }
  const [pendingMappings, setPendingMappings] = useState({}) // { fromCode: toCode }
  const [fixing, setFixing] = useState(false)
  const [fixResult, setFixResult] = useState(null)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [rmRes, prodRes] = await Promise.all([rmApi.list({}), productApi.list({})])
      setRmList(rmRes.data || [])
      setProductList(prodRes.data || [])
    } catch (e) { setMsg({ type: 'error', text: e.message }) }
    setLoading(false)
  }

  const selectProduct = async (prod) => {
    setSelectedProduct(prod)
    setProdSearch('')
    setRmSearch({})
    setMsg({ type: '', text: '' })
    try {
      const res = await recipeApi.list({ productCode: prod.productCode })
      const data = res.data || []
      setBomRows(data.length > 0
        ? data.map(r => ({ ...r, _dirty: false }))
        : [EMPTY_ROW()]
      )
    } catch (e) { setMsg({ type: 'error', text: e.message }) }
  }

  const updateRow = (idx, field, value) => {
    setBomRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value, _dirty: true } : r))
  }

  const selectRm = (idx, rm) => {
    setBomRows(prev => prev.map((r, i) =>
      i === idx ? { ...r, rmCode: rm.itemCode, rmName: rm.itemName, uom: rm.uom, _dirty: true } : r
    ))
    setRmSearch(s => ({ ...s, [idx]: rm.itemName }))
    setRmDropIdx(null)
  }

  const addRow = () => {
    setBomRows(prev => [...prev, EMPTY_ROW()])
    setRmSearch(s => ({ ...s, [bomRows.length]: '' }))
  }

  const removeRow = async (idx) => {
    const row = bomRows[idx]
    if (row.id && !confirm('Delete this RM from recipe?')) return
    if (row.id) {
      try { await recipeApi.deleteRow(row.id) }
      catch (e) { alert(e.message); return }
    }
    setBomRows(prev => {
      const updated = prev.filter((_, i) => i !== idx)
      return updated.length === 0 ? [EMPTY_ROW()] : updated
    })
  }

  const saveAll = async () => {
    if (!selectedProduct) { setMsg({ type: 'error', text: 'Select a product first' }); return }
    const toSave = bomRows.filter(r => r._dirty && r.rmCode && r.qtyPerUnit)
    if (toSave.length === 0) { setMsg({ type: 'error', text: 'No rows to save. Fill RM and Qty.' }); return }
    setSaving(true); setMsg({ type: '', text: '' })
    try {
      const payload = toSave.map(r => ({
        productCode: selectedProduct.productCode,
        productName: selectedProduct.productName,
        rmCode: r.rmCode, rmName: r.rmName,
        qtyPerUnit: r.qtyPerUnit, uom: r.uom
      }))
      const res = await recipeApi.bulkSave(payload)
      setMsg({ type: 'success', text: `✅ ${res.saved} rows saved` })
      await selectProduct(selectedProduct)
    } catch (e) { setMsg({ type: 'error', text: e.message }) }
    setSaving(false)
  }

  const filteredRm = (search) =>
    rmList.filter(r => !search ||
      r.itemName.toLowerCase().includes(search.toLowerCase()) ||
      r.itemCode.toLowerCase().includes(search.toLowerCase())
    )

  const filteredProducts = productList.filter(p =>
    !prodSearch ||
    p.productName.toLowerCase().includes(prodSearch.toLowerCase()) ||
    p.productCode.toLowerCase().includes(prodSearch.toLowerCase())
  )

  // ── RM RECONCILIATION ────────────────────────────────────────────────────
  const openReconcile = async () => {
    setReconcileModal(true)
    setReconcileLoading(true)
    setFixResult(null)
    try {
      const res = await recipeApi.checkRmMapping()
      setReconcileData(res.data)
      // Auto-pre-select the top suggestion for each unmatched RM if confidence ≥ 80%
      const auto = {}
      for (const u of res.data.unmatched || []) {
        if (u.autoSuggest) auto[u.recipeRmCode] = u.autoSuggest.itemCode
      }
      setPendingMappings(auto)
    } catch (e) { alert(e.message) }
    setReconcileLoading(false)
  }

  const applyFixes = async () => {
    const mappings = Object.entries(pendingMappings)
      .filter(([, toCode]) => toCode)
      .map(([fromCode, toCode]) => ({ fromCode, toCode }))
    if (!mappings.length) { alert('No mappings selected'); return }
    setFixing(true)
    try {
      const res = await recipeApi.fixRmMapping(mappings)
      setFixResult(res)
      await loadAll()
      if (selectedProduct) await selectProduct(selectedProduct)
    } catch (e) { alert(e.message) }
    setFixing(false)
  }

  // ── EXCEL IMPORT ─────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!importFile) return
    setImporting(true); setImportResult(null)
    try {
      const res = await importApi.execute(importFile)
      setImportResult(res)
      setMsg({ type: 'success', text: `✅ Import done — Recipe/BOM rows: ${res.data?.recipeBom || 0}, Products created: ${res.data?.productMaster || 0}` })
      await loadAll()
    } catch (e) { setImportResult({ error: e.message }) }
    setImporting(false)
  }

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 0px)' }}>

      {/* ── LEFT: Product List ──────────────────────────────────────────── */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Products</h2>
          <input
            value={prodSearch}
            onChange={e => setProdSearch(e.target.value)}
            placeholder="Search product..."
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-gray-400 px-4 py-3">Loading...</p>
          ) : filteredProducts.length === 0 ? (
            <p className="text-xs text-gray-400 px-4 py-3">No products. Add in Product Master.</p>
          ) : filteredProducts.map(p => (
            <button
              key={p.productCode}
              onClick={() => selectProduct(p)}
              className={`w-full text-left px-4 py-2.5 border-b border-gray-50 hover:bg-blue-50 transition ${selectedProduct?.productCode === p.productCode ? 'bg-blue-600 text-white hover:bg-blue-600' : ''}`}
            >
              <div className={`text-sm font-semibold truncate ${selectedProduct?.productCode === p.productCode ? 'text-white' : 'text-gray-800'}`}>{p.productName}</div>
              <div className={`text-xs font-mono ${selectedProduct?.productCode === p.productCode ? 'text-blue-200' : 'text-gray-400'}`}>{p.productCode}</div>
            </button>
          ))}
        </div>
        <div className="px-3 py-3 border-t border-gray-100 space-y-2">
          <button
            onClick={() => setImportModal(true)}
            className="w-full bg-indigo-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-indigo-700 font-medium"
          >
            📥 Import from Excel
          </button>
          <button
            onClick={openReconcile}
            className="w-full bg-amber-500 text-white text-sm px-3 py-2 rounded-lg hover:bg-amber-600 font-medium"
          >
            🔗 Fix RM Mapping
          </button>
          <p className="text-xs text-gray-400 text-center leading-tight">
            Reconcile recipe RMs that don't match RM Master
          </p>
        </div>
      </aside>

      {/* ── RIGHT: BOM Editor ───────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {!selectedProduct ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-lg font-medium">Select a product to view its BOM</p>
              <p className="text-sm mt-1">Use the left panel to choose a product</p>
              <button onClick={() => setImportModal(true)} className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium">
                📥 Import Recipe from Excel
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Product header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-gray-900">{selectedProduct.productName}</h1>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <p className="text-sm text-gray-500 font-mono">
                    Code: <span className="text-blue-700 font-semibold">{selectedProduct.productCode}</span>
                    {selectedProduct.plant && <span className="ml-3 text-gray-400">· {selectedProduct.plant}</span>}
                  </p>
                  <span className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    📐 Qty per 1 KG of product
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addRow} className="border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium">
                  + Add Item Row
                </button>
                <button onClick={saveAll} disabled={saving}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 font-semibold text-sm disabled:opacity-50">
                  {saving ? 'Saving...' : '💾 Save BOM'}
                </button>
              </div>
            </div>

            {msg.text && (
              <div className={`mx-4 mt-3 px-4 py-2.5 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                {msg.text}
              </div>
            )}

            {/* BOM Table */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="text-left px-3 py-3 font-semibold w-8">#</th>
                      <th className="text-left px-3 py-3 font-semibold">Item Name</th>
                      <th className="text-left px-3 py-3 font-semibold w-32">Item Code</th>
                      <th className="text-left px-3 py-3 font-semibold w-28">
                        Qty / 1 KG
                        <span className="ml-1 text-amber-300 text-xs font-normal">↗ per kg product</span>
                      </th>
                      <th className="text-left px-3 py-3 font-semibold w-20">UOM</th>
                      <th className="text-left px-3 py-3 font-semibold w-14">Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bomRows.map((row, idx) => (
                      <tr key={idx} className={`border-b border-gray-100 ${row._dirty ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                        <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>

                        {/* Item Name with dropdown */}
                        <td className="px-2 py-1 relative">
                          <input
                            value={rmSearch[idx] !== undefined ? rmSearch[idx] : row.rmName}
                            onChange={e => {
                              setRmSearch(s => ({ ...s, [idx]: e.target.value }))
                              setRmDropIdx(idx)
                              updateRow(idx, 'rmName', e.target.value)
                            }}
                            onFocus={() => setRmDropIdx(idx)}
                            onBlur={() => setTimeout(() => setRmDropIdx(null), 150)}
                            placeholder="Type to search item..."
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-400"
                          />
                          {rmDropIdx === idx && filteredRm(rmSearch[idx]).length > 0 && (
                            <div className="absolute z-30 left-2 right-2 bg-white border border-gray-200 rounded-lg shadow-xl mt-0.5 max-h-44 overflow-y-auto">
                              {filteredRm(rmSearch[idx]).map(rm => (
                                <button key={rm.itemCode} type="button"
                                  onMouseDown={() => selectRm(idx, rm)}
                                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0">
                                  <span className="font-medium">{rm.itemName}</span>
                                  <span className="text-gray-400 text-xs ml-2">{rm.itemCode}</span>
                                  <span className="text-gray-300 text-xs ml-1">· {rm.uom}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* RM Code (auto-filled, read-only) */}
                        <td className="px-2 py-1">
                          <input value={row.rmCode} readOnly
                            className="w-full border border-gray-100 rounded px-2 py-1.5 text-xs bg-gray-50 font-mono text-blue-700" />
                        </td>

                        {/* Qty per unit */}
                        <td className="px-2 py-1">
                          <input type="number" step="0.001" min="0" value={row.qtyPerUnit}
                            onChange={e => updateRow(idx, 'qtyPerUnit', e.target.value)}
                            placeholder="0.000"
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-400 text-right" />
                        </td>

                        {/* UOM */}
                        <td className="px-2 py-1">
                          <input value={row.uom} onChange={e => updateRow(idx, 'uom', e.target.value)}
                            placeholder="KG"
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-400" />
                        </td>

                        <td className="px-2 py-1 text-center">
                          <button onClick={() => removeRow(idx)} className="text-red-400 hover:text-red-600 text-xl font-bold leading-none">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {bomRows.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">No BOM rows yet. Click "+ Add Item Row".</div>
                )}

                {/* Total row */}
                {bomRows.filter(r => r.rmCode && r.qtyPerUnit).length > 0 && (() => {
                  const totals = {}
                  bomRows.filter(r => r.rmCode && r.qtyPerUnit).forEach(r => {
                    totals[r.uom] = (totals[r.uom] || 0) + parseFloat(r.qtyPerUnit || 0)
                  })
                  return (
                    <tfoot>
                      <tr className="bg-amber-50 border-t-2 border-amber-200">
                        <td colSpan={3} className="px-3 py-2 text-xs font-bold text-amber-800 uppercase tracking-wide">
                          Total per 1 KG product
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-amber-900 text-sm">
                          {Object.entries(totals).map(([uom, qty]) => (
                            <div key={uom}>{qty.toFixed(4)} <span className="text-xs text-amber-700">{uom}</span></div>
                          ))}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )
                })()}

                <div className="px-4 py-3 bg-gray-50 border-t flex justify-between items-center">
                  <span className="text-xs text-gray-400">{bomRows.filter(r => r.rmCode).length} items configured · All quantities per 1 KG finished product</span>
                  <button onClick={saveAll} disabled={saving}
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 font-semibold text-sm disabled:opacity-50">
                    {saving ? 'Saving...' : '💾 Save BOM'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── IMPORT FROM EXCEL MODAL ──────────────────────────────────────── */}
      {importModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">📥 Import Recipe from Excel</h2>
              <button onClick={() => { setImportModal(false); setImportFile(null); setImportResult(null) }}
                className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">Expected Excel format:</p>
              <p>Sheet name must contain: <strong>recipe</strong>, <strong>bom</strong>, or <strong>formula</strong></p>
              <p className="mt-1">Required columns:</p>
              <ul className="list-disc ml-4 mt-0.5 text-xs space-y-0.5">
                <li><strong>Product Name</strong> — finished product (code auto-generated)</li>
                <li><strong>Raw Material</strong> — RM name (code auto-generated if new)</li>
                <li><strong>Qty Per Unit</strong> — qty of RM per unit of product</li>
                <li><strong>UOM</strong> — unit of measure (KG, L, etc.)</li>
              </ul>
            </div>

            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
              onClick={() => fileRef.current?.click()}
            >
              {importFile ? (
                <div>
                  <div className="text-green-600 text-2xl mb-1">✅</div>
                  <p className="font-medium text-gray-700">{importFile.name}</p>
                  <p className="text-xs text-gray-400">{(importFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <div className="text-3xl mb-2">📊</div>
                  <p className="text-sm text-gray-600">Click to select Excel file (.xlsx)</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => { setImportFile(e.target.files[0]); setImportResult(null) }} />
            </div>

            {importResult && (
              <div className={`mt-3 p-3 rounded-lg text-sm ${importResult.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
                {importResult.error ? (
                  <p>❌ {importResult.error}</p>
                ) : (
                  <div className="space-y-0.5">
                    <p className="font-semibold">Import Complete</p>
                    <p>Recipe rows: <strong>{importResult.data?.recipeBom || 0}</strong></p>
                    <p>Products created: <strong>{importResult.data?.productMaster || 0}</strong></p>
                    <p>RMs created: <strong>{importResult.data?.rmMaster || 0}</strong></p>
                    {importResult.data?.fuzzyMatches > 0 && (
                      <p className="text-amber-700 font-medium">
                        🔗 {importResult.data.fuzzyMatches} RM name(s) fuzzy-matched to existing RMs
                      </p>
                    )}
                    {importResult.data?.fuzzyLog?.length > 0 && (
                      <div className="mt-1 bg-amber-50 border border-amber-100 rounded p-2 text-xs text-amber-800 space-y-0.5">
                        {importResult.data.fuzzyLog.map((l, i) => <p key={i}>• {l}</p>)}
                      </div>
                    )}
                    {importResult.data?.errors?.length > 0 && (
                      <p className="text-orange-700 mt-1">{importResult.data.errors.length} row error(s)</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleImport}
                disabled={!importFile || importing}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
              >
                {importing ? 'Importing...' : '📥 Import Now'}
              </button>
              <button onClick={() => { setImportModal(false); setImportFile(null); setImportResult(null) }}
                className="flex-1 border border-gray-300 py-2.5 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── RM RECONCILIATION MODAL ─────────────────────────────────────── */}
      {reconcileModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">🔗 Fix RM Mapping</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Recipe rows with RMs not matching RM Master — confirm or select the correct mapping
                </p>
              </div>
              <button onClick={() => { setReconcileModal(false); setFixResult(null) }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {reconcileLoading ? (
                <div className="text-center py-10 text-gray-400">Scanning recipe vs RM Master…</div>
              ) : !reconcileData ? null : (
                <>
                  {/* Summary bar */}
                  <div className="flex gap-4 mb-4 text-sm">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 flex-1 text-center">
                      <p className="text-xl font-bold text-emerald-700">{reconcileData.matched}</p>
                      <p className="text-xs text-emerald-600">Correctly Matched</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex-1 text-center">
                      <p className="text-xl font-bold text-red-600">{reconcileData.unmatched?.length || 0}</p>
                      <p className="text-xs text-red-500">Unmatched / Broken</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 flex-1 text-center">
                      <p className="text-xl font-bold text-gray-700">{reconcileData.total}</p>
                      <p className="text-xs text-gray-500">Total RM Lines</p>
                    </div>
                  </div>

                  {reconcileData.unmatched?.length === 0 ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center text-emerald-700">
                      <p className="text-3xl mb-2">✅</p>
                      <p className="font-semibold">All RM codes in Recipe DB are correctly matched!</p>
                      <p className="text-sm mt-1 text-emerald-600">No reconciliation needed.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                        For each unmatched RM below — confirm or change the suggested mapping:
                      </p>

                      {reconcileData.unmatched.map(u => (
                        <div key={u.recipeRmCode} className="border border-amber-200 bg-amber-50 rounded-xl overflow-hidden">
                          {/* Problem row */}
                          <div className="px-4 py-3 bg-amber-100 border-b border-amber-200 flex items-center gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-red-700">{u.recipeRmName}</span>
                                <span className="font-mono text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">{u.recipeRmCode}</span>
                                <span className="text-xs text-gray-500">· {u.affectedRows} recipe row{u.affectedRows !== 1 ? 's' : ''}</span>
                              </div>
                              <p className="text-xs text-red-600 mt-0.5">⚠ This RM code does not exist in RM Master — stock checks will fail</p>
                            </div>
                          </div>

                          {/* Suggestions */}
                          <div className="px-4 py-3">
                            <p className="text-xs font-semibold text-gray-600 mb-2">Map to:</p>
                            <div className="space-y-2">
                              {u.suggestions.map(s => (
                                <label key={s.itemCode} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition
                                  ${pendingMappings[u.recipeRmCode] === s.itemCode
                                    ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200'
                                    : 'bg-white border-gray-200 hover:border-indigo-300'}`}>
                                  <input
                                    type="radio"
                                    name={`map_${u.recipeRmCode}`}
                                    value={s.itemCode}
                                    checked={pendingMappings[u.recipeRmCode] === s.itemCode}
                                    onChange={() => setPendingMappings(m => ({ ...m, [u.recipeRmCode]: s.itemCode }))}
                                    className="accent-indigo-600"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className="font-semibold text-sm text-gray-900">{s.itemName}</span>
                                    <span className="font-mono text-xs text-indigo-600 ml-2">{s.itemCode}</span>
                                  </div>
                                  <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${CONFIDENCE_STYLES[s.color]}`}>
                                    {s.confidence} {s.pct}%
                                  </span>
                                </label>
                              ))}
                              {/* Skip / ignore option */}
                              <label className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition
                                ${!pendingMappings[u.recipeRmCode]
                                  ? 'bg-gray-50 border-gray-400 ring-2 ring-gray-200'
                                  : 'bg-white border-gray-200 hover:border-gray-400'}`}>
                                <input
                                  type="radio"
                                  name={`map_${u.recipeRmCode}`}
                                  value=""
                                  checked={!pendingMappings[u.recipeRmCode]}
                                  onChange={() => setPendingMappings(m => { const n = {...m}; delete n[u.recipeRmCode]; return n })}
                                  className="accent-gray-500"
                                />
                                <span className="text-sm text-gray-500 italic">Skip — don't remap this one</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fix result */}
                  {fixResult && (
                    <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
                      <p className="font-semibold">✅ {fixResult.totalFixed} recipe row(s) updated successfully</p>
                      {fixResult.log?.filter(l => l.error).map((l, i) => (
                        <p key={i} className="text-red-600 text-xs mt-1">Error: {l.error}</p>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer buttons */}
            {reconcileData?.unmatched?.length > 0 && !fixResult && (
              <div className="px-6 pb-5 pt-3 border-t flex gap-3 flex-shrink-0">
                <button onClick={applyFixes} disabled={fixing || Object.keys(pendingMappings).length === 0}
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition">
                  {fixing ? 'Applying…' : `🔗 Apply ${Object.keys(pendingMappings).length} Mapping(s)`}
                </button>
                <button onClick={() => { setReconcileModal(false); setFixResult(null) }}
                  className="border border-gray-300 px-5 py-2.5 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              </div>
            )}
            {(fixResult || reconcileData?.unmatched?.length === 0) && (
              <div className="px-6 pb-5 pt-3 border-t flex-shrink-0">
                <button onClick={() => { setReconcileModal(false); setFixResult(null) }}
                  className="w-full bg-slate-800 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-slate-900">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
