import { useState, useCallback } from 'react'
import { containerApi, outwardApi, packsApi } from '../../../../../../api/inventory.js'
import { useQrScanner } from '../../../../../../hooks/useQrScanner.js'
import { Button, IconButton } from '../../../../../../components/ui'
import { X } from 'lucide-react'
import './WarehouseToContainer.css'

export default function WarehouseToContainer() {
  const [selectedPack, setPack]      = useState(null)   // the scanned/chosen bag
  const [container,    setContainer] = useState(null)   // auto-detected container
  const [availPacks,   setAvailPacks] = useState([])    // other available bags for same RM
  const [packInput,    setPackInput] = useState('')
  const [qty,          setQty]       = useState('')
  const [loading,      setLoading]   = useState(false)
  const [submitting,   setSub]       = useState(false)
  const [error,        setError]     = useState('')
  const [success,      setSuccess]   = useState('')

  // "?"? QR scanner for the bag "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?
  const onBagScan = useCallback((raw) => {
    const id = raw.startsWith('PACK:') ? raw.slice(5) : raw
    bagScanner.stop()
    loadBag(id.trim())
  }, [])
  const bagScanner = useQrScanner(onBagScan)

  // "?"? Load bag → auto-detect container "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?
  const loadBag = async (packId) => {
    if (!packId) return
    setError(''); setSuccess(''); setPack(null); setContainer(null); setAvailPacks([]); setQty('')
    setLoading(true)
    try {
      // 1. Get pack details
      const packRes = await packsApi.get(packId)
      const pack    = packRes.data
      if (!pack) { setError(`Bag "${packId}" not found.`); return }

      const itemCode = pack.itemCode

      // 2. Auto-detect container for this RM (each RM has one container)
      const contRes  = await containerApi.list({ itemCode })
      const contList = contRes.data || []
      if (contList.length === 0) {
        setError(`No container found for "${pack.itemName || itemCode}". Create one first.`)
        return
      }
      const cont = contList[0]

      // 3. Load available packs for this RM (for fallback list)
      const packsRes = await outwardApi.availablePacks(itemCode)
      const packs    = packsRes.data || []

      // Check scanned bag is actually available (has remaining qty)
      const bagBalance = packs.find(p => p.packId === packId)
      if (!bagBalance) {
        setError(`Bag "${packId}" has no remaining quantity or is not inwarded.`)
        return
      }

      const spaceLeft = cont.capacity - cont.currentQty
      setContainer(cont)
      setAvailPacks(packs)
      setPack(bagBalance)
      setQty(String(Math.min(bagBalance.remainingQty, spaceLeft).toFixed(3)))
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to load bag.')
    } finally {
      setLoading(false)
    }
  }

  // "?"? Submit fill "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?
  const submit = async () => {
    const q = parseFloat(qty)
    if (!q || q <= 0) { setError('Enter a valid quantity'); return }
    setSub(true); setError(''); setSuccess('')
    try {
      const r = await containerApi.fill(container.containerId, { packId: selectedPack.packId, qty: q })
      setSuccess(
        `Filled ${r.filled} ${container.uom} into ${container.containerId}. ` +
        `Level: ${r.data.currentQty} / ${r.data.capacity} ${r.data.uom}`
      )
      // Reset for next fill
      setPack(null); setContainer(null); setAvailPacks([]); setQty(''); setPackInput('')
    } catch (e) { setError(e.response?.data?.error || e.message) }
    finally { setSub(false) }
  }

  const reset = () => {
    setPack(null); setContainer(null); setAvailPacks([]); setQty('')
    setPackInput(''); setError(''); bagScanner.stop()
  }

  const spaceLeft = container ? container.capacity - container.currentQty : 0

  return (
    <div className="p-4 md:p-6 max-w-xl">

      {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{success}</div>}
      {bagScanner.camError && <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-4 text-sm">{bagScanner.camError}</div>}

      {/* "?"? Step 1: Scan bag — shown when no bag selected yet "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"? */}
      {!selectedPack && (
        <div>
          <p className="text-sm text-gray-500 mb-5">
            Scan a bag QR code — the container will be detected automatically.
          </p>

          {/* Camera */}
          <div className={`bg-black rounded-xl overflow-hidden relative mb-4 wtc-camera-wrap ${bagScanner.active ? 'block' : 'hidden'}`}>
            <video ref={bagScanner.videoRef} className="w-full h-full object-cover" playsInline muted />
            <canvas ref={bagScanner.canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-40 border-2 border-orange-400 rounded-lg" />
            </div>
            <div className="absolute bottom-2 left-0 right-0 text-center text-white text-xs bg-black/50 py-1">
              Point at bag QR code
            </div>
          </div>

          {/* Scan button */}
          <Button
            onClick={bagScanner.active ? bagScanner.stop : bagScanner.start}
            variant={bagScanner.active ? 'danger' : 'warning'}
            fullWidth
            className="mb-4">
            {bagScanner.active ? '-  Stop Camera' : 'Scan Bag QR'}
          </Button>

          {/* Manual entry */}
          <div className="flex gap-2">
            <input
              value={packInput}
              onChange={e => setPackInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadBag(packInput.trim())}
              placeholder="Or enter pack ID manually?"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-orange-400"
            />
            <Button
              onClick={() => loadBag(packInput.trim())}
              disabled={loading || !packInput.trim()}
              loading={loading}
              variant="secondary"
              size="sm">
              {loading ? '?' : 'Load'}
            </Button>
          </div>
        </div>
      )}

      {/* "?"? Step 2: Bag + container auto-detected "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"? */}
      {selectedPack && container && (
        <div className="space-y-4">

          {/* Container card (auto-detected) */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-[10px] font-semibold text-orange-400 uppercase tracking-widest mb-0.5">
                  Container · Auto-detected
                </div>
                <div className="font-bold text-orange-900 font-mono">{container.containerId}</div>
                <div className="text-sm text-orange-700 mt-0.5">
                  {container.itemName}
                  <span className="text-xs font-mono text-orange-400 ml-1.5">({container.itemCode})</span>
                </div>
              </div>
              <Button onClick={reset} variant="outline-gray" size="xs">Reset</Button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ['Current',    container.currentQty,   'text-gray-800'],
                ['Space Left', spaceLeft.toFixed(2),   'text-blue-700'],
                ['Capacity',   container.capacity,     'text-gray-400'],
              ].map(([l, v, c]) => (
                <div key={l} className="bg-white rounded-lg py-2">
                  <div className={`font-bold text-sm ${c}`}>{v}</div>
                  <div className="text-[10px] text-gray-400">{l} ({container.uom})</div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected bag */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest mb-0.5">Selected Bag</div>
              <div className="font-mono text-sm font-semibold text-blue-900 truncate">{selectedPack.packId}</div>
              <div className="text-xs text-blue-600 mt-0.5">
                Lot: {selectedPack.lotNo} · Bag #{selectedPack.bagNo} ·
                Available: <strong>{selectedPack.remainingQty} {container.uom}</strong>
              </div>
            </div>
            <IconButton icon={X} onClick={reset} variant="ghost" size="sm" tooltip="Clear" className="flex-shrink-0" />
          </div>

          {/* Other available bags (optional swap) */}
          {availPacks.length > 1 && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Switch to a different bag:</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                {availPacks
                  .filter(p => p.packId !== selectedPack.packId)
                  .map(p => (
                    <button key={p.packId}
                      onClick={() => {
                        setPack(p)
                        setQty(String(Math.min(p.remainingQty, spaceLeft).toFixed(3)))
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg border border-gray-100 hover:bg-orange-50 hover:border-orange-200 transition text-sm">
                      <div className="font-mono text-xs text-gray-700 truncate">{p.packId}</div>
                      <div className="flex justify-between mt-0.5 text-xs text-gray-500">
                        <span>Lot: {p.lotNo} · Bag #{p.bagNo}</span>
                        <span className="font-semibold text-emerald-700">{p.remainingQty} {container.uom}</span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Qty + submit */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex gap-4 text-xs text-gray-500 mb-3">
              <span>Space left: <strong className="text-blue-700">{spaceLeft.toFixed(3)} {container.uom}</strong></span>
              <span>·</span>
              <span>Bag has: <strong className="text-emerald-700">{selectedPack.remainingQty} {container.uom}</strong></span>
            </div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Qty to Fill *</label>
            <input
              type="number" min="0.001" step="0.001"
              max={Math.min(selectedPack.remainingQty, spaceLeft)}
              value={qty} onChange={e => setQty(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 mb-3"
            />
            <Button onClick={submit} disabled={submitting || !qty} loading={submitting} variant="warning" fullWidth>
              {submitting ? 'Filling?' : 'Fill Container'}
            </Button>
          </div>

        </div>
      )}

    </div>
  )
}
