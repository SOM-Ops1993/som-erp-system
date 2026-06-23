import { useState, useEffect } from 'react'
import { equipmentApi } from '../../../../api/masters.js'
import BackButton from '../../../../components/erp/BackButton.jsx'
import EquipmentTable from '../components/EquipmentTable.jsx'
import EquipmentForm from '../components/EquipmentForm.jsx'

export default function EquipmentMaster() {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]  = useState(null)
  const [form, setForm]        = useState({ equipName: '', plant: '' })
  const [saving, setSaving]    = useState(false)
  const [msg, setMsg]          = useState('')
  const [page, setPage]        = useState(1)
  const [limit, setLimit]      = useState(15)

  const load = async () => {
    try { setLoading(true); const r = await equipmentApi.list(); setItems(r.data || []) }
    catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openAdd  = () => { setEditing(null); setForm({ equipName: '', plant: '' }); setShowForm(true); setMsg('') }
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
        <div className="flex items-center gap-3">
          <button onClick={openAdd} className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-medium">
            + Add Equipment
          </button>
          <BackButton />
        </div>
      </div>

      {loading ? <p className="text-gray-500">Loading...</p> : (
        <EquipmentTable
          items={items}
          page={page}
          limit={limit}
          onEdit={openEdit}
          onDelete={del}
          onPageChange={setPage}
          onLimitChange={l => { setLimit(l); setPage(1) }}
        />
      )}

      {showForm && (
        <EquipmentForm
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
