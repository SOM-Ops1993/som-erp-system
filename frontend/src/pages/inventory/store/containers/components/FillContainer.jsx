import { useState, useRef, useEffect } from 'react'
import jsQR from 'jsqr'
import { containerApi, outwardApi } from '../../../../../api/inventory.js'

export default function FillContainer({ preselected, onDone }) {
  const [container, setContainer]   = useState(preselected || null)
  const [scanInput, setScanInput]   = useState('')
  const [loadingCont, setLoadingC]  = useState(false)
  const [availPacks, setAvailPacks] = useState([])
  const [loadingPacks, setLoadingP] = useState(false)
  const [selectedPack, setPack]     = useState(null)
  const [qty, setQty]               = useState('')
  const [submitting, setSub]        = useState(false)
  const [error, setError]           = useState('')
  const [successMsg, setSuccess]    = useState('')
  const [cameraOn, setCameraOn]     = useState(false)

  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const streamRef   = useRef(null)
  const scanningRef = useRef(false)
  const lastScanRef = useRef(0)

  useEffect(() => {
    if (preselected) loadPacksForContainer(preselected)
    return stopCamera
  }, [])

  const stopCamera = () => {
    scanningRef.current = false
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    setCameraOn(false)
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setCameraOn(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
          scanningRef.current = true
          scanLoop()
        }
      }
    } catch (e) { setError('Camera unavailable: ' + e.message) }
  }

  const scanLoop = () => {
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
        const raw = code.data.startsWith('CONT:') ? code.data.slice(5) : code.data
        stopCamera()
        await loadContainer(raw)
      }
      if (scanningRef.current) scanLoop()
    })
  }

  const loadContainer = async (id) => {
    const trimmed = id.trim()
    if (!trimmed) return
    setError(''); setSuccess(''); setContainer(null); setAvailPacks([]); setPack(null); setQty('')
    try {
      setLoadingC(true)
      const r = await containerApi.get(trimmed)
      setContainer(r.data)
      await loadPacksForContainer(r.data)
    } catch (e) { setError(e.response?.data?.error || 'Container not found: ' + trimmed) }
    finally { setLoadingC(false) }
  }

  const loadPacksForContainer = async (cont) => {
    try {
      setLoadingP(true)
      const r = await outwardApi.availablePacks(cont.itemCode)
      setAvailPacks(r.data || [])
    } catch { setAvailPacks([]) }
    finally { setLoadingP(false) }
  }

  const submit = async () => {
    const q = parseFloat(qty)
    if (!q || q <= 0) { setError('Enter a valid quantity'); return }
    if (!selectedPack) { setError('Select a pack first'); return }
    setSub(true); setError(''); setSuccess('')
    try {
      const r = await containerApi.fill(container.containerId, { packId: selectedPack.packId, qty: q })
      setSuccess(`Filled ${r.filled} ${container.uom} into ${container.containerId}. New level: ${r.data.currentQty} / ${r.data.capacity} ${r.data.uom}`)
      setContainer(r.data)
      setPack(null); setQty('')
      await loadPacksForContainer(r.data)
      onDone?.()
    } catch (e) { setError(e.response?.data?.error || e.message) }
    finally { setSub(false) }
  }

  const spaceLeft = container ? container.capacity - container.currentQty : 0

  return (
    <div className="p-6 max-w-2xl">
      <p className="text-sm text-gray-500 mb-5">
        Scan a container QR or type its ID → select the source pack → enter qty to fill.
      </p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{successMsg}</div>}

      {/* Step 1 — select container */}
      {!container && (
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Container ID</label>
          <div className="flex gap-2 mb-3">
            <input
              value={scanInput}
              onChange={e => setScanInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && loadContainer(scanInput)}
              placeholder="e.g. DRUM-AZOS-001"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              onClick={() => loadContainer(scanInput)}
              disabled={loadingCont || !scanInput.trim()}
              className="bg-orange-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50"
            >
              {loadingCont ? '…' : 'Load'}
            </button>
            <button
              onClick={cameraOn ? stopCamera : startCamera}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold border ${cameraOn ? 'bg-red-50 border-red-300 text-red-600' : 'border-gray-300 hover:bg-gray-50'}`}
            >
              {cameraOn ? 'Stop Cam' : 'Scan QR'}
            </button>
          </div>

          {cameraOn && (
            <div className="bg-black rounded-xl overflow-hidden relative mb-3" style={{ height: 240 }}>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-40 border-2 border-orange-400 rounded-lg" />
              </div>
              <div className="absolute bottom-2 left-0 right-0 text-center text-white text-xs bg-black/50 py-1">
                Point at container QR code
              </div>
            </div>
          )}
        </div>
      )}

      {/* Container info card */}
      {container && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-bold text-orange-900 font-mono">{container.containerId}</div>
              <div className="text-sm text-orange-700">{container.itemName} <span className="text-orange-500 text-xs font-mono">({container.itemCode})</span></div>
            </div>
            <button onClick={() => { setContainer(null); setAvailPacks([]); setPack(null); setQty(''); setError(''); setSuccess('') }}
              className="text-xs text-orange-600 hover:underline">Change</button>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3 text-center text-sm">
            <div className="bg-white rounded-lg py-2">
              <div className="font-bold text-gray-900">{container.currentQty}</div>
              <div className="text-xs text-gray-500">Current</div>
            </div>
            <div className="bg-white rounded-lg py-2">
              <div className="font-bold text-blue-700">{spaceLeft.toFixed(3)}</div>
              <div className="text-xs text-gray-500">Space Left</div>
            </div>
            <div className="bg-white rounded-lg py-2">
              <div className="font-bold text-gray-600">{container.capacity}</div>
              <div className="text-xs text-gray-500">Capacity</div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — select pack */}
      {container && (
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Available Packs for {container.itemCode}
            {loadingPacks && <span className="text-gray-400 font-normal ml-2">Loading…</span>}
          </label>
          {!loadingPacks && availPacks.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
              No available packs. Inward stock first.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
              {availPacks.map(p => (
                <button key={p.packId} onClick={() => {
                  setPack(p)
                  setQty(String(Math.min(p.remainingQty, spaceLeft).toFixed(3)))
                  setError(''); setSuccess('')
                }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${selectedPack?.packId === p.packId ? 'bg-orange-50 border-orange-300' : 'border-gray-100 hover:bg-gray-50'}`}
                >
                  <div className="font-mono text-xs text-gray-800 truncate">{p.packId}</div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>Lot: {p.lotNo} | Bag #{p.bagNo}</span>
                    <span className="font-semibold text-green-700">{p.remainingQty} {container.uom}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3 — qty + submit */}
      {container && selectedPack && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-3">
            Pack: <span className="font-mono text-gray-800">{selectedPack.packId}</span> |
            Available: <strong>{selectedPack.remainingQty}</strong> | Space in container: <strong>{spaceLeft.toFixed(3)}</strong>
          </div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Qty to Fill *</label>
          <input
            type="number" min="0.001" step="0.001"
            max={Math.min(selectedPack.remainingQty, spaceLeft)}
            value={qty}
            onChange={e => setQty(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 mb-3"
          />
          <button onClick={submit} disabled={submitting || !qty}
            className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50">
            {submitting ? 'Filling…' : 'Fill Container'}
          </button>
        </div>
      )}
    </div>
  )
}
