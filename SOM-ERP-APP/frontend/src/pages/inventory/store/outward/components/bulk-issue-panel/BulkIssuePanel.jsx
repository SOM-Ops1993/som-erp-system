import { useState, useEffect, useRef, useCallback } from 'react'
import { bulkApi } from '../../../../../../api/inventory.js'
import { indentApi } from '../../../../../../api/production.js'
import jsQR from 'jsqr'
import { Button } from '../../../../../../components/ui'
import './BulkIssuePanel.css'

export default function BulkIssuePanel({ onDone }) {
  const [phase, setPhase]               = useState('idle')
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
          <Button onClick={reset} variant="success" fullWidth>Issue Again</Button>
          <Button onClick={onDone} variant="outline-gray" fullWidth>Done</Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">❌ {error}</div>}

      {(phase === 'idle' || phase === 'scanning') && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Step 1 — Scan Location QR</h3>
          {phase === 'scanning' ? (
            <div>
              <div className="bg-black rounded-xl overflow-hidden relative bip-scanner-wrap">
                <video ref={videoRef} className="w-full" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-green-400 rounded-lg bip-scan-target" />
                </div>
                <p className="absolute bottom-3 w-full text-center text-white text-xs">Scan LOCATION QR (green label on rack)</p>
              </div>
              <Button onClick={() => { stopCamera(); setPhase('idle') }} variant="outline-gray" size="sm" className="mt-3">⏹ Cancel</Button>
            </div>
          ) : (
            <>
              <Button onClick={startCamera} variant="success" fullWidth className="mb-4">
                📷 Scan Location QR
              </Button>
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400">or enter location ID</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
              <div className="flex gap-2 mt-4">
                <input value={manualLocId} onChange={e => setManualLocId(e.target.value.toUpperCase())}
                  placeholder="LOC-001" onKeyDown={e => e.key === 'Enter' && handleManualLookup()}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500 font-mono" />
                <Button onClick={handleManualLookup} variant="secondary" size="sm">Look Up</Button>
              </div>
            </>
          )}
        </div>
      )}

      {phase === 'located' && location && (
        <>
          <div className="bg-green-50 border border-green-300 rounded-xl p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg font-mono flex-shrink-0">{location.locationId}</div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-green-900 truncate">{location.locationName}</div>
                <div className="text-xs text-green-700 truncate">{location.itemName} <span className="font-mono">[{location.itemCode}]</span></div>
              </div>
              <Button onClick={reset} variant="ghost" size="xs" className="ml-auto flex-shrink-0">Change Location</Button>
            </div>
          </div>

          {activeLots.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-yellow-800 text-sm">
              ⚠️ No active lots at this location. Do a Bulk Inward first.
            </div>
          ) : (
            <>
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
                  <Button onClick={submitIssue} disabled={submitting} loading={submitting} variant="success" fullWidth size="lg">
                    {submitting ? 'Processing...' : '✅ Confirm Bulk Issue'}
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
