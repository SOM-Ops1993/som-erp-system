import { useState, useEffect, useRef } from 'react'
import { inwardApi, packsApi } from '../../../../../../api/inventory.js'
import jsQR from 'jsqr'
import { Button, IconButton } from '../../../../../../components/ui'
import { X } from 'lucide-react'
import './PackInward.css'

const STEPS = { SETUP: 'setup', SCANNING: 'scanning', DONE: 'done' }

const WAREHOUSES = [
  'BULK ROOM',
  'BOX GODOWN',
  'BOTTLE GODOWN',
  'STERILE ROOM I',
  'STERILE ROOM II',
  'COLD ROOM',
  'SOLVENT GODOWN',
  'ACM ROOM',
  'HERBAL STORAGE',
]

export default function PackInward() {
  const [step, setStep]             = useState(STEPS.SETUP)
  const [pendingGroups, setPending] = useState([])
  const [loadingGroups, setLoading] = useState(true)
  const [activeSessionMap, setActiveSessionMap] = useState({})
  const [selected, setSelected]     = useState(null)
  const [warehouse, setWarehouse]   = useState(WAREHOUSES[0])
  const [session, setSession]       = useState(null)
  const [resumed, setResumed]       = useState(false)
  const [creating, setCreating]     = useState(false)
  const [error, setError]           = useState('')
  const [scanError, setScanError]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastScan, setLastScan]     = useState('')
  const [manualId, setManualId]     = useState('')
  const [warehouseFlash, setWarehouseFlash] = useState('')
  const [doneStats, setDoneStats]           = useState({ submitted: 0, leftOver: 0 })

  const videoRef     = useRef(null)
  const canvasRef    = useRef(null)
  const streamRef    = useRef(null)
  const animRef      = useRef(null)
  const sessionRef   = useRef(null)
  const scanningRef  = useRef(false)
  const lastScanTime = useRef(0)
  const warehouseRef = useRef(warehouse)

  useEffect(() => { loadGroups(); return stopCamera }, [])
  useEffect(() => { sessionRef.current = session }, [session])
  useEffect(() => { warehouseRef.current = warehouse }, [warehouse])

  const loadGroups = async () => {
    try {
      setLoading(true)
      const [pendingRes, sessionsRes] = await Promise.all([
        packsApi.pendingInward(),
        inwardApi.activeSessions(),
      ])
      setPending(pendingRes.data || [])
      const map = {}
      for (const s of (sessionsRes.data || [])) {
        map[`${s.itemCode}-${s.lotNo}`] = s
      }
      setActiveSessionMap(map)
    } catch (e) { setError('Failed to load: ' + e.message) }
    finally { setLoading(false) }
  }

  const startSession = async () => {
    if (!selected || !warehouse) { setError('Select item and warehouse'); return }
    setCreating(true); setError('')
    try {
      const sessionKey  = `${selected.itemCode}-${selected.lotNo}`
      const isResume    = !!activeSessionMap[sessionKey]
      const createRes   = await inwardApi.createSession({ itemCode: selected.itemCode, lotNo: selected.lotNo, warehouse })
      const sessionId   = createRes.data?.sessionId
      const fullRes     = await inwardApi.getSession(sessionId)
      const sessionData = fullRes.data
      const alreadyScanned = (sessionData?.scannedPackIds?.length || 0) > 0
      sessionRef.current = sessionData
      setSession(sessionData)
      setResumed(isResume || alreadyScanned)
      setStep(STEPS.SCANNING)
      await startCamera()
    } catch (e) { setError(e.message) }
    finally { setCreating(false) }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
          scanningRef.current = true
          runScanLoop()
        }
      }
    } catch (e) {
      setScanError('Camera unavailable: ' + e.message + '. Use manual entry below.')
    }
  }

  const stopCamera = () => {
    scanningRef.current = false
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
  }

  const runScanLoop = () => {
    if (!scanningRef.current) return
    animRef.current = requestAnimationFrame(async () => {
      const video  = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) {
        if (scanningRef.current) runScanLoop()
        return
      }
      const ctx = canvas.getContext('2d')
      canvas.width  = video.videoWidth  || 640
      canvas.height = video.videoHeight || 480
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      const now = Date.now()
      if (code?.data && now - lastScanTime.current > 1500) {
        lastScanTime.current = now
        await doScan(code.data)
      }
      if (scanningRef.current) runScanLoop()
    })
  }

  const doScan = async (packId) => {
    const cur = sessionRef.current
    const wh  = warehouseRef.current
    if (!cur) return
    setScanError(''); setLastScan(packId)
    try {
      await inwardApi.scan(cur.sessionId, packId, wh)
      const freshRes = await inwardApi.getSession(cur.sessionId)
      const updated  = freshRes.data
      sessionRef.current = updated
      setSession(updated)
    } catch (e) { setScanError(e.message) }
  }

  const submitManual = async (e) => {
    e.preventDefault()
    const id = manualId.trim()
    if (!id) return
    setManualId('')
    await doScan(id)
  }

  const removeScan = async (packId) => {
    const cur = sessionRef.current
    if (!cur) return
    try {
      await inwardApi.removeScan(cur.sessionId, packId)
      const freshRes = await inwardApi.getSession(cur.sessionId)
      const updated  = freshRes.data
      sessionRef.current = updated
      setSession(updated)
    } catch (e) { alert(e.message) }
  }

  const submit = async () => {
    const cur = sessionRef.current
    if (!cur) return
    const isPartial = scanned.length < cur.expectedBags
    const msg = isPartial
      ? `Submit ${scanned.length} scanned bag${scanned.length !== 1 ? 's' : ''} now?\n\nThe remaining ${pending.length} bag${pending.length !== 1 ? 's' : ''} will stay pending — you can start a new session tomorrow to scan them.`
      : `Submit inward for all ${scanned.length} bag${scanned.length !== 1 ? 's' : ''}?`
    if (!confirm(msg)) return
    setSubmitting(true)
    try {
      setDoneStats({ submitted: scanned.length, leftOver: pending.length })
      await inwardApi.submit(cur.sessionId, 'Operator')
      stopCamera()
      setStep(STEPS.DONE)
    } catch (e) { setScanError(e.message) }
    finally { setSubmitting(false) }
  }

  const pauseAndExit = () => {
    stopCamera()
    sessionRef.current = null
    setStep(STEPS.SETUP); setSession(null); setSelected(null)
    setError(''); setScanError(''); setLastScan(''); setManualId('')
    setWarehouse(WAREHOUSES[0]); setResumed(false)
    loadGroups()
  }

  const handleWarehouseChange = (newWh) => {
    setWarehouse(newWh)
    warehouseRef.current = newWh
    setWarehouseFlash(newWh)
    setTimeout(() => setWarehouseFlash(''), 2500)
  }

  const scanned    = session?.scannedPackIds || []
  const pending    = session?.pendingPackIds || []
  const progress   = session ? Math.round((scanned.length / session.expectedBags) * 100) : 0
  const allScanned = session && scanned.length >= session.expectedBags
  const canSubmit  = scanned.length > 0

  // "?"? Done "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?
  if (step === STEPS.DONE) return (
    <div className="p-4 md:p-6 max-w-xl">
      {doneStats.leftOver > 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <div className="text-5xl mb-4">Y"</div>
          <h2 className="text-2xl font-bold text-blue-800 mb-2">Partial Inward Submitted</h2>
          <p className="text-blue-700 mb-1">
            <span className="font-bold">{doneStats.submitted} bag{doneStats.submitted !== 1 ? 's' : ''}</span> successfully inwarded
          </p>
          <p className="text-blue-600 text-sm mb-3">Item: {selected?.itemName} | Lot: {selected?.lotNo}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-800">
            ⏳ <span className="font-semibold">{doneStats.leftOver} bag{doneStats.leftOver !== 1 ? 's' : ''} still pending</span> — come back tomorrow and start a new session to scan the rest.
          </div>
          <Button onClick={pauseAndExit} variant="primary">Back to Setup</Button>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="text-5xl mb-4">o.</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Pack Inward Completed!</h2>
          <p className="text-green-700 mb-1">{doneStats.submitted} bags successfully inwarded</p>
          <p className="text-green-600 text-sm mb-6">Item: {selected?.itemName} | Lot: {selected?.lotNo}</p>
          <Button onClick={pauseAndExit} variant="success">Start New Inward</Button>
        </div>
      )}
    </div>
  )

  // "?"? Scanning "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?
  if (step === STEPS.SCANNING) return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-900 truncate">{selected?.itemName}</h2>
          <p className="text-sm text-gray-500">Lot: {selected?.lotNo}</p>
        </div>
        <Button onClick={pauseAndExit} variant="warning" size="sm" className="flex-shrink-0">
          ⏸ Pause &amp; Resume Later
        </Button>
      </div>

      {/* Resumed session banner */}
      {resumed && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-xl mb-3 flex items-center gap-2 text-sm">
          <span className="text-base shrink-0">⏸</span>
          <div>
            <span className="font-bold">Session resumed</span> — {scanned.length} bag{scanned.length !== 1 ? 's' : ''} already scanned.{' '}
            <span className="text-amber-600">Scan {pending.length} remaining bag{pending.length !== 1 ? 's' : ''} to complete.</span>
          </div>
        </div>
      )}

      {/* "?"? Warehouse switcher "?"? */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2 md:flex-1 min-w-0">
          <span className="text-lg"></span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-indigo-600 leading-none mb-1">Scanning bags to warehouse</p>
            <p className="text-[11px] text-indigo-400">Change anytime — next scan goes to the selected warehouse</p>
          </div>
        </div>
        <select
          value={warehouse}
          onChange={e => handleWarehouseChange(e.target.value)}
          className="w-full md:w-auto border-2 border-indigo-400 bg-white text-indigo-800 font-bold rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          {WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>

      {warehouseFlash && (
        <div className="bg-indigo-600 text-white px-4 py-2 rounded-lg mb-3 text-sm font-semibold text-center animate-pulse">
          o" Warehouse changed → {warehouseFlash}
        </div>
      )}

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex justify-between text-sm font-medium mb-2">
          <span className="text-green-700">o. Scanned: {scanned.length}</span>
          <span className="text-orange-600">⏳ Pending: {pending.length}</span>
          <span className="text-gray-700">Total: {session?.expectedBags}</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-center text-sm text-gray-600 mt-1">{progress}% complete</p>
      </div>

      {scanError && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          O {scanError}
        </div>
      )}
      {lastScan && !scanError && !warehouseFlash && (
        <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-2 rounded-lg mb-4 text-sm">
          o. Scanned: {lastScan}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Camera */}
        <div className="flex flex-col gap-3">
          <div className="bg-black rounded-xl overflow-hidden relative pi-camera-container">
            <video ref={videoRef} className="w-full" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-blue-400 rounded-lg" />
            </div>
            <div className="absolute top-2 left-2 right-2 bg-indigo-700/80 rounded-lg px-3 py-1.5 text-center">
              <span className="text-white text-xs font-semibold">Y {warehouse}</span>
            </div>
            <div className="absolute bottom-3 left-0 right-0 text-center text-white text-sm bg-black/40 py-1">
              Point camera at pack QR
            </div>
          </div>
          <form onSubmit={submitManual} className="flex gap-2">
            <input
              value={manualId}
              onChange={e => setManualId(e.target.value)}
              placeholder="Or type / paste Pack ID?"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button type="submit" disabled={!manualId.trim()} variant="primary" size="sm">
              Add
            </Button>
          </form>
        </div>

        {/* Scanned / Pending lists */}
        <div className="flex flex-col gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-3 flex-1 overflow-hidden">
            <h3 className="font-semibold text-green-700 mb-2">o. Scanned ({scanned.length})</h3>
            <div className="overflow-y-auto max-h-36 space-y-1">
              {scanned.length === 0
                ? <p className="text-gray-400 text-sm">No bags scanned yet</p>
                : scanned.map(id => (
                  <div key={id} className="flex items-center justify-between bg-green-50 px-2 py-1 rounded text-sm">
                    <span className="font-mono text-green-800 truncate">{id}</span>
                    <IconButton icon={X} onClick={() => removeScan(id)} variant="danger" size="xs" tooltip="Remove" className="ml-2 flex-shrink-0" />
                  </div>
                ))}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 flex-1 overflow-hidden">
            <h3 className="font-semibold text-orange-600 mb-2">⏳ Pending ({pending.length})</h3>
            <div className="overflow-y-auto max-h-36 space-y-1">
              {pending.length === 0
                ? <p className="text-gray-400 text-sm">All scanned!</p>
                : pending.map(id => (
                  <div key={id} className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded truncate">{id}</div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <Button
        onClick={submit}
        disabled={!canSubmit || submitting}
        loading={submitting}
        variant={allScanned ? 'success' : canSubmit ? 'primary' : 'secondary'}
        fullWidth
        size="lg"
        className="mt-4"
      >
        {submitting
          ? 'Submitting?'
          : allScanned
            ? `o. Submit All ${scanned.length} Bags`
            : canSubmit
              ? `Y" Submit ${scanned.length} Scanned Bag${scanned.length !== 1 ? 's' : ''} (${pending.length} remaining for later)`
              : 'Scan at least 1 bag to submit'}
      </Button>

      <p className="text-center text-xs text-gray-400 mt-2">
        Progress is saved automatically — you can pause and resume anytime.
      </p>
    </div>
  )

  // "?"? Setup "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?
  const selectedActiveSession = selected
    ? activeSessionMap[`${selected.itemCode}-${selected.lotNo}`]
    : null

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Pack Inward</h2>
      <p className="text-gray-500 text-sm mb-5">
        Scan individual QR bags into the warehouse. Generate packs first in Print Master.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      {loadingGroups ? (
        <p className="text-gray-400">Loading pending items?</p>
      ) : pendingGroups.length === 0 && Object.keys(activeSessionMap).length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-4 rounded-lg">
          No packs pending inward. Go to <strong>Print Master</strong> to generate new packs first.
        </div>
      ) : (
        <>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Item &amp; Lot *</label>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
              {pendingGroups.map(g => {
                const sessionKey     = `${g.itemCode}-${g.lotNo}`
                const partialSession = activeSessionMap[sessionKey]
                const scannedCount   = partialSession?.scannedPackIds?.length || 0
                const isSelected     = selected?.itemCode === g.itemCode && selected?.lotNo === g.lotNo

                return (
                  <button
                    key={sessionKey}
                    onClick={() => {
                      setSelected(g)
                      if (partialSession) setWarehouse(partialSession.warehouse || WAREHOUSES[0])
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-blue-400 text-blue-900'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium">{g.itemName}</div>
                        <div className="text-sm text-gray-500">
                          Code: {g.itemCode} | Lot: {g.lotNo} |{' '}
                          <span className="font-semibold text-blue-700">{g.bagCount} bags</span>
                        </div>
                      </div>
                      {partialSession && (
                        <span className="shrink-0 flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200 whitespace-nowrap">
                          ⏸ {scannedCount}/{partialSession.expectedBags} scanned
                        </span>
                      )}
                    </div>
                    {partialSession && (
                      <div className="mt-2 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.round((scannedCount / partialSession.expectedBags) * 100)}%` }}
                        />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Warehouse *</label>
            <select
              value={warehouse}
              onChange={e => setWarehouse(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 font-medium"
            >
              {WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            {selectedActiveSession ? (
              <p className="text-xs text-amber-600 mt-1.5 font-medium">
                Session was last using <strong>{selectedActiveSession.warehouse}</strong> — change here if you want to scan remaining bags to a different warehouse.
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-1.5">
                You can change the warehouse anytime during scanning to route bags to different locations.
              </p>
            )}
          </div>

          <Button
            onClick={startSession}
            disabled={!selected || !warehouse || creating}
            loading={creating}
            variant="primary"
            fullWidth
            size="lg"
          >
            {creating
              ? 'Starting?'
              : selectedActiveSession
                ? ` Resume Session (${selectedActiveSession.scannedPackIds?.length || 0}/${selectedActiveSession.expectedBags} done)`
                : ' Start Scanning Session'}
          </Button>

          {selectedActiveSession && (
            <p className="text-center text-xs text-gray-400 mt-2">
              Your previous session was paused. Resume to scan the remaining bags.
            </p>
          )}
        </>
      )}
    </div>
  )
}
