import { useState, useEffect } from 'react'
import { equipmentApi } from '../api/client.js'

export default function EquipmentMaster() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ equipName: '', plant: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    try { setLoading(true); const r = await equipmentApi.list(); setItems(r.data || []) }
    catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setEditing(null); setForm({ equipName: '', plant: '' }); setShowForm(true); setMsg('') }
  const openEdit = (item) => { setEditing(item); setForm({ equipName: item.equipName, plant: item.plant }); setShowForm(true); setMsg('') }

  const save = async () => {
    if (!form.equipName) { setMsg('Equipment name is required'); return }
    setSaving(true); setMsg('')
    try {
      if (editing) await equipmentApi.update(editing.equipId, form)
      else await equipmentApi.create(form)
      setShowForm(false); load()
    } catch (e) { setMsg(e.message) } finally { setSaving(false) }
  }

  const del = async (id, name) => {
    if (!confirm(`Delete equipment "${name}"?`)) return
    try { await equipmentApi.delete(id); load() } catch (e) { alert(e.message) }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipment Master</h1>
          <p className="text-sm text-gray-500 mt-1">Manage production equipment for indent selection</p>
        </div>
        <button onClick={openAdd} className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-medium">
          + Add Equipment
        </button>
      </div>

      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Equipment Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Plant</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-10 text-gray-400">No equipment added yet. Click "Add Equipment" to start.</td></tr>
              ) : items.map(item => (
                <tr key={item.equipId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.equipName}</td>
                  <td className="px-4 py-3 text-gray-500">{item.plant || '—'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => openEdit(item)} className="text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50">Edit</button>
                    <button onClick={() => del(item.equipId, item.equipName)} className="text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Equipment' : 'Add Equipment'}</h2>
            {msg && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-3 text-sm">{msg}</div>}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Name *</label>
                <input value={form.equipName} onChange={e => setForm(f => ({ ...f, equipName: e.target.value }))}
                  placeholder="e.g. Fermenter Tank A"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plant</label>
                <input value={form.plant} onChange={e => setForm(f => ({ ...f, plant: e.target.value }))}
                  placeholder="e.g. Plant A"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={save} disabled={saving} className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 font-medium disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
