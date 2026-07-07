import { useState, useCallback } from 'react'
import { outwardApi } from '../../../../../../api/inventory.js'
import { Button, IconButton } from '../../../../../../components/ui'
import QRScanner from '../../../../../../components/QRScanner/QRScanner.jsx'
import { Camera } from 'lucide-react'
import './WarehouseToWarehouse.css'

const WAREHOUSES = ['Main Store', 'Cold Store', 'RM Store', 'FG Store', 'Quarantine Store']

export default function WarehouseToWarehouse() {
  const [packId, setPackId]     = useState('')
  const [packInfo, setPackInfo] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [from, setFrom]         = useState('')
  const [to, setTo]             = useState('')
  const [remarks, setRemarks]   = useState('')
  const [submitting, setSub]    = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [showScanner, setShowScanner] = useState(false)

  // Looks up a pack directly by its packId (as scanned from the QR code or
  // typed in) via a dedicated single-pack endpoint — no more guessing an RM
  // code out of the packId string and querying that item's "available
  // packs" list, which is what silently broke this before.
  const lookupPackById = useCallback(async (id) => {
    if (!id) return
    setError(''); setSuccess(''); setPackInfo(null)
    setLoading(true)
    try {
      const r = await outwardApi.getPack(id)
      const data = r.data
      setPackInfo(data)
      setFrom(data.warehouse || '')
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const lookupPack = () => lookupPackById(packId.trim())

  const onQRScan = useCallback((value) => {
    setShowScanner(false)
    const id = value.trim()
    setPackId(id)
    lookupPackById(id)
  }, [lookupPackById])

  const submit = async () => {
    if (!packId.trim() || !to) { setError('Pack ID and destination warehouse required'); return }
    setSub(true); setError(''); setSuccess('')
    try {
      const r = await outwardApi.warehouseTransfer({ packId: packId.trim(), fromWarehouse: from, toWarehouse: to, remarks })
      setSuccess(r.message || 'Transfer recorded')
      setPackId(''); setPackInfo(null); setFrom(''); setTo(''); setRemarks('')
    } catch (e) { setError(e.response?.data?.error || e.message) }
    finally { setSub(false) }
  }

  return (
    <div className="p-4 md:p-6 max-w-lg">
      {showScanner && (
        <QRScanner
          label="Scan Pack QR Code"
          onScan={onQRScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      <p className="text-sm text-gray-500 mb-5">
        Move a pack from one warehouse/location to another. Stock quantity remains the same — only the location is updated.
      </p>

      {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{success}</div>}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Pack ID *</label>
          <div className="flex gap-2">
            <IconButton icon={Camera} onClick={() => setShowScanner(true)} tooltip="Scan pack QR code" variant="purple" size="md" />
            <input
              value={packId}
              onChange={e => setPackId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && lookupPack()}
              placeholder="e.g. AZO-AZOS-2026-001-001"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={lookupPack} disabled={loading} loading={loading} variant="secondary" size="sm">
              Lookup
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Scan the bag's QR code to auto-fill its current warehouse below.
          </p>
          {packInfo && (
            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm">
              <span className="font-medium text-blue-800">{packInfo.itemName}</span>
              <span className="text-blue-600 ml-2">· Lot: {packInfo.lotNo} · Bag #{packInfo.bagNo} · {packInfo.remainingQty} {packInfo.uom} available</span>
              {packInfo.warehouse && <span className="text-blue-600 ml-2">· Currently in: {packInfo.warehouse}</span>}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">From Warehouse</label>
          <input
            value={from}
            onChange={e => setFrom(e.target.value)}
            disabled={!!packInfo?.warehouse}
            placeholder="Current location (optional)"
            list="wh-list-from"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <datalist id="wh-list-from">
            {WAREHOUSES.map(w => <option key={w} value={w} />)}
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">To Warehouse *</label>
          <input
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="Destination warehouse"
            list="wh-list-to"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <datalist id="wh-list-to">
            {WAREHOUSES.map(w => <option key={w} value={w} />)}
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Remarks</label>
          <input
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Optional reason for transfer"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <Button onClick={submit} disabled={submitting || !packId.trim() || !to} loading={submitting} variant="primary" fullWidth>
          {submitting ? 'Recording…' : 'Record Warehouse Transfer'}
        </Button>
      </div>
    </div>
  )
}
