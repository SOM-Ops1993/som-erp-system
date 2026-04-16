import { useState, useEffect, useRef, useCallback } from 'react'
import { outwardApi, indentApi, bulkApi } from '../api/client.js'
import jsQR from 'jsqr'

const MODES = { BOM: 'BOM_ISSUANCE', REDUCTION: 'PACK_REDUCTION', RECON: 'STOCK_RECON', BULK: 'BULK_ISSUE' }

export default function Outward() {
  const [mode, setMode] = useState(null)
  const [indents, setIndents] = useState([])
  const [selectedIndent, setSelectedIndent] = useState(null)
  const [selectedRm, setSelectedRm] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [issueMode, setIssueMode] = useState('scan')
  const [availablePacks, setAvailablePacks] = useState([])
  const [selectedPack, setSelectedPack] = useState('')
  const [manualQty, setManualQty] = useState('')
  const [loadingPacks, setLoadingPacks] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [recon, setRecon] = useState({ itemCode: '', adjustmentQty: '', remarks: '' })
  const [reduction, setReduction] = useState({ packId: '', qty: '' })
  const [history, setHistory] = useState([])
  const [histPage, setHistPage] = useState(1)
  const [histTotal, setHistTotal] = useState(0)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const lastScanRef = useRef(0)
  const scanningRef = useRef(false)
  const HIST_LIMIT = 20

  useEffect(() => {
    indentApi.list({ status: 'OPEN' }).then(r => setIndents(r.data || [])).catch(console.error)
    loadHistory()
    return () => stopCamera()
  }, [])

  useEffect(() => { loadHistory() }, [histPage])

  const loadHistory = async () => {
    try {
      const res = await outwardApi.history({ page: histPage, limit: HIST_LIMIT })
      setHistory(res.data || [])
      setHistTotal(res.total || 0)
    } catch { /* silent */ }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      videoRef.current.onloadedmetadata = () => { videoRef.current.play(); scanningRef.current = true; scanLoop() }
    } catch (e) { setMsg({ type: 'error', text: 'Camera error: ' + e.message }) }
  }

  const stopCamera = () => {
    scanningRef.current = false
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
  }

  const scanLoop = useCallback(() => {
    if (!scanningRef.current) return
    requestAnimationFrame(async () => {
      const video = videoRef.current; const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) { if (scanningRef.current) scanLoop(); return }
      const ctx = canvas.getContext('2d')
      canvas.width = video.videoWidth; canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      const now = Date.now()
      if (code?.data && now - lastScanRef.current > 2000) {
        lastScanRef.current = now
        await handleBomScan(code.data)
      }
      if (scanningRef.current) scanLoop()
    })
  }, [])

  const handleBomScan = async (packId) => {
    if (!selectedIndent || !selectedRm) return
    setMsg({ type: '', text: '' })
    try {
      const res = await outwardApi.bomScan({ indentId: selectedIndent.indentId, rmCode: selectedRm.rmCode, packId })
      setMsg({ type: 'success', text: `✅ Scanned ${packId} | Deducted: ${res.deducted} | Remaining: ${res.remaining}` })
      const updatedIndent = await indentApi.get(selectedIndent.indentId)
      setSelectedIndent(updatedIndent.data)
      if (res.remaining <= 0) { setScanning(false); stopCamera() }
      loadHistory()
    } catch (e) { setMsg({ type: 'error', text: '❌ ' + e.message }) }
  }

  const loadAvailablePacks = async (rmCode) => {
    setLoadingPacks(true)
    try {
      const res = await outwardApi.availablePacks(rmCode)
      setAvailablePacks(res.data || [])
      setSelectedPack(''); setManualQty('')
    } catch { setAvailablePacks([]) }
    setLoadingPacks(false)
  }

  const selectRmForIssue = async (rm) => {
    setSelectedRm(rm); setMsg({ type: '', text: '' })
    if (issueMode === 'scan') { setScanning(true); await startCamera() }
    else { await loadAvailablePacks(rm.rmCode) }
  }

  const handleManualIssue = async () => {
    if (!selectedPack) { setMsg({ type: 'error', text: 'Select a pack' }); return }
    if (!manualQty || parseFloat(manualQty) <= 0) { setMsg({ type: 'error', text: 'Enter a valid quantity' }); return }
    setMsg({ type: '', text: '' })
    try {
      const res = await outwardApi.bomManual({
        indentId: selectedIndent.indentId, rmCode: selectedRm.rmCode,
        packId: selectedPack, qtyToIssue: parseFloat(manualQty)
      })
      setMsg({ type: 'success', text: `✅ Issued ${res.deducted} from ${selectedPack} | Remaining: ${res.remaining}` })
      const updatedIndent = await indentApi.get(selectedIndent.indentId)
      setSelectedIndent(updatedIndent.data)
      setSelectedRm(null); setAvailablePacks([]); setSelectedPack(''); setManualQty('')
      loadHistory()
    } catch (e) { setMsg({ type: 'error', text: '❌ ' + e.message }) }
  }

  const submitRecon = async () => {
    try {
      await outwardApi.stockAdjustment(recon)
      setMsg({ type: 'success', text: '✅ Adjustment saved' })
      setRecon({ itemCode: '', adjustmentQty: '', remarks: '' })
      loadHistory()
    } catch (e) { setMsg({ type: 'error', text: e.message }) }
  }

  const submitReduction = async () => {
    try {
      const res = await outwardApi.packReduction(reduction)
      setMsg({ type: 'success', text: `✅ ${res.deducted} units moved to container ${res.containerId}` })
      setReduction({ packId: '', qty: '' })
      loadHistory()
    } catch (e) { setMsg({ type: 'error', text: e.message }) }
  }

  const histPages = Math.ceil(histTotal / HIST_LIMIT)

  if (!mode) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Outward — Issue Materials</h1>
        <p className="text-gray-500 text-sm mb-6">Select the type of outward transaction</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { key: MODES.BOM,       label: 'BOM Issuance',     desc: 'Issue item against a production indent (scan or manual)', icon: '📤' },
            { key: MODES.BULK,      label: 'Bulk Issue',        desc: 'Issue from a bulk location — scan location QR, select lot', icon: '🗄️' },
            { key: MODES.REDUCTION, label: 'Pack → Container',  desc: 'Move qty from pack to bulk container', icon: '📦' },
            { key: MODES.RECON,     label: 'Stock Adjustment',  desc: 'Manual stock correction with reason', icon: '⚖️' },
          ].map(m => (
            <button key={m.key} onClick={() => setMode(m.key)}
              className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-blue-400 hover:bg-blue-50 transition-all">
              <div className="text-3xl mb-2">{m.icon}</div>
              <div className="text-lg font-bold text-gray-900 mb-1">{m.label}</div>
              <div className="text-sm text-gray-500">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Recent History */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent Transactions</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-700 text-white">
                <tr>
                  <th className="text-left px-4 py-2.5">Date</th>
                  <th className="text-left px-4 py-2.5">Type</th>
                  <th className="text-left px-4 py-2.5">Source / Pack</th>
                  <th className="text-left px-4 py-2.5">Item Code</th>
                  <th className="text-right px-4 py-2.5">Qty Issued</th>
                  <th className="text-left px-4 py-2.5">Indent</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-6 text-gray-400">No transactions yet</td></tr>
                ) : history.map(h => (
                  <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {new Date(h.timestamp).toLocaleString('en-IN', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${h.sourceType === 'BULK' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        {h.sourceType}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{h.sourceId}</td>
                    <td className="px-4 py-2 font-mono text-xs text-blue-700">{h.rmCode}</td>
                    <td className="px-4 py-2 text-right font-semibold">{Number(h.qtyIssued).toFixed(3)}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{h.indentId || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {histPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <button disabled={histPage <= 1} onClick={() => setHistPage(p => p - 1)}
                className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">← Prev</button>
              <span className="text-sm text-gray-600">Page {histPage} of {histPages}</span>
              <button disabled={histPage >= histPages} onClick={() => setHistPage(p => p + 1)}
                className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Next →</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const goBack = () => {
    setMode(null); setScanning(false); stopCamera()
    setSelectedIndent(null); setSelectedRm(null); setAvailablePacks([])
    setMsg({ type: '', text: '' })
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={goBack} className="text-gray-500 hover:text-gray-700 font-medium">← Back</button>
        <h1 className="text-xl font-bold">
          {mode === MODES.BOM ? '📤 BOM Issuance' : mode === MODES.BULK ? '🗄️ Bulk Issue' : mode === MODES.REDUCTION ? '📦 Pack → Container' : '⚖️ Stock Adjustment'}
        </h1>
      </div>

      {msg.text && (
        <div className={`px-4 py-3 rounded-lg mb-4 ${msg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      {/* ── BOM ISSUANCE ─────────────────────────────────────────────── */}
      {mode === MODES.BOM && (
        <div className="space-y-4">
          {!selectedIndent ? (
            <div>
              <h2 className="font-semibold mb-2 text-gray-700">1. Select Open Indent</h2>
              {indents.length === 0 ? <p className="text-gray-400">No open indents</p> : (
                <div className="space-y-2">
                  {indents.map(i => (
                    <button key={i.indentId} onClick={() => setSelectedIndent(i)}
                      className="w-full text-left bg-white border border-gray-200 rounded-lg px-4 py-3 hover:bg-blue-50 hover:border-blue-300 transition">
                      <div className="font-semibold text-gray-900">{i.productName}</div>
                      <div className="text-sm text-gray-500">
                        Batch: {i.batchNo} | DI: {i.diNo} | Size: {i.batchSize}
                        {i.cycleNo && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Cycle {i.cycleNo}/{i.totalCycles}</span>}
                        {' · '}{new Date(i.createdAt).toLocaleDateString('en-IN')}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : !selectedRm ? (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 flex justify-between items-center">
                <div><strong>{selectedIndent.productName}</strong> | Batch: {selectedIndent.batchNo} | DI: {selectedIndent.diNo}</div>
                <button onClick={() => setSelectedIndent(null)} className="text-blue-500 text-sm hover:underline">Change</button>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-medium text-gray-700">Issue Mode:</span>
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  {[['scan','📷 Scan QR'],['manual','📋 Manual Select']].map(([v,l]) => (
                    <button key={v} onClick={() => setIssueMode(v)}
                      className={`px-4 py-1.5 text-sm font-medium transition ${issueMode === v ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <h2 className="font-semibold mb-2 text-gray-700">2. Select Item to Issue</h2>
              <div className="space-y-2">
                {selectedIndent.details?.filter(d => Number(d.balanceQty) > 0).map(d => (
                  <button key={d.id} onClick={() => selectRmForIssue(d)}
                    className="w-full text-left bg-white border border-gray-200 rounded-lg px-4 py-3 hover:bg-blue-50 transition">
                    <div className="font-medium text-gray-900">{d.rmName} <span className="font-mono text-xs text-blue-700">({d.rmCode})</span></div>
                    <div className="text-sm text-gray-500">
                      Required: {Number(d.requiredQty).toFixed(3)} | Issued: {Number(d.issuedQty).toFixed(3)} |{' '}
                      <span className="text-orange-700 font-semibold">Balance: {Number(d.balanceQty).toFixed(3)}</span>
                    </div>
                  </button>
                ))}
                {selectedIndent.details?.every(d => Number(d.balanceQty) <= 0) && (
                  <div className="text-center py-6 text-green-600 font-medium">✅ All items fully issued for this indent!</div>
                )}
              </div>
            </div>
          ) : issueMode === 'scan' && scanning ? (
            <div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 mb-4">
                Scanning for: <strong>{selectedRm?.rmName}</strong> | Balance needed: <strong>{Number(selectedRm?.balanceQty).toFixed(3)}</strong>
              </div>
              <div className="bg-black rounded-xl overflow-hidden relative" style={{ height: 300 }}>
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-blue-400 rounded-lg opacity-80" />
                </div>
              </div>
              <button onClick={() => { setScanning(false); stopCamera(); setSelectedRm(null) }}
                className="mt-3 w-full border border-gray-300 py-2 rounded-lg hover:bg-gray-50">Stop Scanning</button>
            </div>
          ) : issueMode === 'manual' && selectedRm ? (
            <div className="max-w-lg">
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 mb-4">
                Issuing: <strong>{selectedRm?.rmName}</strong> | Balance needed: <strong>{Number(selectedRm?.balanceQty).toFixed(3)}</strong>
              </div>
              {loadingPacks ? <p className="text-gray-400 text-sm">Loading available packs...</p>
                : availablePacks.length === 0 ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                    ❌ No available packs for {selectedRm.rmCode}. Ensure the item is inwarded.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Pack / Bag</label>
                      <select value={selectedPack} onChange={e => {
                        setSelectedPack(e.target.value)
                        const pk = availablePacks.find(p => p.packId === e.target.value)
                        if (pk) setManualQty(Math.min(pk.remainingQty, Number(selectedRm.balanceQty)).toFixed(3))
                      }} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">— Select a pack —</option>
                        {availablePacks.map(p => (
                          <option key={p.packId} value={p.packId}>
                            {p.packId} | Lot: {p.lotNo} | Bag #{p.bagNo} | Avail: {Number(p.remainingQty).toFixed(3)}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedPack && (() => {
                      const pk = availablePacks.find(p => p.packId === selectedPack)
                      return pk && (
                        <>
                          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm text-blue-800">
                            Pack: {pk.packId} | Available: <strong>{Number(pk.remainingQty).toFixed(3)}</strong> | Lot: {pk.lotNo}
                            {pk.supplier && ` | Supplier: ${pk.supplier}`}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Qty to Issue</label>
                            <input type="number" step="0.001" min="0.001" value={manualQty}
                              onChange={e => setManualQty(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-right" />
                          </div>
                          <button onClick={handleManualIssue}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold">
                            ✅ Confirm Issue
                          </button>
                        </>
                      )
                    })()}
                  </div>
                )}
              <button onClick={() => { setSelectedRm(null); setAvailablePacks([]); setSelectedPack(''); setManualQty('') }}
                className="mt-3 w-full border border-gray-300 py-2 rounded-lg hover:bg-gray-50 text-sm">← Back to Item List</button>
            </div>
          ) : null}
        </div>
      )}

      {/* ── BULK ISSUE ───────────────────────────────────────────────── */}
      {mode === MODES.BULK && <BulkIssuePanel onDone={() => { goBack(); loadHistory() }} />}

      {/* ── PACK → CONTAINER ─────────────────────────────────────────── */}
      {mode === MODES.REDUCTION && (
        <div className="max-w-md space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pack ID</label>
            <input value={reduction.packId} onChange={e => setReduction(r => ({ ...r, packId: e.target.value }))}
              placeholder="Scan or type Pack ID"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Qty to Transfer</label>
            <input type="number" step="0.01" value={reduction.qty} onChange={e => setReduction(r => ({ ...r, qty: e.target.value }))}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={submitReduction} className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 font-semibold">
            Transfer to Container
          </button>
        </div>
      )}

      {/* ── STOCK ADJUSTMENT ─────────────────────────────────────────── */}
      {mode === MODES.RECON && (
        <div className="max-w-md space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Code</label>
            <input value={recon.itemCode} onChange={e => setRecon(r => ({ ...r, itemCode: e.target.value }))}
              placeholder="Item Code"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Qty (+ to add, − to deduct)</label>
            <input type="number" value={recon.adjustmentQty} onChange={e => setRecon(r => ({ ...r, adjustmentQty: e.target.value }))}
              placeholder="e.g. -5 or +10"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Remarks *</label>
            <textarea value={recon.remarks} onChange={e => setRecon(r => ({ ...r, remarks: e.target.value }))}
              placeholder="Explain why (min 5 characters)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none" />
          </div>
          <button onClick={submitRecon} className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 font-semibold">
            Save Adjustment
          </button>
        </div>
      )}
    </div>
  )
}

// ─── BULK ISSUE PANEL ─────────────────────────────────────────────────────────

function BulkIssuePanel({ onDone }) {
  const [phase, setPhase]               = useState('idle')   // idle | scanning | located | confirm | done
  const [location, setLocation]         = useState(null)
  const [manualLocId, setManualLocId]   = useState('')
  const [error, setError]               = useState('')
  const [indents, setIndents]           = useState([])
  const [selectedIndent, setSelectedIndent] = useState(null)
  const [selectedRm, setSelectedRm]     = useState(null)
  const [selectedLot, setSelectedLot]   = useState(null)
  const [issueQty, setIssueQty]         = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [result, setResult]             = useState(null)

  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const streamRef   = useRef(null)
  const scanningRef = useRef(false)
  const lastScanT   = useRef(0)

  useEffect(() => {
    indentApi.list({ status: 'OPEN' }).then(r => setIndents(r.data || [])).catch(() => {})
    return () => stopCamera()
  }, [])

  const startCamera = async () => {
    setPhase('scanning'); setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      videoRef.current.onloadedmetadata = () => { videoRef.current.play(); scanningRef.current = true; scanLoop() }
    } catch (e) { setError('Camera: ' + e.message); setPhase('idle') }
  }

  const stopCamera = () => {
    scanningRef.current = false
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
  }

  const scanLoop = useCallback(() => {
    if (!scanningRef.current) return
    requestAnimationFrame(async () => {
      const video = videoRef.current; const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) { if (scanningRef.current) scanLoop(); return }
      const ctx = canvas.getContext('2d')
      canvas.width = video.videoWidth; canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(img.data, img.width, img.height)
      const now = Date.now()
      if (code?.data && now - lastScanT.current > 2000) {
        lastScanT.current = now
        const raw = code.data
        const locationId = raw.startsWith('LOC:') ? raw.slice(4) : raw
        await lookupLocation(locationId)
      }
      if (scanningRef.current) scanLoop()
    })
  }, [])

  const lookupLocation = async (locationId) => {
    setError('')
    try {
      const res = await bulkApi.getLocation(locationId)
      setLocation(res.data)
      stopCamera()
      setPhase('located')
    } catch (e) { setError(`Location "${locationId}" not found`) }
  }

  const handleManualLookup = async () => {
    if (!manualLocId.trim()) return
    await lookupLocation(manualLocId.trim().toUpperCase())
  }

  const selectLot = (lot) => {
    setSelectedLot(lot)
    // Auto-fill qty with balance from selected RM if available
    if (selectedRm) {
      const balance = Number(selectedRm.balanceQty)
      setIssueQty(Math.min(lot.remainingQty, balance > 0 ? balance : lot.remainingQty).toFixed(2))
    } else {
      setIssueQty(lot.remainingQty.toFixed(2))
    }
  }

  const submitIssue = async () => {
    if (!selectedLot) { setError('Select a lot to issue from'); return }
    if (!issueQty || parseFloat(issueQty) <= 0) { setError('Enter a valid quantity'); return }
    setSubmitting(true); setError('')
    try {
      const res = await bulkApi.bulkOutward({
        lotEntryId: selectedLot.id,
        qtyToIssue: parseFloat(issueQty),
        indentId: selectedIndent?.indentId || null,
        rmCode: selectedRm?.rmCode || location.itemCode,
      })
      setResult(res.data)
      setPhase('done')
    } catch (e) { setError(e.message) }
    setSubmitting(false)
  }

  const reset = () => {
    setPhase('idle'); setLocation(null); setManualLocId(''); setError('')
    setSelectedLot(null); setSelectedIndent(null); setSelectedRm(null)
    setIssueQty(''); setResult(null)
  }

  const activeLots = (location?.lotEntries || []).filter(e => e.status === 'ACTIVE' && e.remainingQty > 0)

  // Done
  if (phase === 'done') return (
    <div className="max-w-lg">
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-bold text-green-800 mb-2">Bulk Issue Recorded</h2>
        <div className="text-green-700 space-y-1 text-sm">
          <p>Lot: <strong>{result?.lotNo}</strong></p>
          <p>Issued: <strong>{result?.issued} {location?.uom}</strong></p>
          <p>Remaining in lot: <strong>{result?.remaining} {location?.uom}</strong></p>
          {selectedIndent && <p>Against indent: <strong>{selectedIndent.productName} / {selectedIndent.batchNo}</strong></p>}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={reset} className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-semibold">Issue Again</button>
          <button onClick={onDone} className="flex-1 border border-gray-300 py-2.5 rounded-lg hover:bg-gray-50">Done</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">❌ {error}</div>}

      {/* Step 1: Locate */}
      {(phase === 'idle' || phase === 'scanning') && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Step 1 — Scan Location QR</h3>
          {phase === 'scanning' ? (
            <div>
              <div className="bg-black rounded-xl overflow-hidden relative" style={{ maxWidth: 400 }}>
                <video ref={videoRef} className="w-full" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-green-400 rounded-lg" style={{ width: 180, height: 180 }} />
                </div>
                <p className="absolute bottom-3 w-full text-center text-white text-xs">Scan LOCATION QR (green label on rack)</p>
              </div>
              <button onClick={() => { stopCamera(); setPhase('idle') }}
                className="mt-3 border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">⏹ Cancel</button>
            </div>
          ) : (
            <>
              <button onClick={startCamera}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold mb-4">
                📷 Scan Location QR
              </button>
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400">or enter location ID</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
              <div className="flex gap-2 mt-4">
                <input value={manualLocId} onChange={e => setManualLocId(e.target.value.toUpperCase())}
                  placeholder="LOC-001" onKeyDown={e => e.key === 'Enter' && handleManualLookup()}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500 font-mono" />
                <button onClick={handleManualLookup}
                  className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 text-sm">Look Up</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Location found — select indent + lot + qty */}
      {phase === 'located' && location && (
        <>
          {/* Location summary */}
          <div className="bg-green-50 border border-green-300 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg font-mono">{location.locationId}</div>
              <div>
                <div className="font-semibold text-green-900">{location.locationName}</div>
                <div className="text-xs text-green-700">{location.itemName} <span className="font-mono">[{location.itemCode}]</span></div>
              </div>
              <button onClick={reset} className="ml-auto text-xs text-green-600 hover:underline">Change Location</button>
            </div>
          </div>

          {activeLots.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-yellow-800 text-sm">
              ⚠️ No active lots at this location. Do a Bulk Inward first.
            </div>
          ) : (
            <>
              {/* Step 2a: Optional — link to indent */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-700 mb-3">Step 2 — Link to Indent (Optional)</h3>
                <p className="text-xs text-gray-400 mb-3">Linking updates indent issuance progress. Skip if issuing directly.</p>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  <button onClick={() => { setSelectedIndent(null); setSelectedRm(null) }}
                    className={`text-left px-3 py-2 border rounded-lg text-sm ${!selectedIndent ? 'bg-gray-100 border-gray-400 font-semibold' : 'border-gray-200 hover:bg-gray-50'}`}>
                    — No Indent (direct issue) —
                  </button>
                  {indents.map(i => {
                    const matchRm = i.details?.find(d => d.rmCode === location.itemCode && Number(d.balanceQty) > 0)
                    if (!matchRm) return null
                    return (
                      <button key={i.indentId}
                        onClick={() => { setSelectedIndent(i); setSelectedRm(matchRm); setIssueQty(Math.min(activeLots[0]?.remainingQty || 0, Number(matchRm.balanceQty)).toFixed(2)) }}
                        className={`text-left px-3 py-2 border rounded-lg text-sm ${selectedIndent?.indentId === i.indentId ? 'bg-blue-50 border-blue-400' : 'border-gray-200 hover:bg-blue-50'}`}>
                        <span className="font-semibold">{i.productName}</span>
                        <span className="text-gray-400 ml-2 text-xs">Batch: {i.batchNo}</span>
                        <span className="ml-2 text-xs text-orange-700">Balance: {Number(matchRm.balanceQty).toFixed(3)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Step 2b: Select lot */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-700 mb-1">Step 3 — Select Lot to Issue From</h3>
                <p className="text-xs text-gray-400 mb-3">Each lot is a separate receipt — select which one to draw from for full traceability.</p>
                <div className="space-y-2">
                  {activeLots.map(lot => (
                    <button key={lot.id} onClick={() => selectLot(lot)}
                      className={`w-full text-left px-4 py-3 border rounded-xl transition ${selectedLot?.id === lot.id ? 'bg-green-50 border-green-400 ring-2 ring-green-200' : 'border-gray-200 hover:border-green-300 hover:bg-green-50'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-green-800">{lot.lotNo}</span>
                          {lot.supplier && <span className="ml-2 text-xs text-gray-500">· {lot.supplier}</span>}
                          {lot.invoiceNo && <span className="ml-1 text-xs text-gray-400">({lot.invoiceNo})</span>}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-700">{lot.remainingQty} {location.uom}</div>
                          <div className="text-xs text-gray-400">of {lot.receivedQty} rcvd</div>
                        </div>
                      </div>
                      {lot.receivedDate && (
                        <div className="text-xs text-gray-400 mt-1">
                          Received: {new Date(lot.receivedDate).toLocaleDateString('en-IN')}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Qty & confirm */}
              {selectedLot && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-700 mb-3">Step 4 — Confirm Quantity</h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800 mb-3">
                    Issuing from: <strong>{selectedLot.lotNo}</strong> | Available: <strong>{selectedLot.remainingQty} {location.uom}</strong>
                    {selectedIndent && <span className="ml-2">→ Indent: <strong>{selectedIndent.batchNo}</strong></span>}
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qty to Issue ({location.uom})</label>
                    <input type="number" step="0.01" min="0.01" value={issueQty}
                      onChange={e => setIssueQty(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500 text-xl font-bold text-right" />
                  </div>
                  <button onClick={submitIssue} disabled={submitting}
                    className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold text-lg disabled:opacity-50">
                    {submitting ? 'Processing...' : '✅ Confirm Bulk Issue'}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
