import { useState, useEffect, useRef, useCallback } from 'react'
import { outwardApi, containerApi } from '../../../../../api/inventory.js'
import { recipeApi, productApi } from '../../../../../api/masters.js'
import QRScanner from '../../../../../components/erp/QRScanner.jsx'

// ─── Session persistence ──────────────────────────────────────────────────────
const SESSIONS_KEY = 'bom_issue_sessions'
const readSessions  = () => { try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]') } catch { return [] } }
const writeSessions = (list) => localStorage.setItem(SESSIONS_KEY, JSON.stringify(list))
const saveSession   = (s) => { const all = readSessions(); const i = all.findIndex(x => x.id === s.id); if (i >= 0) all[i] = s; else all.push(s); writeSessions(all) }
const deleteSession = (id) => writeSessions(readSessions().filter(s => s.id !== id))

function fmtDate(iso) {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MaterialIssueByBOM() {
  // ── Step / product selection ──────────────────────────────────────────────
  const [step, setStep]             = useState('select')
  const [products, setProducts]     = useState([])
  const [prodSearch, setProdSearch] = useState('')
  const [selProduct, setSelProduct] = useState(null)
  const [batchQty, setBatchQty]     = useState('')
  const [batchRef, setBatchRef]     = useState('')
  const [loadingBom, setLoadingBom] = useState(false)
  const [error, setError]           = useState('')

  // ── Session ───────────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState(() => readSessions())
  const [sessionId, setSessionId] = useState(null)

  // ── BOM ───────────────────────────────────────────────────────────────────
  const [bomLines, setBomLines] = useState([])

  // ── Issue panel ───────────────────────────────────────────────────────────
  const [activeIdx, setActiveIdx]   = useState(null)
  // pre-loaded silently for scan matching (never shown as dropdowns)
  const [packs, setPacks]           = useState([])
  const [containers, setContainers] = useState([])
  const [loadingRes, setLoadingRes] = useState(false)
  // scan state
  const [scanInput, setScanInput]   = useState('')
  const [scanErr, setScanErr]       = useState('')
  const [foundSource, setFoundSource] = useState(null)
  // foundSource: { type:'pack'|'container', id, availableQty, uom, lotNo?, bagNo?, supplier?, itemName? }
  const [issueQty, setIssueQty]     = useState('')
  const [issuing, setIssuing]       = useState(false)
  const [issueError, setIssueError] = useState('')
  const [lineMsg, setLineMsg]       = useState({})
  const [showScanner, setShowScanner] = useState(false)

  const scanInputRef = useRef(null)

  // Load products
  useEffect(() => {
    productApi.list().then(r => setProducts(r.data || [])).catch(() => {})
  }, [])

  // Refresh sessions when returning to select screen
  useEffect(() => {
    if (step === 'select') setSessions(readSessions())
  }, [step])

  // Auto-save on every bomLines change
  useEffect(() => {
    if (!sessionId || step !== 'bom') return
    saveSession({
      id: sessionId,
      productCode: selProduct?.productCode || '',
      productName: selProduct?.productName || '',
      batchQty, batchRef,
      startedAt: readSessions().find(s => s.id === sessionId)?.startedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      bomLines,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bomLines, sessionId])

  // Auto-focus scan input when panel opens
  useEffect(() => {
    if (activeIdx !== null) {
      const t = setTimeout(() => scanInputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [activeIdx])

  const filteredProducts = products.filter(p =>
    !prodSearch ||
    p.productName?.toLowerCase().includes(prodSearch.toLowerCase()) ||
    p.productCode?.toLowerCase().includes(prodSearch.toLowerCase())
  )

  // ── Load BOM ──────────────────────────────────────────────────────────────
  const loadBom = async () => {
    if (!selProduct || !batchQty || parseFloat(batchQty) <= 0) return
    setLoadingBom(true); setError('')
    try {
      const res = await recipeApi.list({ productCode: selProduct.productCode })
      const raw = res.data || []
      if (raw.length === 0) {
        setError('No BOM found for this product. Add recipe lines in Recipe Master first.')
        setLoadingBom(false); return
      }
      const batch = parseFloat(batchQty)
      const lines = raw.map(r => ({
        rmCode:     r.rmCode,
        rmName:     r.rmName,
        qtyPerUnit: parseFloat(r.qtyPerUnit),
        required:   parseFloat((r.qtyPerUnit * batch).toFixed(3)),
        issued:     0,
        uom:        r.uom || 'KG',
        roleType:   r.roleType || 'INGREDIENT',
      }))
      const id = Date.now().toString()
      setSessionId(id)
      setBomLines(lines)
      setActiveIdx(null)
      setLineMsg({})
      setStep('bom')
    } catch (e) { setError(e.message) }
    finally { setLoadingBom(false) }
  }

  // ── Resume session ────────────────────────────────────────────────────────
  const resumeSession = (s) => {
    setSelProduct({ productCode: s.productCode, productName: s.productName })
    setBatchQty(s.batchQty)
    setBatchRef(s.batchRef || '')
    setBomLines(s.bomLines)
    setSessionId(s.id)
    setActiveIdx(null)
    setLineMsg({})
    setError('')
    setStep('bom')
  }

  const removeSession = (id) => { deleteSession(id); setSessions(readSessions()) }

  // ── Load packs + containers silently (for scan matching only) ─────────────
  const loadResources = useCallback(async (rmCode) => {
    setLoadingRes(true)
    setScanInput(''); setScanErr(''); setFoundSource(null); setIssueQty(''); setIssueError('')
    try {
      const [packsRes, contsRes] = await Promise.allSettled([
        outwardApi.availablePacks(rmCode),
        containerApi.list({ itemCode: rmCode }),
      ])
      setPacks(packsRes.status === 'fulfilled' ? (packsRes.value.data || []) : [])
      setContainers(
        contsRes.status === 'fulfilled'
          ? (contsRes.value.data || []).filter(c => c.currentQty > 0)
          : []
      )
    } finally { setLoadingRes(false) }
  }, [])

  const openIssuePanel = async (idx) => {
    if (activeIdx === idx) { setActiveIdx(null); return }
    setActiveIdx(idx)
    setIssueError('')
    setLineMsg(prev => ({ ...prev, [idx]: '' }))
    await loadResources(bomLines[idx].rmCode)
  }

  // ── Unified scan handler ──────────────────────────────────────────────────
  const handleScan = useCallback((rawValue) => {
    const val = rawValue.trim()
    if (!val) return
    setScanInput(val)
    setScanErr('')
    setFoundSource(null)
    setIssueError('')

    const line = bomLines[activeIdx]
    if (!line) return
    const remaining = parseFloat((line.required - line.issued).toFixed(3))

    // Container QR encodes "CONT:{containerId}"
    if (val.startsWith('CONT:')) {
      const containerId = val.slice(5)
      const cont = containers.find(c => c.containerId === containerId)
      if (cont) {
        setFoundSource({ type: 'container', id: cont.containerId, availableQty: cont.currentQty, uom: cont.uom || line.uom, itemName: cont.itemName })
        setIssueQty(String(Math.min(remaining, cont.currentQty).toFixed(3)))
      } else {
        setScanErr(`Container "${containerId}" has no stock for ${line.rmName}. Check the container or inward stock first.`)
      }
      return
    }

    // Pack QR encodes raw packId
    const pack = packs.find(p => p.packId === val)
    if (pack) {
      setFoundSource({ type: 'pack', id: pack.packId, availableQty: pack.remainingQty, uom: line.uom, lotNo: pack.lotNo, bagNo: pack.bagNo, supplier: pack.supplier })
      setIssueQty(String(Math.min(remaining, pack.remainingQty).toFixed(3)))
      return
    }

    setScanErr(`"${val}" not found for ${line.rmName}. Scan the correct pack or container QR code.`)
  }, [bomLines, activeIdx, packs, containers])

  // QR camera callback — closes modal then processes value
  const onQRScan = useCallback((value) => {
    setShowScanner(false)
    handleScan(value)
  }, [handleScan])

  // ── Submit issue ──────────────────────────────────────────────────────────
  const submitIssue = async () => {
    const line = bomLines[activeIdx]
    const qty  = parseFloat(issueQty)
    if (!foundSource) { setIssueError('Scan a pack or container QR code first'); return }
    if (!qty || qty <= 0) { setIssueError('Enter a valid quantity'); return }
    if (qty > foundSource.availableQty) { setIssueError(`Qty exceeds available stock (${foundSource.availableQty} ${foundSource.uom})`); return }

    setIssuing(true); setIssueError('')
    try {
      await outwardApi.bomDirect({
        source:      foundSource.type,
        sourceId:    foundSource.id,
        qty,
        rmCode:      line.rmCode,
        productCode: selProduct.productCode,
        productName: selProduct.productName,
        batchSize:   parseFloat(batchQty),
        batchRef,
      })

      const newIssued  = parseFloat((line.issued + qty).toFixed(3))
      const updatedLines = bomLines.map((l, i) =>
        i === activeIdx ? { ...l, issued: newIssued } : l
      )
      setBomLines(updatedLines)
      setLineMsg(prev => ({
        ...prev,
        [activeIdx]: `Issued ${qty} ${line.uom} from ${foundSource.type === 'pack' ? 'Pack' : 'Container'}: ${foundSource.id}`,
      }))

      const remaining = parseFloat((line.required - newIssued).toFixed(3))
      if (remaining <= 0.001) {
        setActiveIdx(null)
        if (updatedLines.every(l => l.issued >= l.required - 0.001)) deleteSession(sessionId)
      } else {
        // More qty needed — reset scan, keep panel open
        setScanInput(''); setFoundSource(null); setScanErr(''); setIssueQty(String(remaining.toFixed(3)))
        await loadResources(line.rmCode)
      }
    } catch (e) { setIssueError(e.message) }
    finally { setIssuing(false) }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const totalRequired = bomLines.length
  const totalDone     = bomLines.filter(l => l.issued >= l.required - 0.001).length
  const progress      = totalRequired > 0 ? Math.round((totalDone / totalRequired) * 100) : 0

  // ─────────────────────────────────────────────────────────────────────────
  // STEP: SELECT
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'select') {
    const activeSessions = sessions.filter(s => s.bomLines?.some(l => l.issued < l.required - 0.001))
    return (
      <div className="p-6 max-w-3xl">
        {/* In-progress sessions */}
        {activeSessions.length > 0 && (
          <div className="mb-7">
            <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              In-Progress Sessions
              <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                {activeSessions.length}
              </span>
            </h3>
            <div className="rounded-xl border border-amber-200 overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead className="bg-amber-50 text-amber-800 text-xs">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Product</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Batch</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Progress</th>
                    <th className="text-left px-4 py-2.5 font-semibold hidden sm:table-cell">Last updated</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {activeSessions.map(s => {
                    const done  = s.bomLines?.filter(l => l.issued >= l.required - 0.001).length || 0
                    const total = s.bomLines?.length || 0
                    const pct   = total > 0 ? Math.round((done / total) * 100) : 0
                    return (
                      <tr key={s.id} className="border-t border-amber-100 hover:bg-amber-50/50">
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-gray-900">{s.productName}</div>
                          <div className="text-xs text-gray-400 font-mono">{s.productCode}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-medium">{s.batchQty} KG</span>
                          {s.batchRef && <div className="text-xs text-gray-400 font-mono">{s.batchRef}</div>}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-600 whitespace-nowrap">{done}/{total}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-400 hidden sm:table-cell">
                          {s.updatedAt ? fmtDate(s.updatedAt) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <button onClick={() => resumeSession(s)}
                            className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 mr-1.5">
                            Resume →
                          </button>
                          <button onClick={() => removeSession(s.id)}
                            className="text-xs text-gray-400 hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50">
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Start New Session</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <p className="text-sm text-gray-500 mb-5">
          Select a product and enter the batch size. Scan each pack or container QR code to issue materials.
          Progress is auto-saved — you can leave and resume any time.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Product *</label>
            <input
              value={prodSearch || selProduct?.productName || ''}
              onChange={e => { setProdSearch(e.target.value); setSelProduct(null) }}
              placeholder="Search product name or code…"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {prodSearch && !selProduct && (
              <div className="relative z-10">
                <div className="absolute top-1 left-0 right-0 border border-gray-200 rounded-lg bg-white shadow-lg max-h-52 overflow-y-auto">
                  {filteredProducts.slice(0, 10).map(p => (
                    <button key={p.productCode} type="button"
                      onMouseDown={() => { setSelProduct(p); setProdSearch('') }}
                      className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-sm border-b border-gray-50 last:border-0">
                      <div className="font-medium text-gray-900">{p.productName}</div>
                      <div className="text-xs text-gray-400 font-mono">{p.productCode}</div>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <p className="text-gray-400 text-sm px-4 py-3">No products found</p>
                  )}
                </div>
              </div>
            )}
            {selProduct && (
              <div className="mt-2 flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                <span className="text-xs text-indigo-700 font-mono font-bold">{selProduct.productCode}</span>
                <span className="text-sm font-medium text-indigo-900">{selProduct.productName}</span>
                <button onClick={() => { setSelProduct(null); setProdSearch('') }}
                  className="ml-auto text-gray-400 hover:text-indigo-700 text-xl leading-none">×</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Batch Size (KG) *</label>
              <input type="number" min="0.001" step="0.001"
                value={batchQty} onChange={e => setBatchQty(e.target.value)}
                placeholder="e.g. 1000"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Batch Ref / Notes</label>
              <input value={batchRef} onChange={e => setBatchRef(e.target.value)}
                placeholder="e.g. B-2026-001"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button onClick={loadBom}
            disabled={loadingBom || !selProduct || !batchQty || parseFloat(batchQty) <= 0}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 text-sm transition">
            {loadingBom ? 'Loading BOM…' : '📋 Load BOM & Start Issuing'}
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP: BOM checklist
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {showScanner && (
        <QRScanner
          label="Scan Pack or Container QR Code"
          onScan={onQRScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900">{selProduct?.productName}</h2>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-lg">
                {batchQty} KG
              </span>
              {batchRef && (
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-lg font-mono">{batchRef}</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {totalDone}/{totalRequired} materials issued
              {progress === 100
                ? <span className="text-green-600 font-bold ml-2">— All Done!</span>
                : <span className="text-gray-400 ml-2">· Progress auto-saved</span>
              }
            </p>
          </div>
          <button onClick={() => { setStep('select'); setActiveIdx(null) }}
            className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50">
            ← Back
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200 rounded-full mb-5 overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>

        {/* BOM rows */}
        <div className="space-y-2">
          {bomLines.map((line, idx) => {
            const remaining = Math.max(0, parseFloat((line.required - line.issued).toFixed(3)))
            const done      = remaining <= 0.001
            const partial   = line.issued > 0 && !done
            const isActive  = activeIdx === idx
            const pct       = Math.min(100, Math.round((line.issued / line.required) * 100))

            return (
              <div key={`${line.rmCode}-${idx}`}
                className={`border rounded-xl overflow-hidden transition-all ${
                  done     ? 'border-green-200 bg-green-50' :
                  isActive ? 'border-indigo-400 shadow-sm bg-white' :
                             'border-gray-200 bg-white'
                }`}>

                {/* Row summary */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    done    ? 'bg-green-500 text-white' :
                    partial ? 'bg-amber-400 text-white' :
                              'bg-gray-200 text-gray-600'
                  }`}>{done ? '✓' : idx + 1}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{line.rmName}</span>
                      <span className="text-xs font-mono text-gray-400">{line.rmCode}</span>
                      {line.roleType !== 'INGREDIENT' && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          line.roleType === 'MICROBE'  ? 'bg-emerald-100 text-emerald-700' :
                          line.roleType === 'CARRIER'  ? 'bg-purple-100 text-purple-700'  :
                                                         'bg-blue-100 text-blue-700'
                        }`}>{line.roleType}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-0.5 text-xs text-gray-500 flex-wrap">
                      <span>Required: <strong className="text-gray-800">{line.required} {line.uom}</strong></span>
                      <span>Issued: <strong className={line.issued > 0 ? 'text-green-700' : 'text-gray-400'}>
                        {line.issued} {line.uom}
                      </strong></span>
                      {!done && remaining > 0 && (
                        <span>Remaining: <strong className="text-red-600">{remaining} {line.uom}</strong></span>
                      )}
                    </div>
                    {lineMsg[idx] && (
                      <p className="text-xs text-green-600 mt-0.5 font-medium">✓ {lineMsg[idx]}</p>
                    )}
                  </div>

                  <div className="flex-shrink-0 w-14 hidden sm:block">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-center text-gray-400 mt-0.5">{pct}%</div>
                  </div>

                  {done ? (
                    <span className="text-xs font-bold text-green-600 px-2.5 py-1 bg-green-100 rounded-lg flex-shrink-0">
                      Done ✓
                    </span>
                  ) : (
                    <button onClick={() => openIssuePanel(idx)}
                      className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                        isActive
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}>
                      {isActive ? '↑ Close' : partial ? 'Issue More' : 'Issue ↗'}
                    </button>
                  )}
                </div>

                {/* Issue panel */}
                {isActive && !done && (
                  <IssuePanel
                    line={line}
                    remaining={remaining}
                    packs={packs}
                    containers={containers}
                    loadingRes={loadingRes}
                    scanInput={scanInput}
                    setScanInput={setScanInput}
                    scanInputRef={scanInputRef}
                    scanErr={scanErr}
                    setScanErr={setScanErr}
                    foundSource={foundSource}
                    setFoundSource={setFoundSource}
                    issueQty={issueQty}
                    setIssueQty={setIssueQty}
                    issuing={issuing}
                    issueError={issueError}
                    onScanInput={handleScan}
                    onOpenScanner={() => setShowScanner(true)}
                    onSubmit={submitIssue}
                    bomLines={bomLines}
                    activeIdx={idx}
                  />
                )}
              </div>
            )
          })}
        </div>

        {progress === 100 && (
          <div className="mt-5 bg-green-50 border border-green-200 rounded-xl p-5 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-bold text-green-800 text-lg">All Materials Issued!</p>
            <p className="text-sm text-green-600 mt-1">
              {selProduct?.productName} — {batchQty} KG batch ready for production
              {batchRef && ` (Ref: ${batchRef})`}
            </p>
            <button
              onClick={() => { setStep('select'); setActiveIdx(null); setBomLines([]) }}
              className="mt-4 bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700">
              Issue Another Batch
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Issue panel ──────────────────────────────────────────────────────────────
function IssuePanel({
  line, remaining, packs, containers, loadingRes,
  scanInput, setScanInput, scanInputRef,
  scanErr, setScanErr,
  foundSource, setFoundSource,
  issueQty, setIssueQty,
  issuing, issueError,
  onScanInput, onOpenScanner, onSubmit,
}) {
  const noStock = !loadingRes && packs.length === 0 && containers.length === 0

  return (
    <div className="border-t border-indigo-200 bg-white p-4">
      {loadingRes ? (
        <p className="text-sm text-gray-400 text-center py-4">Checking available stock…</p>
      ) : (
        <div className="space-y-4">
          {/* No stock warning */}
          {noStock && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-xs text-yellow-800">
              No warehouse packs or containers found with stock for <strong>{line.rmName}</strong>.
              Please inward stock or fill a container before issuing.
            </div>
          )}

          {/* Scan row */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
              Scan Pack or Container QR Code
            </label>
            <div className="flex gap-2">
              {/* Camera button */}
              <button onClick={onOpenScanner}
                title="Open camera scanner"
                className="shrink-0 w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-base">
                📷
              </button>
              {/* Text / hardware scanner input */}
              <input
                ref={scanInputRef}
                value={scanInput}
                onChange={e => { setScanInput(e.target.value); setScanErr(''); setFoundSource(null) }}
                onKeyDown={e => { if (e.key === 'Enter' && scanInput.trim()) onScanInput(scanInput) }}
                placeholder="Scan QR code or type Pack / Container ID…"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                onClick={() => scanInput.trim() && onScanInput(scanInput)}
                disabled={!scanInput.trim()}
                className="shrink-0 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-900 disabled:opacity-40">
                Find
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Works with pack bags and containers — one scanner for both.
              Container QR must start with <span className="font-mono">CONT:</span>
            </p>
          </div>

          {/* Scan error */}
          {scanErr && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">
              {scanErr}
            </div>
          )}

          {/* Found source card + issue form */}
          {foundSource && (
            <div className={`rounded-xl border overflow-hidden ${
              foundSource.type === 'pack' ? 'border-indigo-200' : 'border-orange-200'
            }`}>
              {/* Source info */}
              <div className={`px-4 py-3 text-xs ${
                foundSource.type === 'pack' ? 'bg-indigo-50' : 'bg-orange-50'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{foundSource.type === 'pack' ? '📦' : '🛢️'}</span>
                  <span className={`font-bold text-sm ${foundSource.type === 'pack' ? 'text-indigo-800' : 'text-orange-800'}`}>
                    {foundSource.type === 'pack' ? 'Warehouse Pack Found' : 'Container Found'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-gray-600">
                  <div>
                    <span className="text-gray-400">ID: </span>
                    <span className="font-mono font-semibold text-gray-900 break-all">{foundSource.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Available: </span>
                    <span className="font-bold text-green-700">{foundSource.availableQty} {foundSource.uom}</span>
                  </div>
                  {foundSource.lotNo && (
                    <div>
                      <span className="text-gray-400">Lot: </span>
                      <span>{foundSource.lotNo} · Bag #{foundSource.bagNo}</span>
                    </div>
                  )}
                  {foundSource.supplier && (
                    <div>
                      <span className="text-gray-400">Supplier: </span>
                      <span>{foundSource.supplier}</span>
                    </div>
                  )}
                  {foundSource.itemName && (
                    <div>
                      <span className="text-gray-400">Item: </span>
                      <span>{foundSource.itemName}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400">Still needed: </span>
                    <span className="font-bold text-red-600">{remaining} {line.uom}</span>
                  </div>
                </div>
              </div>

              {/* Issue form */}
              <div className="px-4 py-3 bg-white">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">
                      Qty to Issue ({line.uom})
                    </label>
                    <input type="number" min="0.001" step="0.001"
                      max={Math.min(foundSource.availableQty, remaining)}
                      value={issueQty}
                      onChange={e => setIssueQty(e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ${
                        foundSource.type === 'pack'
                          ? 'border-indigo-200 focus:ring-indigo-400'
                          : 'border-orange-200 focus:ring-orange-400'
                      }`}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Max: {Math.min(foundSource.availableQty, remaining).toFixed(3)} {line.uom}
                    </p>
                  </div>
                  <button onClick={onSubmit} disabled={issuing || !issueQty || parseFloat(issueQty) <= 0}
                    className={`shrink-0 py-2.5 px-5 rounded-lg text-sm font-bold text-white disabled:opacity-50 transition mb-5 ${
                      foundSource.type === 'pack'
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-orange-600 hover:bg-orange-700'
                    }`}>
                    {issuing ? 'Issuing…' : 'Issue ↗'}
                  </button>
                </div>
                {issueError && (
                  <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded border border-red-100 mt-1">
                    {issueError}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Prompt when nothing scanned yet */}
          {!foundSource && !scanErr && !noStock && (
            <div className="text-center py-4">
              <button onClick={onOpenScanner}
                className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-100">
                📷 Open Camera Scanner
              </button>
              <p className="text-xs text-gray-400 mt-2">or type/scan the ID in the field above</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
