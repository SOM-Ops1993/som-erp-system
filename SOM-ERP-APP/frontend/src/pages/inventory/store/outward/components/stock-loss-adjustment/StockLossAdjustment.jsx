import { useState, useCallback } from 'react'
import { outwardApi, packsApi } from '../../../../../../api/inventory.js'
import { useQrScanner } from '../../../../../../hooks/useQrScanner.js'
import { Button, IconButton } from '../../../../../../components/ui'
import { X } from 'lucide-react'
import './StockLossAdjustment.css'


const REASONS = [
  'Production spillage',
  'Damaged / broken bag',
  'Moisture loss / evaporation',
  'Quality rejection',
  'Weighing error correction',
  'Other',
]

export default function StockLossAdjustment() {
  const [pack,       setPack]       = useState(null)
  const [packInput,  setPackInput]  = useState('')
  const [lossQty,    setLossQty]    = useState('')
  const [reason,     setReason]     = useState('')
  const [customReason, setCustomReason] = useState('')
  const [loading,    setLoading]    = useState(false)
  const [submitting, setSub]        = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')

  // "?"? QR scanner "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?
  const onScan = useCallback((raw) => {
    const id = raw.startsWith('PACK:') ? raw.slice(5) : raw
    scanner.stop()
    loadPack(id.trim())
  }, [])
  const scanner = useQrScanner(onScan)

  // "?"? Load pack by ID "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?
  const loadPack = async (packId) => {
    if (!packId) return
    setError(''); setSuccess(''); setPack(null); setLossQty(''); setReason(''); setCustomReason('')
    setLoading(true)
    try {
      const r = await packsApi.get(packId)
      if (!r.data) { setError(`Pack "${packId}" not found.`); return }

      // packsApi.get returns PrintMaster — get balance via availablePacks
      const balRes = await outwardApi.availablePacks(r.data.itemCode)

      const balance = (balRes.data || []).find(p => p.packId === packId)
      if (!balance) {
        setError(`Bag "${packId}" has no remaining quantity — already exhausted.`)
        return
      }
      setPack({ ...r.data, remainingQty: balance.remainingQty })
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to load pack.')
    } finally {
      setLoading(false)
    }
  }

  // "?"? Submit adjustment "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?
  const submit = async () => {
    const loss = parseFloat(lossQty)
    const finalReason = reason === 'Other' ? customReason.trim() : reason
    if (!pack)                          { setError('Scan or enter a bag first');      return }
    if (!loss || loss <= 0)             { setError('Enter a valid loss quantity');     return }
    if (loss > pack.remainingQty)       { setError(`Loss exceeds remaining qty (${pack.remainingQty})`); return }
    if (!finalReason || finalReason.length < 3) { setError('Select or enter a reason'); return }

    setSub(true); setError(''); setSuccess('')
    try {
      const r = await outwardApi.lossAdjustment({ packId: pack.packId, lossQty: loss, reason: finalReason })
      setSuccess(
        `Adjusted: ${loss} ${pack.uom} deducted from ${pack.packId}. ` +
        `Remaining: ${r.newRemaining} ${pack.uom} · Status: ${r.newStatus.replace('_', ' ')}`
      )
      setPack(null); setLossQty(''); setReason(''); setCustomReason(''); setPackInput('')
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setSub(false)
    }
  }

  const reset = () => {
    setPack(null); setLossQty(''); setReason(''); setCustomReason('')
    setPackInput(''); setError(''); scanner.stop()
  }

  return (
    <div className="p-4 md:p-6 max-w-xl">

      {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{success}</div>}
      {scanner.camError && <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-4 text-sm">{scanner.camError}</div>}

      {/* "?"? Step 1: Scan bag "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"? */}
      {!pack && (
        <div>
          <p className="text-sm text-gray-500 mb-5">
            Scan the bag QR code to record a stock loss against that specific bag.
          </p>

          {/* Camera */}
          <div className={`bg-black rounded-xl overflow-hidden relative mb-4 sla-camera-wrap ${scanner.active ? 'block' : 'hidden'}`}>
            <video ref={scanner.videoRef} className="w-full h-full object-cover" playsInline muted />
            <canvas ref={scanner.canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-40 border-2 border-red-400 rounded-lg" />
            </div>
            <div className="absolute bottom-2 left-0 right-0 text-center text-white text-xs bg-black/50 py-1">
              Point at bag QR code
            </div>
          </div>

          <Button
            onClick={scanner.active ? scanner.stop : scanner.start}
            variant={scanner.active ? 'danger' : 'danger-solid'}
            fullWidth
            className="mb-4">
            {scanner.active ? '-  Stop Camera' : 'Scan Bag QR'}
          </Button>

          <div className="flex gap-2">
            <input
              value={packInput}
              onChange={e => setPackInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadPack(packInput.trim())}
              placeholder="Or enter pack ID manually?"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-red-400"
            />
            <Button
              onClick={() => loadPack(packInput.trim())}
              disabled={loading || !packInput.trim()}
              loading={loading}
              variant="secondary"
              size="sm">
              {loading ? '?' : 'Load'}
            </Button>
          </div>
        </div>
      )}

      {/* "?"? Step 2: Pack loaded — enter loss "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"? */}
      {pack && (
        <div className="space-y-4">

          {/* Pack info card */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-red-400 uppercase tracking-widest mb-0.5">Selected Bag</div>
                <div className="font-mono text-sm font-bold text-red-900 truncate">{pack.packId}</div>
                <div className="text-sm text-red-700 mt-0.5 font-medium truncate">{pack.itemName}</div>
                <div className="text-xs text-red-500 mt-0.5">
                  Lot: {pack.lotNo} · Bag #{pack.bagNo} · Supplier: {pack.supplier || '—'}
                </div>
              </div>
              <IconButton icon={X} onClick={reset} variant="danger" size="sm" tooltip="Clear" className="flex-shrink-0" />
            </div>

            {/* Available qty bar */}
            <div className="mt-3 bg-white rounded-lg px-3 py-2.5">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-500 font-medium">Remaining Qty</span>
                <span className="font-bold text-gray-800">{pack.remainingQty} {pack.uom}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (pack.remainingQty / (pack.packQty || pack.remainingQty)) * 100)}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>0</span>
                <span>Original: {pack.packQty || '—'} {pack.uom}</span>
              </div>
            </div>
          </div>

          {/* Loss quantity */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Loss Quantity * <span className="text-xs font-normal text-gray-400">(max {pack.remainingQty} {pack.uom})</span>
            </label>
            <input
              type="number" min="0.001" step="0.001" max={pack.remainingQty}
              value={lossQty}
              onChange={e => setLossQty(e.target.value)}
              placeholder={`0.000 ${pack.uom}`}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400"
            />
            {lossQty && !isNaN(parseFloat(lossQty)) && parseFloat(lossQty) > 0 && parseFloat(lossQty) <= pack.remainingQty && (
              <p className="text-xs text-gray-400 mt-1.5">
                After adjustment: <strong className="text-gray-700">{(pack.remainingQty - parseFloat(lossQty)).toFixed(3)} {pack.uom}</strong> remaining
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reason *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              {REASONS.map(r => (
                <button key={r} onClick={() => setReason(r)}
                  className={`text-xs px-3 py-2 rounded-lg border text-left transition ${
                    reason === r
                      ? 'bg-red-500 border-red-500 text-white font-semibold'
                      : 'border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
            {reason === 'Other' && (
              <input
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Describe the reason?"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400"
              />
            )}
          </div>

          {/* Submit */}
          <Button
            onClick={submit}
            disabled={submitting || !lossQty || !reason || (reason === 'Other' && !customReason.trim())}
            loading={submitting}
            variant="danger-solid"
            fullWidth>
            {submitting ? 'Adjusting?' : 'Record Stock Loss'}
          </Button>

        </div>
      )}
    </div>
  )
}
