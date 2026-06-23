import { useState, useEffect } from 'react'
import { rmApi } from '../../../../api/inventory.js'
import BackButton from '../../../../components/erp/BackButton.jsx'
import RmTable from '../components/RmTable.jsx'
import RmForm  from '../components/RmForm.jsx'

export default function RmMaster() {
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState({ itemCode: '', itemName: '', uom: 'KG', trackingType: 'PACK' })
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [page, setPage]         = useState(1)
  const [limit, setLimit]       = useState(15)

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
        <div className="flex items-center gap-3">
          <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
            + Add New Item
          </button>
          <BackButton />
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <RmTable
          items={items}
          visibleItems={visibleItems}
          page={page}
          limit={limit}
          search={search}
          filterType={filterType}
          onSearch={v => { setSearch(v); setPage(1) }}
          onFilterType={t => { setFilterType(t); setPage(1) }}
          onEdit={openEdit}
          onDelete={del}
          onPageChange={setPage}
          onLimitChange={l => { setLimit(l); setPage(1) }}
        />
      )}

      {showForm && (
        <RmForm
          editing={editing}
          form={form}
          onChange={(field, val) => setForm(f => ({ ...f, [field]: val }))}
          saving={saving}
          msg={msg}
          onSave={save}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
