import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Camera, Square } from 'lucide-react'
import { bulkApi, rmApi } from '../../../../api/inventory.js'
import { Button, BackButton } from '../../../../components/ui'
import Pagination from '../../../../components/pagination/Pagination.jsx'
import jsQR from 'jsqr'
import QRScanner    from '../components/qr-scanner/QRScanner.jsx'
import LocationCard from '../components/location-card/LocationCard.jsx'
import LocationForm from '../components/location-form/LocationForm.jsx'

export default function LocationMaster() {
  const [locations, setLocations] = useState([])
  const [loading, setLoading]     = useState(true)
  const [rmList, setRmList]       = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [expanded, setExpanded]   = useState(null)
  const [msg, setMsg]             = useState({ type: '', text: '' })
  const [page, setPage]           = useState(1)
  const [limit, setLimit]         = useState(15)

  const [form, setForm]           = useState({ locationId: '', locationName: '', itemCode: '', itemName: '', uom: 'KG' })
  const [rmSearch, setRmSearch]   = useState('')
  const [showRmDrop, setShowRmDrop] = useState(false)
  const [saving, setSaving]       = useState(false)

  const [scanning, setScanning]   = useState(false)
  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const streamRef   = useRef(null)
  const scanningRef = useRef(false)
  const lastScanTime = useRef(0)

  useEffect(() => {
    load()
    return () => stopCamera()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [locRes, rmRes] = await Promise.all([bulkApi.listLocations(), rmApi.list({})])
      setLocations(locRes.data || [])
      setRmList(rmRes.data || [])
    } catch (e) { setMsg({ type: 'error', text: e.message }) }
    setLoading(false)
  }

  const filteredRm = rmList.filter(r =>
    r.trackingType === 'BULK' &&
    (!rmSearch || r.itemName.toLowerCase().includes(rmSearch.toLowerCase()) ||
     r.itemCode.toLowerCase().includes(rmSearch.toLowerCase()))
  )
  const rmOptions = filteredRm.length > 0 ? filteredRm
    : rmList.filter(r => !rmSearch || r.itemName.toLowerCase().includes(rmSearch.toLowerCase()) ||
        r.itemCode.toLowerCase().includes(rmSearch.toLowerCase()))

  const selectRm = (rm) => {
    setForm(f => ({ ...f, itemCode: rm.itemCode, itemName: rm.itemName, uom: rm.uom }))
    setRmSearch(rm.itemName)
    setShowRmDrop(false)
  }

  const openAdd = () => {
    setForm({ locationId: '', locationName: '', itemCode: '', itemName: '', uom: 'KG' })
    setRmSearch(''); setMsg({ type: '', text: '' }); setShowForm(true)
  }

  const save = async () => {
    if (!form.locationId || !form.locationName || !form.itemCode)
      return setMsg({ type: 'error', text: 'Location ID, name and item are required' })
    setSaving(true); setMsg({ type: '', text: '' })
    try {
      await bulkApi.createLocation(form)
      setShowForm(false); load()
      setMsg({ type: 'success', text: `Location ${form.locationId} created successfully` })
    } catch (e) { setMsg({ type: 'error', text: e.message }) }
    setSaving(false)
  }

  const deleteLocation = async (locationId) => {
    if (!confirm(`Delete location ${locationId}? Only allowed if no active stock.`)) return
    try { await bulkApi.deleteLocation(locationId); load() }
    catch (e) { alert(e.message) }
  }

  const startCamera = async () => {
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      videoRef.current.onloadedmetadata = () => { videoRef.current.play(); scanningRef.current = true; scanLoop() }
    } catch (e) { setMsg({ type: 'error', text: 'Camera: ' + e.message }); setScanning(false) }
  }

  const stopCamera = () => {
    scanningRef.current = false
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    setScanning(false)
  }

  const scanLoop = useCallback(() => {
    if (!scanningRef.current) return
    requestAnimationFrame(async () => {
      const video = videoRef.current; const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) { if (scanningRef.current) scanLoop(); return }
      const ctx = canvas.getContext('2d')
      canvas.width = video.videoWidth; canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)
      const img  = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(img.data, img.width, img.height)
      const now  = Date.now()
      if (code?.data && now - lastScanTime.current > 2000) {
        lastScanTime.current = now
        const locationId = code.data.startsWith('LOC:') ? code.data.slice(4) : code.data
        try {
          await bulkApi.getLocation(locationId)
          setExpanded(locationId)
          stopCamera()
        } catch {
          setMsg({ type: 'error', text: `Location "${locationId}" not found` })
        }
      }
      if (scanningRef.current) scanLoop()
    })
  }, [])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Location Master</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage physical rack/shelf locations for bulk items — each gets a scannable QR
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Button
            variant={scanning ? 'danger-solid' : 'outline-gray'}
            icon={scanning ? Square : Camera}
            onClick={scanning ? stopCamera : startCamera}
            size="sm"
          >
            {scanning ? 'Stop Scanner' : 'Scan QR'}
          </Button>
          <Button variant="success" icon={Plus} onClick={openAdd} size="sm">New Location</Button>
          <BackButton />
        </div>
      </div>

      {msg.text && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      {/* Workflow info card */}
      <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
        <p className="font-semibold mb-1">📦 Bulk Tracking Workflow</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs mt-2">
          {[
            ['1. Create Location', 'Create a location ID (LOC-001) for a shelf/rack assigned to one bulk item'],
            ['2. Print & Affix QR', 'Print the location QR label and stick it on the physical rack/shelf'],
            ['3. Bulk Inward',      'Go to Inward → Bulk tab → scan location QR → enter lot details (supplier, qty)'],
            ['4. Bulk Outward',     'Go to Outward → scan location QR → see all lots → select which lot → issue qty'],
          ].map(([title, desc]) => (
            <div key={title} className="bg-white border border-emerald-100 rounded-lg px-3 py-2">
              <p className="font-semibold text-emerald-700">{title}</p>
              <p className="text-gray-600 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {scanning && <QRScanner videoRef={videoRef} canvasRef={canvasRef} />}

      {loading ? <p className="text-gray-400">Loading...</p> : (
        <div className="space-y-3">
          {locations.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
              <p className="text-lg">No locations yet</p>
              <p className="text-sm mt-1">Create a location to start bulk tracking</p>
            </div>
          ) : locations.slice((page - 1) * limit, page * limit).map(loc => (
            <LocationCard
              key={loc.locationId}
              loc={loc}
              isOpen={expanded === loc.locationId}
              onToggle={() => setExpanded(expanded === loc.locationId ? null : loc.locationId)}
              onDelete={deleteLocation}
            />
          ))}
          <Pagination page={page} total={locations.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
        </div>
      )}

      {showForm && (
        <LocationForm
          msg={msg}
          form={form}
          onChange={(field, val) => setForm(f => ({ ...f, [field]: val }))}
          rmSearch={rmSearch}
          setRmSearch={setRmSearch}
          showRmDrop={showRmDrop}
          setShowRmDrop={setShowRmDrop}
          rmOptions={rmOptions}
          saving={saving}
          onSelectRm={selectRm}
          onSave={save}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
