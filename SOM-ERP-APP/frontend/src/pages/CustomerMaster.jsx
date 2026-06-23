import { useState, useEffect, useCallback } from 'react'
import { customerProfileApi, cpProfileApi, configurableOptionsApi } from '../api/sales'
import { productApi, recipeApi } from '../api/masters'

const ORDER_TYPES = ['DOMESTIC', 'EXPORT', 'ECOM', 'SAMPLE']
const SECTIONS    = ['POWDER', 'NANO', 'BOTANICAL', 'LIQUID', 'GRANULES']
const UOMS        = ['KG', 'LTR', 'GM', 'ML', 'NOS']
const LABEL_TYPES = ['', 'CUSTOMER', 'COMPUTER', 'RETAIL', 'PACKING_SLIP']

// ── Inline editable cell ──────────────────────────────────────────────────────
function EditCell({ value, onChange, type = 'text', options, placeholder = '—', small = false }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(value || '')

  const commit = () => { setEditing(false); if (draft !== (value || '')) onChange(draft) }

  if (!editing) return (
    <span
      onClick={() => { setDraft(value || ''); setEditing(true) }}
      className={`cursor-pointer hover:bg-blue-50 rounded px-1 block truncate ${small ? 'text-xs' : 'text-sm'} ${!value ? 'text-gray-300 italic' : 'text-gray-800'}`}
      title={value || placeholder}
    >
      {value || placeholder}
    </span>
  )

  if (options) return (
    <select
      value={draft} autoFocus
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      className="w-full border border-blue-400 rounded px-1 text-sm bg-white focus:outline-none"
    >
      {options.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
    </select>
  )

  return (
    <input
      autoFocus type={type} value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      className="w-full border border-blue-400 rounded px-1 text-sm focus:outline-none"
      placeholder={placeholder}
    />
  )
}

// ── Product search with debounce ──────────────────────────────────────────────
function ProductSearch({ value, inhouseCode, onChange, products }) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState(value || '')

  const filtered = query.length > 1
    ? products.filter(p =>
        p.productName?.toLowerCase().includes(query.toLowerCase()) ||
        p.productCode?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : []

  return (
    <div className="relative">
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search inhouse product…"
        className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(p => (
            <div
              key={p.productCode}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
              onMouseDown={() => { onChange(p.productCode, p.productName); setQuery(p.productName); setOpen(false) }}
            >
              <div className="font-medium text-gray-800">{p.productName}</div>
              <div className="text-xs text-gray-400">{p.productCode}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Options Manager Modal ─────────────────────────────────────────────────────
function OptionsModal({ onClose }) {
  const [tab, setTab]       = useState('CARRIER')
  const [options, setOptions] = useState([])
  const [newVal, setNewVal]   = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await configurableOptionsApi.list()
      setOptions(res.data || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = options.filter(o => o.category === tab)

  const addOption = async () => {
    if (!newVal.trim()) return
    try {
      await configurableOptionsApi.create({ category: tab, value: newVal.trim() })
      setNewVal('')
      load()
    } catch (e) { alert(e.message) }
  }

  const removeOption = async (id) => {
    if (!confirm('Remove this option?')) return
    await configurableOptionsApi.remove(id)
    load()
  }

  const TABS = [
    { key: 'CARRIER',       label: 'Carriers' },
    { key: 'PRIMARY_PACK',  label: 'Primary Packs' },
    { key: 'SECONDARY_PACK',label: 'Secondary Packs' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[480px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold text-gray-800">⚙ Manage Dropdown Options</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-4 pt-2 gap-1">
          {TABS.map(t => (
            <button key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium rounded-t border-b-2 transition-colors ${tab === t.key ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >{t.label}</button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? <div className="text-sm text-gray-400 py-4 text-center">Loading…</div> : (
            <div className="space-y-1">
              {filtered.map(o => (
                <div key={o.id} className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 group">
                  <span className="text-sm text-gray-800">{o.value}</span>
                  <button
                    onClick={() => removeOption(o.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs px-2 py-0.5 rounded"
                  >Remove</button>
                </div>
              ))}
              {filtered.length === 0 && <div className="text-sm text-gray-400 py-4 text-center italic">No options yet</div>}
            </div>
          )}
        </div>

        {/* Add new */}
        <div className="px-5 py-3 border-t flex gap-2">
          <input
            value={newVal} onChange={e => setNewVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addOption()}
            placeholder={`Add new ${TABS.find(t=>t.key===tab)?.label.slice(0,-1).toLowerCase()}…`}
            className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-green-400"
          />
          <button
            onClick={addOption}
            className="bg-green-700 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-green-800"
          >Add</button>
        </div>
      </div>
    </div>
  )
}

// ── Add / Edit Profile Row Form ───────────────────────────────────────────────
function ProfileForm({ customerName, initial, products, options, onSave, onCancel }) {
  const carriers      = options.filter(o => o.category === 'CARRIER').map(o => o.value)
  const primaryPacks  = options.filter(o => o.category === 'PRIMARY_PACK').map(o => o.value)
  const secondaryPacks= options.filter(o => o.category === 'SECONDARY_PACK').map(o => o.value)

  const [form, setForm] = useState({
    productName:   initial?.productName   || '',
    productCode:   initial?.productCode   || '',
    inhouseName:   initial?.inhouseName   || '',
    activeSpecs:   initial?.activeSpecs   || '',
    carrier:       initial?.carrier       || '',
    sectionName:   initial?.sectionName   || '',
    unitQty:       initial?.unitQty       || '',
    unitUom:       initial?.unitUom       || 'KG',
    primaryPack:   initial?.primaryPack   || '',
    secondaryPack: initial?.secondaryPack || '',
    unitsPerCS:    initial?.unitsPerCS    || '',
    labelType:     initial?.labelType     || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.productName.trim()) return setErr('Customer Product Name is required')
    setSaving(true); setErr('')
    try {
      await onSave({ ...form, customerName })
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const inputCls = "w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-green-500"
  const selCls   = "w-full border border-gray-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-green-500"
  const label    = (t) => <div className="text-xs font-semibold text-gray-500 mb-1">{t}</div>

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          {label('Customer Product Name *')}
          <input value={form.productName} onChange={e => set('productName', e.target.value)}
            className={inputCls} placeholder="e.g. Tricho-Power 1kg" />
        </div>
        <div>
          {label('Inhouse Product')}
          <ProductSearch
            value={form.inhouseName} inhouseCode={form.productCode}
            products={products}
            onChange={(code, name) => { set('productCode', code); set('inhouseName', name) }}
          />
          {form.productCode && <div className="text-xs text-gray-400 mt-0.5">{form.productCode}</div>}
        </div>
        <div>
          {label('Specification / CFU')}
          <input value={form.activeSpecs} onChange={e => set('activeSpecs', e.target.value)}
            className={inputCls} placeholder="e.g. 2×10⁹ CFU/g" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-3">
        <div>
          {label('Carrier')}
          <select value={form.carrier} onChange={e => set('carrier', e.target.value)} className={selCls}>
            <option value="">— Select —</option>
            {carriers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          {label('Section')}
          <select value={form.sectionName} onChange={e => set('sectionName', e.target.value)} className={selCls}>
            <option value="">— Select —</option>
            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          {label('Unit Pack Qty')}
          <input type="number" value={form.unitQty} onChange={e => set('unitQty', e.target.value)}
            className={inputCls} placeholder="e.g. 1" />
        </div>
        <div>
          {label('UOM')}
          <select value={form.unitUom} onChange={e => set('unitUom', e.target.value)} className={selCls}>
            {UOMS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-3">
        <div>
          {label('Primary Pack')}
          <select value={form.primaryPack} onChange={e => set('primaryPack', e.target.value)} className={selCls}>
            <option value="">— Select —</option>
            {primaryPacks.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          {label('Secondary Pack')}
          <select value={form.secondaryPack} onChange={e => set('secondaryPack', e.target.value)} className={selCls}>
            <option value="">— Select —</option>
            {secondaryPacks.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          {label('Units per Secondary Pack')}
          <input type="number" value={form.unitsPerCS} onChange={e => set('unitsPerCS', e.target.value)}
            className={inputCls} placeholder="e.g. 10" />
        </div>
        <div>
          {label('Label Type')}
          <select value={form.labelType} onChange={e => set('labelType', e.target.value)} className={selCls}>
            {LABEL_TYPES.map(l => <option key={l} value={l}>{l || '— Select —'}</option>)}
          </select>
        </div>
      </div>
      {err && <div className="text-red-600 text-sm mb-2">{err}</div>}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-1.5 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-50">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-1.5 text-sm rounded bg-green-700 text-white hover:bg-green-800 disabled:opacity-50">
          {saving ? 'Saving…' : initial ? 'Update' : 'Add Profile'}
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CustomerMaster() {
  const [customers,  setCustomers]  = useState([])
  const [selected,   setSelected]   = useState(null)  // customerProfile object
  const [profiles,   setProfiles]   = useState([])    // cp-profiles for selected customer
  const [products,   setProducts]   = useState([])    // all inhouse products
  const [options,    setOptions]    = useState([])    // configurable options
  const [loadingC,   setLoadingC]   = useState(false)
  const [loadingP,   setLoadingP]   = useState(false)
  const [custSearch, setCustSearch] = useState('')
  const [showAdd,    setShowAdd]    = useState(false)    // add customer form
  const [showOpts,   setShowOpts]   = useState(false)    // options modal
  const [addProfile, setAddProfile] = useState(false)    // add profile form
  const [editProfile,setEditProfile]= useState(null)     // profile being edited
  const [editCust,   setEditCust]   = useState(false)    // edit customer form
  const [custForm,   setCustForm]   = useState({ customerName: '', company: '', orderType: 'DOMESTIC' })
  const [custErr,    setCustErr]    = useState('')
  const [saving,     setSaving]     = useState(false)

  const loadCustomers = useCallback(async () => {
    setLoadingC(true)
    try { const r = await customerProfileApi.list(); setCustomers(r.data || []) }
    finally { setLoadingC(false) }
  }, [])

  const loadProfiles = useCallback(async (name) => {
    if (!name) return
    setLoadingP(true)
    try { const r = await cpProfileApi.forCustomer(name); setProfiles(r.data || []) }
    finally { setLoadingP(false) }
  }, [])

  const loadOptions = useCallback(async () => {
    const r = await configurableOptionsApi.list()
    setOptions(r.data || [])
  }, [])

  useEffect(() => {
    loadCustomers()
    productApi.list({}).then(r => setProducts(r.data || []))
    loadOptions()
  }, [loadCustomers, loadOptions])

  useEffect(() => {
    if (selected) loadProfiles(selected.customerName)
    else setProfiles([])
  }, [selected, loadProfiles])

  const selectCustomer = (c) => { setSelected(c); setAddProfile(false); setEditProfile(null) }

  // ── Customer CRUD ─────────────────────────────────────────────────────────
  const saveCustomer = async () => {
    if (!custForm.customerName.trim()) return setCustErr('Name required')
    setSaving(true); setCustErr('')
    try {
      if (editCust) {
        await customerProfileApi.update(selected.id, custForm)
      } else {
        await customerProfileApi.create(custForm)
      }
      await loadCustomers()
      setShowAdd(false); setEditCust(false)
      setCustForm({ customerName: '', company: '', orderType: 'DOMESTIC' })
    } catch (e) { setCustErr(e.message) }
    finally { setSaving(false) }
  }

  const deleteCustomer = async (id) => {
    if (!confirm('Delete this customer and all their product profiles?')) return
    await customerProfileApi.remove(id)
    setSelected(null)
    loadCustomers()
  }

  const startEditCust = () => {
    setCustForm({ customerName: selected.customerName, company: selected.company, orderType: selected.orderType })
    setEditCust(true); setShowAdd(true)
  }

  // ── Profile CRUD ──────────────────────────────────────────────────────────
  const saveProfile = async (data) => {
    if (editProfile) {
      await cpProfileApi.update(editProfile.id, data)
    } else {
      await cpProfileApi.create({ ...data, customerName: selected.customerName })
    }
    await loadProfiles(selected.customerName)
    setAddProfile(false); setEditProfile(null)
  }

  const deleteProfile = async (id) => {
    if (!confirm('Remove this product profile?')) return
    await cpProfileApi.remove(id)
    loadProfiles(selected.customerName)
  }

  const filteredCustomers = customers.filter(c =>
    !custSearch || c.customerName.toLowerCase().includes(custSearch.toLowerCase())
  )

  // ── Add customer form ──────────────────────────────────────────────────────
  const AddCustomerForm = () => (
    <div className="border-t px-4 py-4 bg-green-50">
      <div className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">
        {editCust ? 'Edit Customer' : 'New Customer'}
      </div>
      <div className="space-y-2 mb-3">
        <input
          value={custForm.customerName} onChange={e => setCustForm(f => ({ ...f, customerName: e.target.value }))}
          placeholder="Customer Name *"
          className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
        />
        <input
          value={custForm.company} onChange={e => setCustForm(f => ({ ...f, company: e.target.value }))}
          placeholder="Company (SOM / DVS / AL-IPL…)"
          className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
        />
        <select
          value={custForm.orderType} onChange={e => setCustForm(f => ({ ...f, orderType: e.target.value }))}
          className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-green-500"
        >
          {ORDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {custErr && <div className="text-red-600 text-xs mb-2">{custErr}</div>}
      <div className="flex gap-2">
        <button onClick={() => { setShowAdd(false); setEditCust(false); setCustErr('') }}
          className="flex-1 py-1.5 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
        <button onClick={saveCustomer} disabled={saving}
          className="flex-1 py-1.5 text-sm rounded bg-green-700 text-white hover:bg-green-800 disabled:opacity-50">
          {saving ? '…' : editCust ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      {showOpts && <OptionsModal onClose={() => { setShowOpts(false); loadOptions() }} />}

      {/* ── Left: Customer List ────────────────────────────────────────────── */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-bold text-gray-800 text-sm">Customers</div>
              <div className="text-xs text-gray-400">{customers.length} total</div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setShowOpts(true)}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-500 text-sm" title="Manage dropdown options">⚙</button>
              <button onClick={() => { setShowAdd(true); setEditCust(false); setCustForm({ customerName:'', company:'', orderType:'DOMESTIC' }) }}
                className="bg-green-700 text-white text-sm px-3 py-1 rounded hover:bg-green-800">+ Add</button>
            </div>
          </div>
          <input
            value={custSearch} onChange={e => setCustSearch(e.target.value)}
            placeholder="Search customers…"
            className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-green-400"
          />
        </div>

        {/* Customer list */}
        <div className="flex-1 overflow-y-auto">
          {loadingC ? (
            <div className="text-sm text-gray-400 text-center py-8">Loading…</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-8 italic">No customers yet</div>
          ) : filteredCustomers.map(c => (
            <div
              key={c.id}
              onClick={() => selectCustomer(c)}
              className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-green-50 transition-colors ${selected?.id === c.id ? 'bg-green-50 border-l-2 border-l-green-600' : ''}`}
            >
              <div className="font-semibold text-sm text-gray-800 truncate">{c.customerName}</div>
              <div className="flex items-center gap-2 mt-0.5">
                {c.company && <span className="text-xs text-gray-400">{c.company}</span>}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${c.orderType === 'EXPORT' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.orderType}
                </span>
              </div>
              {c.orderCount > 0 && (
                <div className="text-xs text-green-600 mt-0.5">📦 {c.orderCount} orders</div>
              )}
            </div>
          ))}
        </div>

        {showAdd && <AddCustomerForm />}
      </div>

      {/* ── Right: Product Profiles ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <div className="text-5xl mb-4">👥</div>
            <div className="text-lg font-medium text-gray-500">Select a customer</div>
            <div className="text-sm mt-1">to view and manage their product profiles</div>
          </div>
        ) : (
          <>
            {/* Customer header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-gray-800">{selected.customerName}</h2>
                  {selected.company && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{selected.company}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${selected.orderType === 'EXPORT' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {selected.orderType}
                  </span>
                  {selected.orderCount > 0 && (
                    <span className="text-xs text-gray-400">📦 {selected.orderCount} orders placed</span>
                  )}
                </div>
                <div className="text-sm text-gray-400 mt-0.5">{profiles.length} product profile{profiles.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={startEditCust}
                  className="text-sm px-3 py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50">✏ Edit</button>
                <button onClick={() => deleteCustomer(selected.id)}
                  className="text-sm px-3 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50">Delete</button>
                <button
                  onClick={() => { setAddProfile(true); setEditProfile(null) }}
                  className="text-sm px-4 py-1.5 rounded bg-green-700 text-white hover:bg-green-800">
                  + Add Product
                </button>
              </div>
            </div>

            {/* Profiles area */}
            <div className="flex-1 overflow-auto px-6 py-4">
              {/* Add / Edit form */}
              {(addProfile || editProfile) && (
                <ProfileForm
                  customerName={selected.customerName}
                  initial={editProfile}
                  products={products}
                  options={options}
                  onSave={saveProfile}
                  onCancel={() => { setAddProfile(false); setEditProfile(null) }}
                />
              )}

              {loadingP ? (
                <div className="text-sm text-gray-400 text-center py-8">Loading profiles…</div>
              ) : profiles.length === 0 && !addProfile ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">📋</div>
                  <div className="font-medium text-gray-500">No product profiles yet</div>
                  <div className="text-sm mt-1">Click "+ Add Product" to create the first one</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Customer Product Name</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Inhouse Product</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Spec / CFU</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Carrier</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Section</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Pack Qty</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Primary Pack</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Secondary Pack</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Units/Sec</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Label</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Recipe</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.map(p => (
                        <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 group">
                          <td className="px-3 py-2 max-w-[180px]">
                            <div className="font-medium text-gray-800 truncate" title={p.productName}>{p.productName}</div>
                            {p.orderCount > 0 && <div className="text-xs text-green-600">{p.orderCount} orders</div>}
                          </td>
                          <td className="px-3 py-2 max-w-[160px]">
                            <div className="text-gray-700 truncate" title={p.inhouseName}>{p.inhouseName || <span className="text-gray-300 italic">—</span>}</div>
                            {p.productCode && <div className="text-xs text-gray-400">{p.productCode}</div>}
                          </td>
                          <td className="px-3 py-2 text-gray-600 max-w-[120px]">
                            <span className="truncate block" title={p.activeSpecs}>{p.activeSpecs || <span className="text-gray-300">—</span>}</span>
                          </td>
                          <td className="px-3 py-2 text-gray-600">{p.carrier || <span className="text-gray-300">—</span>}</td>
                          <td className="px-3 py-2">
                            {p.sectionName
                              ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{p.sectionName}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                            {p.unitQty ? `${p.unitQty} ${p.unitUom || ''}` : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-600 max-w-[130px]">
                            <span className="truncate block" title={p.primaryPack}>{p.primaryPack || <span className="text-gray-300">—</span>}</span>
                          </td>
                          <td className="px-3 py-2 text-gray-600 max-w-[130px]">
                            <span className="truncate block" title={p.secondaryPack}>{p.secondaryPack || <span className="text-gray-300">—</span>}</span>
                          </td>
                          <td className="px-3 py-2 text-gray-600">{p.unitsPerCS || <span className="text-gray-300">—</span>}</td>
                          <td className="px-3 py-2">
                            {p.labelType
                              ? <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{p.labelType.replace('_',' ')}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2">
                            {p.hasRecipe
                              ? <span className="text-xs text-green-600 font-medium">✓ Recipe</span>
                              : <span className="text-xs text-amber-500 font-medium">⚠ No Recipe</span>}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setEditProfile(p); setAddProfile(false) }}
                                className="text-xs px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-50">Edit</button>
                              <button
                                onClick={() => deleteProfile(p.id)}
                                className="text-xs px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50">✕</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
