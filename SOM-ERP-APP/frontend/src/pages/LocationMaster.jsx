/**
 * LocationMaster — Bulk Location QR Management
 *
 * Purpose: Create and manage physical shelf/rack/bin locations for BULK items.
 * Each location gets a printable QR code. Scanning that QR during inward or
 * outward shows all lot entries (with quantities) at that location.
 *
 * Workflow:
 *   1. User creates a location (LOC-001, "Shelf A1") and assigns it to an item.
 *   2. Prints the location QR label and sticks it to the physical rack/shelf.
 *   3. During Bulk Inward: scan location QR → enter lot details → lot is linked.
 *   4. During Bulk Outward: scan location QR → see all lots → select → issue.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { bulkApi, rmApi } from '../api/client.js'
import jsQR from 'jsqr'

const STATUS_COLOR = {
  ACTIVE:    'bg-green-100 text-green-800',
  EXHAUSTED: 'bg-gray-100 text-gray-500',
}

export default function LocationMaster() {
  const [locations, setLocations]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [rmList, setRmList]             = useState([])
  const [showForm, setShowForm]         = useState(false)
  const [expanded, setExpanded]         = useState(null)   // locationId
  const [msg, setMsg]                   = useState({ type: '', text: '' })

  // Create form
  const [form, setForm] = useState({ locationId: '', locationName: '', itemCode: '', itemName: '', uom: 'KG' })
  const [rmSearch, setRmSearch]         = useState('')
  const [showRmDrop, setShowRmDrop]     = useState(false)
  const [saving, setSaving]             = useState(false)

  // QR Scanner (to look up a location by scanning)
  const [scanning, setScanning]         = useState(false)
  const [scanResult, setScanResult]     = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const scanningRef = useRef(false)

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
  // fallback: if no BULK items, show all
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

  // ── QR Scanner ──────────────────────────────────────────────────────────
  const startCamera = async () => {
    setScanning(true); setScanResult(null)
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

  const lastScanTime = useRef(0)
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
      if (code?.data && now - lastScanTime.current > 2000) {
        lastScanTime.current = now
        const raw = code.data
        const locationId = raw.startsWith('LOC:') ? raw.slice(4) : raw
        try {
          const res = await bulkApi.getLocation(locationId)
          setScanResult(res.data)
          setExpanded(locationId)
          stopCamera()
        } catch {
          setMsg({ type: 'error', text: `Location "${locationId}" not found` })
        }
      }
      if (scanningRef.current) scanLoop()
    })
  }, [])

  const totalActive = (loc) =>
    (loc.lotEntries || []).filter(e => e.status === 'ACTIVE').reduce((s, e) => s + e.remainingQty, 0)

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
        <div className="flex gap-2">
          <button onClick={scanning ? stopCamera : startCamera}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${scanning ? 'bg-red-500 text-white hover:bg-red-600' : 'border border-gray-300 hover:bg-gray-50'}`}>
            {scanning ? '⏹ Stop Scanner' : '📷 Scan QR'}
          </button>
          <button onClick={openAdd}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium text-sm">
            + New Location
          </button>
        </div>
      </div>

      {msg.text && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      {/* How it works */}
      <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
        <p className="font-semibold mb-1">📦 Bulk Tracking Workflow</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs mt-2">
          {[
            ['1. Create Location', 'Create a location ID (LOC-001) for a shelf/rack assigned to one bulk item'],
            ['2. Print & Affix QR', 'Print the location QR label and stick it on the physical rack/shelf'],
            ['3. Bulk Inward', 'Go to Inward → Bulk tab → scan location QR → enter lot details (supplier, qty)'],
            ['4. Bulk Outward', 'Go to Outward → scan location QR → see all lots → select which lot → issue qty'],
          ].map(([title, desc]) => (
            <div key={title} className="bg-white border border-emerald-100 rounded-lg px-3 py-2">
              <p className="font-semibold text-emerald-700">{title}</p>
              <p className="text-gray-600 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* QR Scanner view */}
      {scanning && (
        <div className="mb-5 bg-black rounded-xl overflow-hidden relative" style={{ maxWidth: 480 }}>
          <video ref={videoRef} className="w-full" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-green-400 rounded-lg" style={{ width: 200, height: 200, boxShadow: '0 0 0 2000px rgba(0,0,0,0.4)' }} />
          </div>
          <p className="absolute bottom-3 w-full text-center text-white text-xs">Point at location QR code</p>
        </div>
      )}

      {/* Location List */}
      {loading ? <p className="text-gray-400">Loading...</p> : (
        <div className="space-y-3">
          {locations.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
              <p className="text-lg">No locations yet</p>
              <p className="text-sm mt-1">Create a location to start bulk tracking</p>
            </div>
          ) : locations.map(loc => {
            const isOpen = expanded === loc.locationId
            const activeQty = totalActive(loc)
            const activeLots = (loc.lotEntries || []).filter(e => e.status === 'ACTIVE')
            const exhaustedLots = (loc.lotEntries || []).filter(e => e.status === 'EXHAUSTED')

            return (
              <div key={loc.locationId}
                className={`bg-white border rounded-xl overflow-hidden ${isOpen ? 'border-green-400 ring-1 ring-green-200' : 'border-gray-200'}`}>
                {/* Location header row */}
                <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpanded(isOpen ? null : loc.locationId)}>
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="bg-green-100 text-green-700 rounded-lg px-3 py-1.5 font-mono font-bold text-sm flex-shrink-0">
                      {loc.locationId}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900">{loc.locationName}</div>
                      <div className="text-sm text-gray-500">{loc.itemName} <span className="font-mono text-xs text-blue-600">[{loc.itemCode}]</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">{activeQty.toFixed(2)}</div>
                      <div className="text-xs text-gray-400">{loc.uom} in stock</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-700">{activeLots.length}</div>
                      <div className="text-xs text-gray-400">active lots</div>
                    </div>
                    <a
                      href={bulkApi.locationLabelUrl(loc.locationId)}
                      target="_blank"
                      onClick={e => e.stopPropagation()}
                      className="border border-green-300 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-50">
                      🖨️ Print QR
                    </a>
                    <button onClick={e => { e.stopPropagation(); deleteLocation(loc.locationId) }}
                      className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50">Del</button>
                    <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded: lot entries */}
                {isOpen && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                      Lot Entries at this Location
                    </h3>
                    {(loc.lotEntries || []).length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No lots yet. Do a Bulk Inward to receive stock here.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Lot No</th>
                              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Supplier</th>
                              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Invoice</th>
                              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Received</th>
                              <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Rcvd Qty</th>
                              <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Remaining</th>
                              <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(loc.lotEntries || []).map(entry => (
                              <tr key={entry.id} className={`border-t border-gray-50 ${entry.status === 'EXHAUSTED' ? 'opacity-50' : ''}`}>
                                <td className="px-3 py-2 font-mono text-xs text-blue-700 font-semibold">{entry.lotNo}</td>
                                <td className="px-3 py-2 text-xs text-gray-600">{entry.supplier || '—'}</td>
                                <td className="px-3 py-2 text-xs text-gray-600">{entry.invoiceNo || '—'}</td>
                                <td className="px-3 py-2 text-xs text-gray-500">
                                  {entry.receivedDate ? new Date(entry.receivedDate).toLocaleDateString('en-IN') : '—'}
                                </td>
                                <td className="px-3 py-2 text-right text-sm">{entry.receivedQty} {loc.uom}</td>
                                <td className={`px-3 py-2 text-right text-sm font-semibold ${entry.remainingQty > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                                  {entry.remainingQty} {loc.uom}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[entry.status] || 'bg-gray-100 text-gray-600'}`}>
                                    {entry.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan={5} className="px-3 py-2 text-xs text-gray-500 font-semibold">Total Active Stock</td>
                              <td className="px-3 py-2 text-right text-sm font-bold text-green-700">{activeQty.toFixed(2)} {loc.uom}</td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Location Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-1">Create Bulk Location</h2>
            <p className="text-xs text-gray-500 mb-4">
              Assign a physical location ID to a bulk item. Print and affix the QR to the rack/shelf.
            </p>

            {msg.type === 'error' && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-3 text-sm">{msg.text}</div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location ID *</label>
                  <input value={form.locationId}
                    onChange={e => setForm(f => ({ ...f, locationId: e.target.value.toUpperCase() }))}
                    placeholder="LOC-001"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500 font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location Name *</label>
                  <input value={form.locationName}
                    onChange={e => setForm(f => ({ ...f, locationName: e.target.value }))}
                    placeholder="Shelf A, Rack 2"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>

              {/* Item selector */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Item (Bulk) *</label>
                <input value={rmSearch}
                  onChange={e => { setRmSearch(e.target.value); setShowRmDrop(true); setForm(f => ({ ...f, itemCode: '', itemName: '' })) }}
                  onFocus={() => setShowRmDrop(true)}
                  onBlur={() => setTimeout(() => setShowRmDrop(false), 150)}
                  placeholder="Search item name..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500" />
                {showRmDrop && rmOptions.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {rmOptions.map(rm => (
                      <button key={rm.itemCode} type="button" onMouseDown={() => selectRm(rm)}
                        className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm border-b border-gray-50">
                        <span className="font-medium">{rm.itemName}</span>
                        <span className="text-gray-400 ml-2 text-xs">{rm.itemCode}</span>
                        {rm.trackingType === 'BULK' && <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 rounded">BULK</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {form.itemCode && (
                <div className="bg-green-50 border border-green-200 px-3 py-2 rounded-lg text-sm text-green-800">
                  ✅ {form.itemName} <span className="font-mono text-xs text-green-600">[{form.itemCode}]</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UOM</label>
                <select value={form.uom} onChange={e => setForm(f => ({ ...f, uom: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500">
                  {['KG', 'G', 'NOS', 'BAG', 'MT', 'L', 'ML'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={save} disabled={saving}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50">
                {saving ? 'Creating...' : '✅ Create Location'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
