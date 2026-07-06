import { Check, X } from 'lucide-react'
import { Button } from '../../../../../components/ui'
import { CANONICAL_UNITS } from '../../../../../utils/uom.js'

export default function LocationForm({ msg, form, onChange, rmSearch, setRmSearch, showRmDrop, setShowRmDrop, rmOptions, saving, onSelectRm, onSave, onClose }) {
  return (
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
              <input
                value={form.locationId}
                onChange={e => onChange('locationId', e.target.value.toUpperCase())}
                placeholder="LOC-001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location Name *</label>
              <input
                value={form.locationName}
                onChange={e => onChange('locationName', e.target.value)}
                placeholder="Shelf A, Rack 2"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Item search with dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Item (Bulk) *</label>
            <input
              value={rmSearch}
              onChange={e => { setRmSearch(e.target.value); setShowRmDrop(true); onChange('itemCode', ''); onChange('itemName', '') }}
              onFocus={() => setShowRmDrop(true)}
              onBlur={() => setTimeout(() => setShowRmDrop(false), 150)}
              placeholder="Search item name..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
            />
            {showRmDrop && rmOptions.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                {rmOptions.map(rm => (
                  <button key={rm.itemCode} type="button" onMouseDown={() => onSelectRm(rm)}
                    className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm border-b border-gray-50">
                    <span className="font-medium">{rm.itemName}</span>
                    <span className="text-gray-400 ml-2 text-xs">{rm.itemCode}</span>
                    {rm.trackingType === 'BULK' && (
                      <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 rounded">BULK</span>
                    )}
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
            <select
              value={form.uom}
              onChange={e => onChange('uom', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
            >
              {/* No accompanying quantity on this form to convert — this is
                  the canonical unit every lot entry at this location gets
                  stored in, so only offer the 3 the database stores. */}
              {CANONICAL_UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <Button variant="success" icon={Check} onClick={onSave} disabled={saving} loading={saving} fullWidth>
            {saving ? 'Creating...' : 'Create Location'}
          </Button>
          <Button variant="secondary" icon={X} onClick={onClose} fullWidth>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
