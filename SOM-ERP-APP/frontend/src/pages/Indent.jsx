import { useState, useEffect, useRef } from 'react'
import { indentApi, productApi, equipmentApi } from '../api/client.js'

const STATUS_BADGE = {
  OPEN:          'bg-blue-100 text-blue-800',
  PARTIAL:       'bg-orange-100 text-orange-800',
  COMPLETE:      'bg-green-100 text-green-800',
  CLOSED:        'bg-gray-100 text-gray-600',
  PENDING_STOCK: 'bg-red-100 text-red-700',
}

const TABS = ['Production Indent', 'Purchase Indent', 'Pending Indents']

export default function Indent() {
  const [tab, setTab] = useState(0)
  const [indents, setIndents] = useState([])
  const [productList, setProductList] = useState([])
  const [equipmentList, setEquipmentList] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const LIMIT = 20

  // Purchase summary
  const [purchaseSummary, setPurchaseSummary] = useState([])
  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [orderQtys, setOrderQtys] = useState({})
  const [showPO, setShowPO] = useState(false)
  const [emailTo, setEmailTo] = useState(() => localStorage.getItem('po_email_to') || '')
  const [emailCc, setEmailCc] = useState(() => localStorage.getItem('po_email_cc') || '')
  const [emailSaved, setEmailSaved] = useState(false)

  // Form state
  const [form, setForm] = useState({
    productCode: '', productName: '', batchSize: '',
    batchNo: '', diNo: '', plant: '', equipment: '',
    cycleBatchSize: '',
  })
  const [prodSearch, setProdSearch] = useState('')
  const [showProdDrop, setShowProdDrop] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [batchNoAuto, setBatchNoAuto] = useState('')
  const [loadingBatchNo, setLoadingBatchNo] = useState(false)
  const [sfgInfo, setSfgInfo] = useState(null)
  const [stockCheck, setStockCheck] = useState(null)
  const [checkingStock, setCheckingStock] = useState(false)
  const [recipePreview, setRecipePreview] = useState([])
  const [showStockModal, setShowStockModal] = useState(false)
  const stockTimer = useRef(null)

  const [showSentPOs, setShowSentPOs] = useState(false)

  useEffect(() => { loadAll() }, [page])
  useEffect(() => { if (tab === 1) loadPurchaseSummary() }, [tab, showSentPOs])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [indentRes, prodRes, equipRes] = await Promise.all([
        indentApi.list({ page, limit: LIMIT }),
        productApi.list({}),
        equipmentApi.list(),
      ])
      setIndents(indentRes.data || [])
      setTotal(indentRes.total || 0)
      setProductList(prodRes.data || [])
      setEquipmentList(equipRes.data || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const loadPurchaseSummary = async () => {
    setPurchaseLoading(true)
    try {
      const res = await indentApi.purchaseSummary({ showSent: showSentPOs ? 'true' : 'false' })
      const data = res.data || []
      setPurchaseSummary(data)
      const qts = {}
      data.forEach(r => { qts[r.rmCode] = r.suggestedOrderQty })
      setOrderQtys(qts)
    } catch (e) { console.error(e) }
    setPurchaseLoading(false)
  }

  const filteredProducts = productList.filter(p =>
    !prodSearch ||
    p.productName.toLowerCase().includes(prodSearch.toLowerCase()) ||
    p.productCode.toLowerCase().includes(prodSearch.toLowerCase())
  )

  const selectProduct = async (prod) => {
    setProdSearch(prod.productName)
    setShowProdDrop(false)
    setStockCheck(null); setSfgInfo(null); setRecipePreview([])
    setForm(f => ({ ...f, productCode: prod.productCode, productName: prod.productName, plant: prod.plant || f.plant }))

    setLoadingBatchNo(true)
    const [batchRes, sfgRes] = await Promise.allSettled([
      indentApi.nextBatchNo(prod.productCode),
      indentApi.sfgAvailable(prod.productCode),
    ])
    setLoadingBatchNo(false)
    if (batchRes.status === 'fulfilled') {
      const bn = batchRes.value?.data?.batchNo || ''
      setBatchNoAuto(bn); setForm(f => ({ ...f, batchNo: bn }))
    }
    if (sfgRes.status === 'fulfilled') {
      const d = sfgRes.value?.data
      if (d && d.totalSfg > 0) setSfgInfo(d)
    }
  }

  const handleBatchSizeChange = (val) => {
    setForm(f => ({ ...f, batchSize: val }))
    setStockCheck(null); setRecipePreview([])
    if (stockTimer.current) clearTimeout(stockTimer.current)
    if (val && form.productCode) {
      stockTimer.current = setTimeout(() => runStockCheck(form.productCode, val), 700)
    }
  }

  const runStockCheck = async (productCode, batchSize) => {
    if (!productCode || !batchSize) return
    setCheckingStock(true)
    try {
      const res = await indentApi.stockCheck(productCode, batchSize)
      const d = res?.data || res
      setStockCheck(d); setRecipePreview(d.checks || [])
    } catch (e) { console.error(e) }
    setCheckingStock(false)
  }

  const handleSubmit = async () => {
    if (!form.productCode) { setError('Select a product'); return }
    if (!form.batchSize) { setError('Batch size is required'); return }
    if (!form.batchNo.trim()) { setError('Batch No is required'); return }
    if (!form.diNo.trim()) { setError('DI No is required'); return }
    if (!stockCheck && form.productCode && form.batchSize) await runStockCheck(form.productCode, form.batchSize)
    if (stockCheck && !stockCheck.allOk) { setShowStockModal(true); return }
    doCreate()
  }

  const doCreate = async () => {
    setShowStockModal(false); setCreating(true); setError('')
    try {
      await indentApi.create(form)
      closeForm(); loadAll()
    } catch (e) { setError(e.message); setCreating(false) }
  }

  const closeForm = () => {
    setShowForm(false)
    setForm({ productCode: '', productName: '', batchSize: '', batchNo: '', diNo: '', plant: '', equipment: '', cycleBatchSize: '' })
    setProdSearch(''); setStockCheck(null); setRecipePreview([]); setSfgInfo(null)
    setBatchNoAuto(''); setError(''); setCreating(false)
  }

  const shortfallItems = stockCheck?.checks?.filter(c => !c.ok) || []

  // Filter indents by tab
  const visibleIndents = tab === 2
    ? indents.filter(i => i.status === 'PENDING_STOCK')
    : indents.filter(i => i.status !== 'PENDING_STOCK')

  const totalPages = Math.ceil(total / LIMIT)

  // Generate PO text
  const generatePO = () => {
    const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    const uniqueIndents = [...new Set(purchaseSummary.flatMap(r => r.indents?.map(x => x.indentId) || []))]
    const lines = [
      'PURCHASE REQUISITION',
      `SOM Phytopharma (India) Ltd`,
      `Plot No 154/A5-1, SVCIE, IDA Bollaram, Sangareddy, Hyderabad - 502325`,
      '',
      `Date: ${date}`,
      `Covering ${uniqueIndents.length} pending production indent(s)`,
      '',
      'Items Required:',
      '─'.repeat(60),
    ]
    purchaseSummary.forEach((rm, i) => {
      const qty = orderQtys[rm.rmCode] || rm.suggestedOrderQty
      lines.push(`${i + 1}. ${rm.rmName}  [${rm.rmCode}]`)
      lines.push(`   Required : ${Number(rm.totalRequired).toFixed(3)}  |  Available: ${Number(rm.availableQty).toFixed(3)}  |  Shortfall: ${Number(rm.shortfall).toFixed(3)}`)
      lines.push(`   ORDER QTY: ${Number(qty).toFixed(3)}`)
      if (rm.indents?.length) {
        lines.push(`   For indents: ${rm.indents.map(x => x.productName).join(', ')}`)
      }
      lines.push('')
    })
    lines.push('─'.repeat(60))
    lines.push('Please arrange procurement at the earliest.')
    lines.push('')
    lines.push('Regards,')
    lines.push('Stores Department — SOM Phytopharma (India) Ltd')
    return lines.join('\n')
  }

  const saveEmailDefaults = () => {
    localStorage.setItem('po_email_to', emailTo)
    localStorage.setItem('po_email_cc', emailCc)
    setEmailSaved(true)
    setTimeout(() => setEmailSaved(false), 2000)
  }

  const sendEmail = async () => {
    const subject = encodeURIComponent(`Purchase Requisition — ${new Date().toLocaleDateString('en-IN')}`)
    const body = encodeURIComponent(generatePO())
    const cc = emailCc ? `&cc=${encodeURIComponent(emailCc)}` : ''
    const to = encodeURIComponent(emailTo)
    // Mark all indents in this PO as sent
    const indentIds = [...new Set(purchaseSummary.flatMap(r => r.indents?.map(i => i.indentId) || []))]
    if (indentIds.length) {
      try { await indentApi.markPoSent(indentIds) } catch { /* non-blocking */ }
      loadPurchaseSummary()
    }
    window.location.href = `mailto:${to}?subject=${subject}${cc}&body=${body}`
  }

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Indent Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Production work orders — Item requirements auto-calculated from Recipe DB</p>
        </div>
        {tab === 0 && (
          <button onClick={() => { setShowForm(true); setError('') }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
            + New Production Indent
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-5 border-b border-gray-200">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${tab === i ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
            {i === 2 && indents.filter(x => x.status === 'PENDING_STOCK').length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {indents.filter(x => x.status === 'PENDING_STOCK').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 0: PRODUCTION INDENT ──────────────────────────────────── */}
      {tab === 0 && (
        <>
          {productList.length === 0 && (
            <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg mb-4 text-sm">
              ⚠️ No products found. Add products in <strong>Product Master</strong> and recipes in <strong>Recipe DB</strong> first.
            </div>
          )}
          {loading ? <p className="text-gray-400">Loading...</p> : (
            <>
              <div className="space-y-3">
                {visibleIndents.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
                    No production indents yet. Create one to start production.
                  </div>
                ) : visibleIndents.map(indent => (
                  <IndentCard key={indent.indentId} indent={indent}
                    selected={selected} setSelected={setSelected} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                  <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Next →</button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── TAB 1: PURCHASE INDENT ───────────────────────────────────── */}
      {tab === 1 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Purchase Indent</h2>
              <p className="text-sm text-gray-500">RM shortfall summary from all pending stock indents</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                <input type="checkbox" checked={showSentPOs} onChange={e => setShowSentPOs(e.target.checked)} className="rounded" />
                Show already sent
              </label>
              <button onClick={loadPurchaseSummary}
                className="border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">↻ Refresh</button>
              {purchaseSummary.length > 0 && (
                <button onClick={() => setShowPO(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                  📄 Generate PO
                </button>
              )}
            </div>
          </div>

          {purchaseLoading ? <p className="text-gray-400">Loading...</p>
            : purchaseSummary.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
                <p className="text-lg">✅ No purchase requirements</p>
                <p className="text-sm mt-1">All pending indents have sufficient stock</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="text-left px-4 py-3">#</th>
                      <th className="text-left px-4 py-3">Item</th>
                      <th className="text-left px-4 py-3">Code</th>
                      <th className="text-right px-4 py-3">Total Required</th>
                      <th className="text-right px-4 py-3">Available</th>
                      <th className="text-right px-4 py-3">Shortfall</th>
                      <th className="text-right px-4 py-3">Order Qty</th>
                      <th className="text-center px-4 py-3">PO Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseSummary.map((rm, i) => (
                      <tr key={rm.rmCode} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{rm.rmName}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            Used in: {rm.indents.map(x => x.productName).join(', ')}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-blue-700">{rm.rmCode}</td>
                        <td className="px-4 py-3 text-right">{rm.totalRequired.toFixed(3)}</td>
                        <td className="px-4 py-3 text-right text-green-700">{rm.availableQty.toFixed(3)}</td>
                        <td className="px-4 py-3 text-right text-red-600 font-bold">{rm.shortfall.toFixed(3)}</td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number" step="0.001" min="0"
                            value={orderQtys[rm.rmCode] || ''}
                            onChange={e => setOrderQtys(q => ({ ...q, [rm.rmCode]: e.target.value }))}
                            className="w-28 border border-gray-300 rounded px-2 py-1 text-sm text-right outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {rm.indents?.some(x => x.poSentAt) ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">
                              ✓ Sent {new Date(rm.indents.find(x=>x.poSentAt)?.poSentAt).toLocaleDateString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-500">
                  Covering {purchaseSummary.flatMap(r => r.indents).filter((v, i, a) => a.findIndex(x => x.indentId === v.indentId) === i).length} pending indent(s) · Store person: adjust order qty as needed then generate PO
                </div>
              </div>
            )
          }
        </div>
      )}

      {/* ── TAB 2: PENDING INDENTS ───────────────────────────────────── */}
      {tab === 2 && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Pending Indents</h2>
            <p className="text-sm text-gray-500">Indents waiting for stock. Auto-activate when missing RMs are inwarded.</p>
          </div>
          {loading ? <p className="text-gray-400">Loading...</p>
            : visibleIndents.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
                ✅ No pending indents. All indents have sufficient stock.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleIndents.map(indent => (
                  <IndentCard key={indent.indentId} indent={indent}
                    selected={selected} setSelected={setSelected} />
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* ── PO MODAL ─────────────────────────────────────────────────── */}
      {showPO && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold">📄 Purchase Requisition</h2>
              <button onClick={() => setShowPO(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* PO Text */}
              <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed">
                {generatePO()}
              </pre>

              {/* Email section */}
              <div className="border border-indigo-200 rounded-xl overflow-hidden">
                <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-200">
                  <p className="text-sm font-semibold text-indigo-800">✉️ Send via Email</p>
                  <p className="text-xs text-indigo-500 mt-0.5">Addresses saved as default — only update when needed</p>
                </div>
                <div className="px-4 py-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">To *</label>
                      <input
                        type="email"
                        placeholder="purchase@company.com"
                        value={emailTo}
                        onChange={e => setEmailTo(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">CC</label>
                      <input
                        type="email"
                        placeholder="manager@company.com"
                        value={emailCc}
                        onChange={e => setEmailCc(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={saveEmailDefaults}
                      className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50 transition"
                    >
                      {emailSaved ? '✓ Saved!' : '💾 Save as Default'}
                    </button>
                    <p className="text-xs text-gray-400">Clicking "Send Email" opens your mail app with this PO pre-filled</p>
                  </div>
                  <button
                    onClick={sendEmail}
                    disabled={!emailTo.trim()}
                    className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-semibold text-sm disabled:opacity-40 transition"
                  >
                    ✉️ Open in Email App & Send
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => navigator.clipboard?.writeText(generatePO())}
                className="flex-1 bg-slate-700 text-white py-2.5 rounded-lg hover:bg-slate-800 font-semibold text-sm">
                📋 Copy to Clipboard
              </button>
              <button onClick={() => window.print()}
                className="flex-1 border border-gray-300 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium">
                🖨️ Print
              </button>
              <button onClick={() => setShowPO(false)}
                className="border border-gray-300 px-4 py-2.5 rounded-lg hover:bg-gray-50 text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STOCK SHORTFALL MODAL ─────────────────────────────────────── */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 text-red-600 rounded-full p-2">⚠️</div>
              <h2 className="text-lg font-bold text-red-700">Insufficient Stock Warning</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              The following RMs do not have sufficient stock. The indent will be created as{' '}
              <strong className="text-red-600">PENDING STOCK</strong> and auto-activates when the missing materials are inwarded.
            </p>
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4 space-y-2">
              {shortfallItems.map(c => (
                <div key={c.rmCode} className="text-sm">
                  <div className="font-semibold text-red-700">{c.rmName} <span className="font-mono text-xs text-red-400">[{c.rmCode}]</span></div>
                  <div className="text-xs text-red-600 flex gap-4 mt-0.5">
                    <span>Required: <strong>{Number(c.required || c.requiredQty).toFixed(3)}</strong></span>
                    <span>Available: <strong>{Number(c.available || c.availableQty).toFixed(3)}</strong></span>
                    <span className="font-bold">Short: {Number(c.shortfall).toFixed(3)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={doCreate} disabled={creating}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50">
                {creating ? 'Creating...' : 'Create as PENDING STOCK'}
              </button>
              <button onClick={() => setShowStockModal(false)}
                className="flex-1 border border-gray-300 py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE INDENT MODAL ───────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-40 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mt-8 mb-8">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Create Production Indent</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">❌ {error}</div>}

              {/* Product Search */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input value={prodSearch}
                  onChange={e => { setProdSearch(e.target.value); setShowProdDrop(true); setForm(f => ({ ...f, productCode: '', productName: '' })); setStockCheck(null); setBatchNoAuto(''); setSfgInfo(null) }}
                  onFocus={() => setShowProdDrop(true)}
                  onBlur={() => setTimeout(() => setShowProdDrop(false), 200)}
                  placeholder="Type to search product..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
                {showProdDrop && filteredProducts.length > 0 && (
                  <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {filteredProducts.map(p => (
                      <button key={p.productCode} type="button" onMouseDown={() => selectProduct(p)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm">
                        <span className="font-medium">{p.productName}</span>
                        <span className="text-gray-400 ml-2 text-xs">{p.productCode}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {form.productCode && (
                <div className="bg-blue-50 border border-blue-100 px-3 py-2 rounded-lg text-sm text-blue-800 flex items-center gap-2">
                  ✅ <strong>{form.productName}</strong>
                  <span className="text-blue-400 font-mono text-xs">[{form.productCode}]</span>
                </div>
              )}

              {sfgInfo && sfgInfo.totalSfg > 0 && (
                <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-lg text-sm text-amber-800">
                  ℹ️ Available SFG: <strong>{Number(sfgInfo.totalSfg).toFixed(2)}</strong> units from previous batches.
                </div>
              )}

              {/* Batch Size + Batch No */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Size *</label>
                  <input type="number" step="0.01" value={form.batchSize}
                    onChange={e => handleBatchSizeChange(e.target.value)} placeholder="e.g. 1000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch No * {loadingBatchNo && <span className="text-xs text-blue-400">fetching...</span>}
                    {batchNoAuto && !loadingBatchNo && <span className="text-xs text-green-600 ml-1">(auto)</span>}
                  </label>
                  <input value={form.batchNo} onChange={e => setForm(f => ({ ...f, batchNo: e.target.value }))}
                    placeholder="Auto-generated"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* BOM Preview */}
              {recipePreview.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase">BOM Preview — {recipePreview.length} Items</span>
                    {checkingStock && <span className="text-xs text-blue-500 animate-pulse">Checking stock…</span>}
                    {stockCheck && !checkingStock && (
                      <span className={`text-xs font-semibold ${stockCheck.allOk ? 'text-green-600' : 'text-red-600'}`}>
                        {stockCheck.allOk ? '✅ All available' : `⚠ ${shortfallItems.length} short`}
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto max-h-44">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-500">Item Name</th>
                          <th className="px-3 py-2 text-right text-gray-500">Required</th>
                          <th className="px-3 py-2 text-right text-gray-500">Available</th>
                          <th className="px-3 py-2 text-center text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recipePreview.map(r => (
                          <tr key={r.rmCode} className={`border-t ${r.ok ? '' : 'bg-red-50'}`}>
                            <td className="px-3 py-1.5 font-medium">{r.rmName}</td>
                            <td className="px-3 py-1.5 text-right">{Number(r.required || r.requiredQty).toFixed(3)}</td>
                            <td className={`px-3 py-1.5 text-right font-semibold ${r.ok ? 'text-green-700' : 'text-red-600'}`}>
                              {Number(r.available || r.availableQty).toFixed(3)}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              {r.ok ? <span className="text-green-600 font-bold">✓</span>
                                : <span className="text-red-600 text-xs font-bold">−{Number(r.shortfall).toFixed(3)}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* DI No */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DI No *</label>
                <input value={form.diNo} onChange={e => setForm(f => ({ ...f, diNo: e.target.value }))}
                  placeholder="e.g. DI-2026-042"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Plant + Equipment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plant</label>
                  <input value={form.plant} onChange={e => setForm(f => ({ ...f, plant: e.target.value }))}
                    placeholder="Plant A"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Equipment</label>
                  <select value={form.equipment} onChange={e => setForm(f => ({ ...f, equipment: e.target.value, cycleBatchSize: '' }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select (optional) —</option>
                    {equipmentList.map(eq => (
                      <option key={eq.equipId} value={eq.equipName}>{eq.equipName}{eq.plant ? ` (${eq.plant})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cycle Batch Size — shows only when equipment is selected */}
              {form.equipment && (
                <div className="border border-indigo-200 bg-indigo-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-indigo-700 font-semibold text-sm">⚙️ Multi-Cycle Production</span>
                    <span className="text-xs text-indigo-500">Equipment selected: {form.equipment}</span>
                  </div>
                  <p className="text-xs text-indigo-600 mb-3">
                    If your blender/equipment can't process the full batch at once, set the cycle size.
                    Each cycle = one blender run. System creates one indent per cycle automatically.
                  </p>
                  <div className="grid grid-cols-3 gap-3 items-end">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-indigo-700 mb-1">
                        Cycle Batch Size (per run) — leave blank for single indent
                      </label>
                      <input
                        type="number" step="0.01" min="1"
                        value={form.cycleBatchSize}
                        onChange={e => setForm(f => ({ ...f, cycleBatchSize: e.target.value }))}
                        placeholder={`e.g. ${form.batchSize ? Math.round(parseFloat(form.batchSize) / 5) || 1000 : 1000} (1 MT blender)`}
                        className="w-full border border-indigo-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                      />
                    </div>
                    <div className="text-center">
                      {form.cycleBatchSize && form.batchSize && parseFloat(form.cycleBatchSize) > 0 ? (() => {
                        const cycles = Math.round(parseFloat(form.batchSize) / parseFloat(form.cycleBatchSize))
                        return (
                          <div className="bg-indigo-600 text-white rounded-lg px-3 py-2">
                            <div className="text-2xl font-bold">{cycles}</div>
                            <div className="text-xs">cycle{cycles !== 1 ? 's' : ''}</div>
                          </div>
                        )
                      })() : (
                        <div className="bg-gray-100 text-gray-400 rounded-lg px-3 py-2 text-xs">
                          Enter cycle size
                        </div>
                      )}
                    </div>
                  </div>
                  {form.cycleBatchSize && form.batchSize && parseFloat(form.cycleBatchSize) > 0 && (() => {
                    const cycles = Math.round(parseFloat(form.batchSize) / parseFloat(form.cycleBatchSize))
                    return (
                      <div className="mt-2 bg-white border border-indigo-200 rounded-lg px-3 py-2 text-xs text-indigo-800">
                        Will create <strong>{cycles} indents</strong> of <strong>{parseFloat(form.cycleBatchSize).toFixed(2)} KG</strong> each
                        (batch nos: {form.batchNo || 'BN'}-C1 to {form.batchNo || 'BN'}-C{cycles})
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex gap-3">
              <button onClick={handleSubmit} disabled={creating}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50">
                {creating ? 'Creating...' : checkingStock ? 'Checking Stock...' : (() => {
                  if (form.cycleBatchSize && form.batchSize && parseFloat(form.cycleBatchSize) > 0) {
                    const n = Math.round(parseFloat(form.batchSize) / parseFloat(form.cycleBatchSize))
                    return `Create ${n} Cycle Indent${n !== 1 ? 's' : ''}`
                  }
                  return 'Create Indent'
                })()}
              </button>
              <button onClick={closeForm}
                className="flex-1 border border-gray-300 py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function IndentCard({ indent, selected, setSelected }) {
  const isSelected = selected?.indentId === indent.indentId

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${indent.status === 'PENDING_STOCK' ? 'border-red-300' : 'border-gray-200'}`}>
      <div
        className="flex items-start justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition"
        onClick={() => setSelected(isSelected ? null : indent)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-gray-900">{indent.indentId}</span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_BADGE[indent.status] || 'bg-gray-100 text-gray-600'}`}>
              {indent.status}
            </span>
          </div>
          <div className="text-sm text-gray-700 mt-1 font-medium">{indent.productName}</div>
          <div className="flex gap-4 mt-1.5 text-xs text-gray-400 flex-wrap">
            <span>Batch: <strong className="text-gray-600">{indent.batchNo}</strong></span>
            <span>Size: <strong className="text-gray-600">{indent.batchSize}</strong></span>
            {indent.diNo && <span>DI: <strong className="text-gray-600">{indent.diNo}</strong></span>}
            {indent.plant && <span>Plant: <strong className="text-gray-600">{indent.plant}</strong></span>}
            {indent.equipment && <span>Equip: <strong className="text-gray-600">{indent.equipment}</strong></span>}
          </div>
        </div>
        <div className="text-xs text-gray-400 ml-4 shrink-0 text-right">
          <div>{new Date(indent.createdAt).toLocaleDateString('en-IN')}</div>
          <div className="mt-1">{isSelected ? '▲ Hide' : '▼ Details'}</div>
        </div>
      </div>

      {isSelected && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
          {indent.items && indent.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-200">
                    <th className="text-left py-2 pr-4">RM Item</th>
                    <th className="text-left py-2 pr-4">Code</th>
                    <th className="text-right py-2 pr-4">Required Qty</th>
                    <th className="text-center py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {indent.items.map((item, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-4 font-medium text-gray-700">{item.rmName}</td>
                      <td className="py-2 pr-4 font-mono text-blue-600">{item.rmCode}</td>
                      <td className="py-2 pr-4 text-right">{Number(item.requiredQty).toFixed(3)}</td>
                      <td className="py-2 text-center">
                        {item.issued
                          ? <span className="text-green-600 font-bold">✓ Issued</span>
                          : <span className="text-orange-500">Pending</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-400">No item details available.</p>
          )}
        </div>
      )}
    </div>
  )
}