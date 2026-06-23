import { useState, useEffect, useRef, useCallback } from 'react'
import { bulkApi } from '../../../../../api/inventory.js'
import jsQR from 'jsqr'

export default function BulkInward() {
  const [scanPhase, setScanPhase]   = useState('idle')
  const [location, setLocation]     = useState(null)
  const [manualLocId, setManualLocId] = useState('')
  const [error, setError]           = useState('')
  const [form, setForm]             = useState({ receivedQty: '', supplier: '', invoiceNo: '', receivedDate: new Date().toISOString().split('T')[0] })
  const [result, setResult]         = useState(null)

  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const streamRef   = useRef(null)
  const scanningRef = useRef(false)
  const lastScanT   = useRef(0)

  useEffect(() => { return () => stopCamera() }, [])

  const startCamera = async () => {
    setScanPhase('scanning'); setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      videoRef.current.onloadedmetadata = () => { videoRef.current.play(); scanningRef.current = true; scanLoop() }
    } catch (e) { setError('Camera: ' + e.message); setScanPhase('idle') }
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
      setScanPhase('located')
    } catch (e) { setError(`Location "${locationId}" not found. Check Location Master.`) }
  }

  const handleManualLookup = async () => {
    if (!manualLocId.trim()) return
    await lookupLocation(manualLocId.trim().toUpperCase())
  }

  const submitInward = async () => {
    if (!form.receivedQty || parseFloat(form.receivedQty) <= 0)
      return setError('Received quantity is required')
    setScanPhase('submitting'); setError('')
    try {
      const res = await bulkApi.bulkInward({ locationId: location.locationId, ...form })
      setResult(res.data)
      setScanPhase('done')
    } catch (e) { setError(e.message); setScanPhase('located') }
  }

  const reset = () => {
    setScanPhase('idle'); setLocation(null); setManualLocId(''); setError('')
    setForm({ receivedQty: '', supplier: '', invoiceNo: '', receivedDate: new Date().toISOString().split('T')[0] })
    setResult(null)
  }

  const activeQty = location
    ? (location.lotEntries || []).filter(e => e.status === 'ACTIVE').reduce((s, e) => s + e.remainingQty, 0)
    : 0

  if (scanPhase === 'done') return (
    <div className="p-6 max-w-xl">
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-green-800 mb-2">Bulk Inward Recorded!</h2>
        <p className="text-green-700 font-semibold">{result?.lotNo}</p>
        <p className="text-green-600 text-sm mt-1">{result?.receivedQty} {location?.uom} received at {location?.locationId}</p>
        <p className="text-green-600 text-sm">{location?.itemName}</p>
        <button onClick={reset} className="mt-6 bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold">
          Record Another Inward
        </button>
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Bulk Inward</h2>
      <p className="text-gray-500 text-sm mb-5">
        Receive bulk lots (bags, labels, carrier material) into a location. Scan the location QR or enter its ID manually.
      </p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">❌ {error}</div>}

      {(scanPhase === 'idle' || scanPhase === 'scanning') && (
        <div className="space-y-4">
          {scanPhase === 'scanning' ? (
            <div>
              <div className="bg-black rounded-xl overflow-hidden relative" style={{ maxWidth: 400 }}>
                <video ref={videoRef} className="w-full" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-green-400 rounded-lg" style={{ width: 180, height: 180 }} />
                </div>
                <p className="absolute bottom-3 w-full text-center text-white text-xs">Point at LOCATION QR code</p>
              </div>
              <button onClick={() => { stopCamera(); setScanPhase('idle') }}
                className="mt-3 border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                ⏹ Cancel Scan
              </button>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Step 1 — Identify Location</h3>
              <button onClick={startCamera}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold mb-4">
                📷 Scan Location QR
              </button>
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400">or type location ID</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
              <div className="flex gap-2 mt-4">
                <input value={manualLocId} onChange={e => setManualLocId(e.target.value.toUpperCase())}
                  placeholder="LOC-001"
                  onKeyDown={e => e.key === 'Enter' && handleManualLookup()}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500 font-mono" />
                <button onClick={handleManualLookup}
                  className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 text-sm font-medium">
                  Look Up
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {scanPhase === 'located' && location && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-300 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg font-mono">{location.locationId}</div>
              <div>
                <div className="font-semibold text-green-900">{location.locationName}</div>
                <div className="text-xs text-green-700">{location.itemName} <span className="font-mono">[{location.itemCode}]</span></div>
              </div>
            </div>
            <div className="text-sm text-green-700">
              Current stock: <strong>{activeQty.toFixed(2)} {location.uom}</strong> across{' '}
              <strong>{(location.lotEntries || []).filter(e => e.status === 'ACTIVE').length}</strong> active lots
            </div>
            {(location.lotEntries || []).filter(e => e.status === 'ACTIVE').length > 0 && (
              <div className="mt-3 border-t border-green-200 pt-3">
                <p className="text-xs font-semibold text-green-700 mb-1">Existing lots here:</p>
                {(location.lotEntries || []).filter(e => e.status === 'ACTIVE').map(e => (
                  <div key={e.id} className="text-xs text-green-800 flex justify-between">
                    <span className="font-mono">{e.lotNo}</span>
                    <span>{e.remainingQty} {location.uom} remaining</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Step 2 — Enter Lot Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Received Quantity ({location.uom}) *</label>
                <input type="number" step="0.01" value={form.receivedQty}
                  onChange={e => setForm(f => ({ ...f, receivedQty: e.target.value }))}
                  placeholder="e.g. 500"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500 text-lg font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                    placeholder="Supplier name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice No</label>
                  <input value={form.invoiceNo} onChange={e => setForm(f => ({ ...f, invoiceNo: e.target.value }))}
                    placeholder="INV-2026-001"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Received Date</label>
                <input type="date" value={form.receivedDate}
                  onChange={e => setForm(f => ({ ...f, receivedDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={submitInward} disabled={scanPhase === 'submitting'}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50">
                {scanPhase === 'submitting' ? 'Saving...' : '✅ Confirm Bulk Inward'}
              </button>
              <button onClick={reset} className="border border-gray-300 px-5 py-3 rounded-lg hover:bg-gray-50 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
