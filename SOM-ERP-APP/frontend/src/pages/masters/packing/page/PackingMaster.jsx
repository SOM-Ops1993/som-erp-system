import { useState, useEffect, useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import { packingMaterialApi } from '../../../../api/masters.js'
import { Button, BackButton } from '../../../../components/ui'
import CategoryList  from '../components/category-list/CategoryList.jsx'
import SubTypeGrid   from '../components/sub-type-grid/SubTypeGrid.jsx'
import ItemList      from '../components/item-list/ItemList.jsx'
import PackingForm   from '../components/packing-form/PackingForm.jsx'
import { CAT, EMPTY_FORM } from '../components/packing-constants/packingConstants.jsx'

export default function PackingMaster() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')

  // 3-level navigation
  const [view, setView]       = useState('categories')
  const [selCat, setSelCat]   = useState(null)
  const [selSub, setSelSub]   = useState(null)

  // Form
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try { setLoading(true); setLoadErr(''); const r = await packingMaterialApi.list(); setItems(r.data || []) }
    catch (e) { setLoadErr(e.message || 'Failed to load') }
    finally { setLoading(false) }
  }

  // Navigation
  function goCategories() { setView('categories'); setSelCat(null); setSelSub(null) }
  function goSubTypes(cat) { setSelCat(cat); setSelSub(null); setView('subtypes') }
  function goItems(sub)    { setSelSub(sub); setView('items') }
  function goBack()        { view === 'items' ? (setView('subtypes'), setSelSub(null)) : goCategories() }

  // Derived counts
  const catCounts = useMemo(() => {
    const c = {}; items.forEach(i => { c[i.category] = (c[i.category] || 0) + 1 }); return c
  }, [items])

  const subCounts = useMemo(() => {
    const c = {}; items.filter(i => i.category === selCat).forEach(i => { const s = i.subType || 'Other'; c[s] = (c[s] || 0) + 1 }); return c
  }, [items, selCat])

  const subItems = useMemo(() =>
    items.filter(i => i.category === selCat && i.subType === selSub),
    [items, selCat, selSub]
  )

  const groupedByName = useMemo(() => {
    const g = {}; subItems.forEach(i => { if (!g[i.itemName]) g[i.itemName] = []; g[i.itemName].push(i) }); return g
  }, [subItems])

  // Form change handler — special key '_resetCategory' resets all fields except category
  function handleFormChange(field, value) {
    if (field === '_resetCategory') {
      setForm({ ...EMPTY_FORM, category: value })
    } else {
      setForm(f => ({ ...f, [field]: value }))
    }
  }

  function openAdd() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, category: selCat || '', subType: selSub || '' })
    setMsg(''); setShowForm(true)
  }
  function openEdit(item) {
    setEditing(item)
    setForm({
      itemName: item.itemName || '', category: item.category || '', subType: item.subType || '',
      material: item.material || '',
      capacity: item.capacity != null ? String(item.capacity) : '', capacityUnit: item.capacityUnit || 'ML',
      length: item.length != null ? String(item.length) : '',
      width: item.width != null ? String(item.width) : '',
      height: item.height != null ? String(item.height) : '',
      ply: item.ply != null ? String(item.ply) : '',
      shape: item.shape || '', color: item.color || '', laminate: item.laminate || '',
      contentsSpec: item.contentsSpec || '',
      packCount: item.packCount != null ? String(item.packCount) : '',
      quantity: item.quantity != null ? String(item.quantity) : '0',
      notes: item.notes || '',
    })
    setMsg(''); setShowForm(true)
  }
  async function save() {
    if (!form.itemName || !form.category) { setMsg('Item Name and Category are required'); return }
    if (form.category === 'CORRUGATED_BOXES' && !form.ply) { setMsg('Ply is required for Corrugated Boxes'); return }
    setSaving(true); setMsg('')
    // Strip UI-only helper fields before sending to backend
    const { _customPly, ...payload } = form
    try {
      if (editing) await packingMaterialApi.update(editing.id, payload)
      else         await packingMaterialApi.create(payload)
      setShowForm(false); load()
    } catch (e) { setMsg(e.message) }
    finally { setSaving(false) }
  }
  async function del(id, name) {
    if (!confirm(`Delete "${name}"?`)) return
    try { await packingMaterialApi.delete(id); load() } catch (e) { alert(e.message) }
  }

  const catMeta = selCat ? CAT[selCat] : null

  return (
    <div className="min-h-screen bg-gray-50">
      {loadErr && (
        <div className="mx-6 mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
          <span>⚠️ {loadErr}</span>
          <Button variant="ghost" icon={RefreshCw} size="xs" onClick={load} className="ml-auto shrink-0">Retry</Button>
        </div>
      )}

      {/* VIEW 1 — Categories */}
      {view === 'categories' && (
        <div className="px-6 py-5">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Packing Material Master</h1>
              <p className="text-sm text-gray-500 mt-1">Select a category to browse and manage packing materials</p>
            </div>
            <BackButton />
          </div>
          <CategoryList loading={loading} catCounts={catCounts} onSelect={goSubTypes} />
        </div>
      )}

      {/* VIEW 2 — Sub-types */}
      {view === 'subtypes' && catMeta && (
        <SubTypeGrid
          catMeta={catMeta}
          catCounts={catCounts}
          subCounts={subCounts}
          onBack={goCategories}
          onAdd={openAdd}
          onSelect={goItems}
        />
      )}

      {/* VIEW 3 — Items */}
      {view === 'items' && catMeta && selSub && (
        <ItemList
          catMeta={catMeta}
          selSub={selSub}
          subItems={subItems}
          groupedByName={groupedByName}
          onBack={goBack}
          onBackToCategories={goCategories}
          onAdd={openAdd}
          onEdit={openEdit}
          onDelete={del}
        />
      )}

      {/* Modal */}
      {showForm && (
        <PackingForm
          editing={editing}
          form={form}
          onChange={handleFormChange}
          saving={saving}
          msg={msg}
          onSave={save}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
