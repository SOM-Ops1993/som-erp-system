import { useState, useEffect } from 'react'
import { rmApi } from '../api/client.js'

const TRACKING_BADGE = {
  PACK: 'bg-blue-100 text-blue-700',
  BULK: 'bg-green-100 text-green-700',
}

export default function ItemMaster() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ itemCode: '', itemName: '', uom: 'KG', trackingType: 'PACK' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const res = await rmApi.list({ search })
      setItems(res.data || [])
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search])

  const openAdd = () => {
    setEditing(null)
    setForm({ itemCode: '', itemName: '', uom: 'KG', trackingType: 'PACK' })
    setShowForm(true); setMsg('')
  }
  const openEdit = (item) => {
    setEditing(item)
    setForm({ itemCode: item.itemCode, itemName: item.itemName, uom: item.uom, trackingType: item.trackingType || 'PACK' })
    setShowForm(true); setMsg('')
  }

  const save = async () => {
    if (!form.itemCode || !form.itemName || !form.uom) { setMsg('All fields required'); return }
    setSaving(true); setMsg('')
    try {
      if (editing) await rmApi.update(form.itemCode, { itemName: form.itemName, uom: form.uom, trackingType: form.trackingType })
      else await rmApi.create(form)
      setShowForm(false); load()
    } catch (e) { setMsg(e.message) } finally { setSaving(false) }
  }

  const del = async (code) => {
    if (!confirm(`Delete ${code}? This cannot be undone.`)) return
    try { await rmApi.delete(code); load() } catch (e) { alert(e.message) }
  }

  const visibleItems = items.filter(i => filterType === 'ALL' || (i.trackingType || 'PACK') === filterType)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Item Master</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage item codes, names and units ·{' '}
            <span className="text-blue-600 font-medium">PACK</span> = individual QR per bag ·{' '}
            <span className="text-green-600 font-medium">BULK</span> = location QR (bags/labels/consumables in bulk)
          </p>
        </div>
        <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
          + Add New Item
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <input type="text" placeholder="Search by name or code..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 w-72 focus:ring-2 focus:ring-blue-500 outline-none" />
        <div className="flex border border-gray-300 rounded-lg overflow-hidden">
          {['ALL','PACK','BULK'].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-4 py-2 text-sm font-medium transition ${filterType === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-gray-500">Loading...</p> : error ? <p className="text-red-500">{error}</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Item Code</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Item Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">UOM</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Tracking Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Added On</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No items found. Click "Add New Item" to start.</td></tr>
              ) : visibleItems.map(item => (
                <tr key={item.itemCode} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-blue-700 font-medium">{item.itemCode}</td>
                  <td className="px-4 py-3">{item.itemName}</td>
                  <td className="px-4 py-3"><span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700">{item.uom}</span></td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TRACKING_BADGE[item.trackingType || 'PACK']}`}>
                      {item.trackingType || 'PACK'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(item.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => openEdit(item)} className="text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50">Edit</button>
                    <button onClick={() => del(item.itemCode)} className="text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 bg-gray-50 border-t text-xs text-gray-400">
            {items.length} total items · {items.filter(i => (i.trackingType || 'PACK') === 'PACK').length} PACK · {items.filter(i => i.trackingType === 'BULK').length} BULK
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-1">{editing ? 'Edit Item' : 'Add New Item'}</h2>
            <p className="text-xs text-gray-400 mb-4">
              PACK: individual QR label per bag/pack · BULK: single location QR tracks multiple lots (for cartons, bags in large quantities, labels, foils)
            </p>
            {msg && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-3 text-sm">{msg}</div>}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Code *</label>
                <input value={form.itemCode} onChange={e => setForm(f => ({ ...f, itemCode: e.target.value.toUpperCase() }))}
                  disabled={!!editing} placeholder="e.g. 151464"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                <input value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))}
                  placeholder="e.g. PP Bags 50 kg"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UOM *</label>
                  <select value={form.uom} onChange={e => setForm(f => ({ ...f, uom: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                    {['KG', 'G', 'L', 'ML', 'NOS', 'MT', 'BAG'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Type *</label>
                  <select value={form.trackingType} onChange={e => setForm(f => ({ ...f, trackingType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="PACK">PACK — QR per bag</option>
                    <option value="BULK">BULK — Location QR</option>
                  </select>
                </div>
              </div>
              {form.trackingType === 'BULK' && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800">
                  📦 After saving, go to <strong>Location Master</strong> to create a shelf/rack location for this item and print its QR label.
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Item'}
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
