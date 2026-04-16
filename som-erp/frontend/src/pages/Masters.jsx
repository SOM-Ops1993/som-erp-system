import { useState, useEffect } from 'react'
import { rmApi, productMasterApi } from '../api/client'
import { Database, Plus, Edit2, Trash2, Save, X, RefreshCw, Download } from 'lucide-react'

// ─── RM MASTER ───────────────────────────────────────────────────────────────
function RmMasterTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null) // item being edited
  const [form, setForm] = useState({ itemCode: '', itemName: '', uom: 'Kg', reorderLevel: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const r = await rmApi.list({ q: search || undefined })
      setItems(r.data || [])
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [search])

  const openCreate = () => {
    setEditing(null)
    setForm({ itemCode: '', itemName: '', uom: 'Kg', reorderLevel: '' })
    setError('')
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditing(item.itemCode)
    setForm({
      itemCode: item.itemCode,
      itemName: item.itemName,
      uom: item.uom,
      reorderLevel: item.reorderLevel ? String(item.reorderLevel) : '',
    })
    setError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.itemCode || !form.itemName || !form.uom) {
      setError('Item Code, Name, and UOM are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        itemCode: form.itemCode.toUpperCase().trim(),
        itemName: form.itemName.trim(),
        uom: form.uom.trim(),
        reorderLevel: form.reorderLevel ? parseFloat(form.reorderLevel) : undefined,
      }
      if (editing) {
        await rmApi.update(editing, { itemName: payload.itemName, uom: payload.uom, reorderLevel: payload.reorderLevel })
      } else {
        await rmApi.create(payload)
      }
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  const handleDelete = async (itemCode) => {
    if (!confirm(`Delete RM: ${itemCode}? This cannot be undone.`)) return
    try {
      await rmApi.delete(itemCode)
      load()
    } catch (err) {
      alert('Cannot delete: ' + err.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <input
          type="text" placeholder="Search by code or name…"
          className="input w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={openCreate} className="btn-primary flex items-center gap-1.5">
          <Plus size={15} />Add RM
        </button>
      </div>

      {showForm && (
        <div className="card mb-4 border-2 border-primary/20">
          <h3 className="font-semibold mb-3 text-primary">{editing ? 'Edit RM' : 'Add New Raw Material'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Item Code *</label>
              <input
                className={`input ${editing ? 'bg-gray-50' : ''}`}
                value={form.itemCode}
                disabled={!!editing}
                onChange={(e) => setForm((f) => ({ ...f, itemCode: e.target.value }))}
                placeholder="e.g. RM-001"
              />
            </div>
            <div>
              <label className="label">UOM *</label>
              <select
                className="input"
                value={form.uom}
                onChange={(e) => setForm((f) => ({ ...f, uom: e.target.value }))}
              >
                {['Kg', 'g', 'L', 'mL', 'MT', 'Nos', 'Ltr'].map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Item Name *</label>
              <input
                className="input"
                value={form.itemName}
                onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
                placeholder="e.g. Rhizobium Culture (Carrier)"
              />
            </div>
            <div>
              <label className="label">Reorder Level (optional)</label>
              <input
                type="number" step="0.001" className="input"
                value={form.reorderLevel}
                onChange={(e) => setForm((f) => ({ ...f, reorderLevel: e.target.value }))}
                placeholder="e.g. 50"
              />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm mt-2">⚠ {error}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1.5">
              <Save size={14} />{saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-outline flex items-center gap-1.5">
              <X size={14} />Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-8">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center text-gray-400 py-8">No RM items found. Add one above.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Item Name</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">UOM</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Reorder Level</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.itemCode} className={`border-t ${i % 2 === 0 ? '' : 'bg-gray-50/40'} hover:bg-blue-50/30 transition`}>
                  <td className="px-4 py-2.5 font-mono text-xs text-primary font-semibold">{item.itemCode}</td>
                  <td className="px-4 py-2.5 font-medium">{item.itemName}</td>
                  <td className="px-4 py-2.5 text-center text-gray-500">{item.uom}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">
                    {item.reorderLevel ? Number(item.reorderLevel).toFixed(2) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => openEdit(item)} className="text-blue-500 hover:text-blue-700" title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(item.itemCode)} className="text-red-400 hover:text-red-600" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── PRODUCT MASTER ──────────────────────────────────────────────────────────
function ProductMasterTab() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    productCode: '', productName: '', batchUnit: 'Kg',
    plant: '', equipment: '', category: '', remarks: '',
  })
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const r = await productMasterApi.list()
      setProducts(r.data || [])
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ productCode: '', productName: '', batchUnit: 'Kg', plant: '', equipment: '', category: '', remarks: '' })
    setError('')
    setShowForm(true)
  }

  const openEdit = (p) => {
    setEditing(p.productCode)
    setForm({
      productCode: p.productCode,
      productName: p.productName,
      batchUnit: p.batchUnit || 'Kg',
      plant: p.plant || '',
      equipment: p.equipment || '',
      category: p.category || '',
      remarks: p.remarks || '',
    })
    setError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.productCode || !form.productName) {
      setError('Product Code and Name are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await productMasterApi.update(editing, {
          productName: form.productName,
          batchUnit: form.batchUnit,
          plant: form.plant || null,
          equipment: form.equipment || null,
          category: form.category || null,
          remarks: form.remarks || null,
        })
      } else {
        await productMasterApi.create({
          productCode: form.productCode.toUpperCase().trim(),
          productName: form.productName.trim(),
          batchUnit: form.batchUnit,
          plant: form.plant || null,
          equipment: form.equipment || null,
          category: form.category || null,
          remarks: form.remarks || null,
        })
      }
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  const handleDelete = async (productCode) => {
    if (!confirm(`Delete product: ${productCode}?`)) return
    try {
      await productMasterApi.delete(productCode)
      load()
    } catch (err) { alert('Cannot delete: ' + err.message) }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await productMasterApi.syncFromRecipe()
      alert(res.message)
      load()
    } catch (err) { alert('Sync failed: ' + err.message) }
    setSyncing(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-xs text-gray-400">
          Define plant, equipment defaults per product. These auto-fill in Indent creation.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-outline flex items-center gap-1.5 text-sm"
            title="Import products from Recipe DB"
          >
            <Download size={14} />{syncing ? 'Syncing…' : 'Sync from Recipe DB'}
          </button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-1.5">
            <Plus size={15} />Add Product
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card mb-4 border-2 border-primary/20">
          <h3 className="font-semibold mb-3 text-primary">{editing ? 'Edit Product' : 'Add Product'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Product Code *</label>
              <input
                className={`input ${editing ? 'bg-gray-50' : ''}`}
                value={form.productCode}
                disabled={!!editing}
                onChange={(e) => setForm((f) => ({ ...f, productCode: e.target.value }))}
                placeholder="e.g. RHIZO-LIQ"
              />
            </div>
            <div>
              <label className="label">Batch Unit</label>
              <select
                className="input"
                value={form.batchUnit}
                onChange={(e) => setForm((f) => ({ ...f, batchUnit: e.target.value }))}
              >
                {['Kg', 'L', 'Ltr', 'MT', 'Nos'].map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Product Name *</label>
              <input
                className="input"
                value={form.productName}
                onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
                placeholder="e.g. Rhizobium Liquid Biofertilizer"
              />
            </div>
            <div>
              <label className="label">Default Plant / Line</label>
              <input
                className="input"
                value={form.plant}
                onChange={(e) => setForm((f) => ({ ...f, plant: e.target.value }))}
                placeholder="e.g. MPFU / Line-1"
              />
            </div>
            <div>
              <label className="label">Default Equipment</label>
              <input
                className="input"
                value={form.equipment}
                onChange={(e) => setForm((f) => ({ ...f, equipment: e.target.value }))}
                placeholder="e.g. Fermenter-2 / Dryer-A"
              />
            </div>
            <div>
              <label className="label">Category</label>
              <input
                className="input"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Liquid / Carrier / Granule"
              />
            </div>
            <div>
              <label className="label">Remarks</label>
              <input
                className="input"
                value={form.remarks}
                onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                placeholder="Optional notes"
              />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm mt-2">⚠ {error}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1.5">
              <Save size={14} />{saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-outline flex items-center gap-1.5">
              <X size={14} />Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-8">Loading…</div>
      ) : products.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          No products yet. Click <strong>Sync from Recipe DB</strong> to import existing products, or add manually.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Unit</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Plant</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Equipment</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={p.productCode} className={`border-t ${i % 2 === 0 ? '' : 'bg-gray-50/40'} hover:bg-blue-50/30 transition`}>
                  <td className="px-4 py-2.5 font-mono text-xs text-primary font-semibold">{p.productCode}</td>
                  <td className="px-4 py-2.5 font-medium">{p.productName}</td>
                  <td className="px-4 py-2.5 text-center text-gray-500">{p.batchUnit}</td>
                  <td className="px-4 py-2.5 text-gray-500">{p.plant || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{p.equipment || '—'}</td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => openEdit(p)} className="text-blue-500 hover:text-blue-700" title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(p.productCode)} className="text-red-400 hover:text-red-600" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function Masters() {
  const [activeTab, setActiveTab] = useState('rm')

  const tabs = [
    { key: 'rm',      label: 'RM Master',      desc: 'Raw material catalogue' },
    { key: 'product', label: 'Product Master',  desc: 'Products with plant & equipment' },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Database size={24} className="text-primary" />
        <div>
          <h1 className="text-xl font-bold text-primary">Masters</h1>
          <p className="text-xs text-gray-400">Manage RM catalogue and product configurations</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition ${
              activeTab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            <span className="ml-1 text-xs text-gray-400 font-normal hidden sm:inline">— {t.desc}</span>
          </button>
        ))}
      </div>

      {activeTab === 'rm'      && <RmMasterTab />}
      {activeTab === 'product' && <ProductMasterTab />}
    </div>
  )
}
