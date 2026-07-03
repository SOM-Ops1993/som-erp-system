import { Save, X } from 'lucide-react'
import { Button } from '../../../../../components/ui'
import './RmForm.css'

export default function RmForm({ editing, form, onChange, saving, msg, onSave, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-1">{editing ? 'Edit Item' : 'Add New Item'}</h2>
        <p className="text-xs text-gray-400 mb-4">
          PACK: individual QR label per bag/pack · BULK: single location QR tracks multiple lots
        </p>
        {msg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-3 text-sm">{msg}</div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Code *</label>
            <input
              value={form.itemCode}
              onChange={e => onChange('itemCode', e.target.value.toUpperCase())}
              disabled={!!editing}
              placeholder="e.g. 151464"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
            <input
              value={form.itemName}
              onChange={e => onChange('itemName', e.target.value)}
              placeholder="e.g. PP Bags 50 kg"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UOM *</label>
              <select
                value={form.uom}
                onChange={e => onChange('uom', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {['KG', 'G', 'L', 'ML', 'NOS', 'MT', 'BAG'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Type *</label>
              <select
                value={form.trackingType}
                onChange={e => onChange('trackingType', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="PACK">PACK — QR per bag</option>
                <option value="BULK">BULK — Location QR</option>
              </select>
            </div>
          </div>

          {form.trackingType === 'BULK' && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800">
              After saving, go to <strong>Location Master</strong> to create a shelf/rack location for this item.
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-5">
          <Button variant="primary" icon={Save} onClick={onSave} disabled={saving} loading={saving} fullWidth>
            {saving ? 'Saving...' : 'Save Item'}
          </Button>
          <Button variant="secondary" icon={X} onClick={onClose} fullWidth>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
