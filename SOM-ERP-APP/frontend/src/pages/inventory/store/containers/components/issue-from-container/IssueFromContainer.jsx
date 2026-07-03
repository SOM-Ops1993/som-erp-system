import { useState, useRef, useEffect } from 'react'
import './IssueFromContainer.css'
import jsQR from 'jsqr'
import { containerApi } from '../../../../../../api/inventory.js'
import { indentApi } from '../../../../../../api/production.js'
import { Button } from '../../../../../../components/ui'

export default function IssueFromContainer({ preselected, onDone }) {
  const [container, setContainer]   = useState(preselected || null)
  const [scanInput, setScanInput]   = useState('')
  const [loadingCont, setLoadingC]  = useState(false)
  const [qty, setQty]               = useState('')
  const [remarks, setRemarks]       = useState('')
  const [indentId, setIndentId]     = useState('')
  const [indents, setIndents]       = useState([])
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
    indentApi.list({ status: 'OPEN' }).then(r => setIndents(r.data || [])).catch(() => {})
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
    setError(''); setSuccess(''); setContainer(null); setQty(''); setRemarks(''); setIndentId('')
    try {
      setLoadingC(true)
      const r = await containerApi.get(trimmed)
      setContainer(r.data)
    } catch (e) { setError(e.response?.data?.error || 'Container not found: ' + trimmed) }
    finally { setLoadingC(false) }
  }

  const submit = async () => {
    const q = parseFloat(qty)
    if (!q || q <= 0) { setError('Enter a valid quantity'); return }
    if (q > container.currentQty) { setError(`Qty exceeds container balance (${container.currentQty})`); return }
    setSub(true); setError(''); setSuccess('')
    try {
      const r = await containerApi.issue(container.containerId, {
        qty: q,
        indentId: indentId || undefined,
        remarks: remarks || undefined,
      })
      setSuccess(`Issued ${r.issued} ${container.uom} from ${container.containerId}. Remaining: ${r.data.currentQty} ${r.data.uom}`)
      setContainer(r.data)
      setQty(''); setRemarks(''); setIndentId('')
      onDone?.()
    } catch (e) { setError(e.response?.data?.error || e.message) }
    finally { setSub(false) }
  }

  // Filter indents that have this container's item in their RM list
  const relevantIndents = container
    ? indents.filter(i => i.details?.some(d => d.rmCode === container.itemCode))
    : indents

  return (
    <div className="p-6 max-w-lg">
      <p className="text-sm text-gray-500 mb-5">
        Scan a container QR or type its ID → enter qty to issue to the plant.
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
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-green-500"
            />
            <Button
              variant="success"
              loading={loadingCont}
              disabled={!scanInput.trim()}
              onClick={() => loadContainer(scanInput)}
            >
              Load
            </Button>
            <Button
              variant={cameraOn ? "danger" : "outline-gray"}
              size="sm"
              onClick={cameraOn ? stopCamera : startCamera}
            >
              {cameraOn ? 'Stop Cam' : 'Scan QR'}
            </Button>
          </div>

          {cameraOn && (
            <div className="bg-black rounded-xl overflow-hidden relative mb-3 ifc-camera-box">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-40 border-2 border-green-400 rounded-lg" />
              </div>
              <div className="absolute bottom-2 left-0 right-0 text-center text-white text-xs bg-black/50 py-1">
                Point at container QR code
              </div>
            </div>
          )}
        </div>
      )}

      {/* Container info */}
      {container && (
        <>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-green-900 font-mono">{container.containerId}</div>
                <div className="text-sm text-green-700">{container.itemName}
                  <span className="text-green-500 text-xs font-mono ml-1">({container.itemCode})</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => { setContainer(null); setError(''); setSuccess('') }}
              >
                Change
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-center text-sm">
              <div className="bg-white rounded-lg py-2">
                <div className={`font-bold text-xl ${container.currentQty > 0 ? 'text-green-700' : 'text-red-500'}`}>
                  {container.currentQty}
                </div>
                <div className="text-xs text-gray-500">Available {container.uom}</div>
              </div>
              <div className="bg-white rounded-lg py-2">
                <div className="font-bold text-gray-500 text-xl">{container.capacity}</div>
                <div className="text-xs text-gray-500">Capacity {container.uom}</div>
              </div>
            </div>
            {container.currentQty <= 0 && (
              <p className="text-red-600 text-xs mt-2 font-semibold text-center">Container is empty — fill it first</p>
            )}
          </div>

          {container.currentQty > 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Qty to Issue *</label>
                <input type="number" min="0.001" step="0.001" max={container.currentQty}
                  value={qty} onChange={e => setQty(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Link to Indent <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select value={indentId} onChange={e => setIndentId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">— No indent (direct issue to plant) —</option>
                  {relevantIndents.map(i => (
                    <option key={i.indentId} value={i.indentId}>
                      {i.productName} | {i.batchNo} | {i.batchSize} kg
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Remarks <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input value={remarks} onChange={e => setRemarks(e.target.value)}
                  placeholder="e.g. Issued to Formulation Plant A"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <Button
                variant="success"
                fullWidth
                loading={submitting}
                disabled={!qty}
                onClick={submit}
              >
                Issue from Container
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
