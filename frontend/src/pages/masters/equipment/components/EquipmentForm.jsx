export default function EquipmentForm({ editing, form, onChange, saving, msg, onSave, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Equipment' : 'Add Equipment'}</h2>
        {msg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-3 text-sm">{msg}</div>
        )}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Name *</label>
            <input
              value={form.equipName}
              onChange={e => onChange('equipName', e.target.value)}
              placeholder="e.g. Fermenter Tank A"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plant</label>
            <input
              value={form.plant}
              onChange={e => onChange('plant', e.target.value)}
              placeholder="e.g. Plant A"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onSave} disabled={saving}
            className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={onClose} className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
