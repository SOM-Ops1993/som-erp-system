import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { productApi } from '../../../../api/masters.js'
import { Button, BackButton } from '../../../../components/ui'
import ProductTable from '../components/product-table/ProductTable.jsx'
import ProductForm from '../components/product-form/ProductForm.jsx'

export default function ProductMaster() {
  const [items, setItems]      = useState([])
  const [loading, setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]  = useState(null)
  const [form, setForm]        = useState({ productCode: '', productName: '', plant: '' })
  const [saving, setSaving]    = useState(false)
  const [msg, setMsg]          = useState('')
  const [search, setSearch]    = useState('')
  const [page, setPage]        = useState(1)
  const [limit, setLimit]      = useState(15)

  const load = async () => {
    try { setLoading(true); const r = await productApi.list({ search }); setItems(r.data || []) }
    catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search])
  useEffect(() => { setPage(1) }, [items])

  const openAdd  = () => { setEditing(null); setForm({ productCode: '', productName: '', plant: '' }); setShowForm(true); setMsg('') }
  const openEdit = (item) => { setEditing(item); setForm({ productCode: item.productCode, productName: item.productName, plant: item.plant }); setShowForm(true); setMsg('') }

  const save = async () => {
    if (!form.productCode || !form.productName) { setMsg('Product Code and Name are required'); return }
    setSaving(true); setMsg('')
    try {
      if (editing) await productApi.update(form.productCode, { productName: form.productName, plant: form.plant })
      else await productApi.create(form)
      setShowForm(false); load()
    } catch (e) { setMsg(e.message) } finally { setSaving(false) }
  }

  const del = async (code) => {
    if (!confirm(`Delete product ${code}?`)) return
    try { await productApi.delete(code); load() } catch (e) { alert(e.message) }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Master</h1>
          <p className="text-sm text-gray-500 mt-1">Manage finished product codes, names and plant</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="success" icon={Plus} onClick={openAdd}>Add New Product</Button>
          <BackButton />
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 w-80 outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {loading ? <p className="text-gray-500">Loading...</p> : (
        <ProductTable
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
        <ProductForm
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
