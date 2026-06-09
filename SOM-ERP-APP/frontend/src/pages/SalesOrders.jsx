import { useState, useEffect, useCallback, useRef } from 'react'
import { salesOrderApi, productApi, customerProfileApi, cpProfileApi, configurableOptionsApi } from '../api/client'
import { STATIC_CUSTOMER_PROFILES } from '../data/customerProfiles'

// ── Constants ─────────────────────────────────────────────────────────────────
// Fixed company list — exactly 5 entities
const COMPANIES = ['SOM', 'DVS', 'AL-IPL', 'AL-LLC', 'AL-PTE']

const ORDER_TYPES   = ['DOMESTIC', 'EXPORT', 'ECOM', 'SAMPLE']
const PRIORITIES    = ['MODERATE', 'URGENT', 'VERY_URGENT']
const STATUSES      = ['PENDING', 'PLANNED', 'UNDER_PRODUCTION', 'PACKED', 'IN_INVENTORY', 'READY_TO_DISPATCH', 'DISPATCHED']
const SECTIONS      = ['NANO', 'BOTANICAL', 'LIQUID', 'POWDER', 'GRANULES']
const UOMS          = ['KG', 'LTR', 'GM', 'ML', 'NOS']

const CARRIER_OPTIONS = [
  '', 'Dextrose', 'Talc', 'Lactose', 'HSCAS', 'China Clay',
  'Diatomaceous Earth', 'LSP', 'Precipitated CaCO3', 'Silica',
]
const PRIMARY_PACKING = [
  '', 'LD Pouch', 'AL Pouch', 'HDPE Jar',
  '100ml Bottle (Round)', '100ml Bottle (Regular)', '100ml Bottle (Triangle)',
  '200ml Bottle (Round)', '200ml Bottle (Regular)', '200ml Bottle (Triangle)',
  '500ml Bottle (Round)', '500ml Bottle (Regular)', '500ml Bottle (Triangle)',
  '1L Bottle (Round)', '1L Bottle (Regular)', '1L Bottle (Triangle)',
  '__CUSTOM__',
]
const SECONDARY_PACKING = [
  '', 'W-CBB', 'B-CBB', 'OMB 30 (30kg Drum)', 'OMB 50 (50kg Drum)',
  '25Kg HDPE Bag', '50Kg HDPE Bag', 'Cartons', '25L Jerry Can', '50L Barrel',
  '5L Can', '10L Can', 'Others', '__CUSTOM__',
]
const LABEL_TYPES = [
  { value: '',             label: '— Select —' },
  { value: 'CUSTOMER',    label: 'Customer Label' },
  { value: 'COMPUTER',    label: 'Computer Label' },
  { value: 'RETAIL',      label: 'Retail Label' },
  { value: 'PACKING_SLIP',label: 'Packing Slip' },
]
// Only CUSTOMER / COMPUTER / RETAIL need batch/date/MRP details
const LABEL_NEEDS_DETAILS = new Set(['CUSTOMER', 'COMPUTER', 'RETAIL'])

const PRIORITY_STYLE = {
  MODERATE:   'bg-gray-100 text-gray-600',
  URGENT:     'bg-orange-100 text-orange-700',
  VERY_URGENT:'bg-red-100 text-red-700',
}
const STATUS_STYLE = {
  PENDING:             'bg-yellow-100 text-yellow-700',
  PLANNED:             'bg-blue-100 text-blue-700',
  UNDER_PRODUCTION:    'bg-indigo-100 text-indigo-700',
  PACKED:              'bg-purple-100 text-purple-700',
  IN_INVENTORY:        'bg-teal-100 text-teal-700',
  READY_TO_DISPATCH:   'bg-green-100 text-green-700',
  DISPATCHED:          'bg-gray-100 text-gray-500',
}
const STATUS_LABELS = {
  PENDING:             'Pending',
  PLANNED:             'Planned',
  UNDER_PRODUCTION:    'Under Production',
  PACKED:              'Packed',
  IN_INVENTORY:        'In Inventory',
  READY_TO_DISPATCH:   'Ready to Dispatch',
  DISPATCHED:          'Dispatched',
}

const BRAND = '#1a4a22'

// ─────────────────────────────────────────────────────────────────────────────
// Batch number helpers
// ─────────────────────────────────────────────────────────────────────────────
// Parse "AQ260501" → { prefix:'AQ', yy:'26', mm:'05', seq:'01', full:'AQ260501' }
function parseBatch(batchNo) {
  if (!batchNo) return null
  const m = batchNo.match(/^([A-Za-z]+)(\d{2})(\d{2})(\d{2,3})$/)
  if (!m) return null
  return { prefix: m[1], yy: m[2], mm: m[3], seq: m[4] }
}

// Suggest next batch: keep prefix, update YYMM to today, increment seq if same month
function suggestNextBatch(lastBatchNo) {
  const p = parseBatch(lastBatchNo)
  if (!p) return lastBatchNo || ''
  const now   = new Date()
  const yy    = String(now.getFullYear()).slice(-2)
  const mm    = String(now.getMonth() + 1).padStart(2, '0')
  const isSameMonth = p.yy === yy && p.mm === mm
  const nextSeq = isSameMonth
    ? String(parseInt(p.seq) + 1).padStart(p.seq.length, '0')
    : '01'.padStart(p.seq.length, '0')
  return p.prefix + yy + mm + nextSeq
}

// Add days to a date string (YYYY-MM-DD) → YYYY-MM-DD
function addDays(dateStr, days) {
  if (!dateStr || !days) return ''
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const BRAND_LIGHT = '#f0fdf4'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
}

const SUPERSCRIPT = {'0':'0','1':'1','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9'}
function specsDisplay(s) {
  if (!s) return '—'
  return s.replace(/([0-9.]+)\s*[x]\s*10\s*\^([0-9]+)/g, (_, c, e) => `${parseFloat(c).toFixed(2)}E+${e.padStart(2,'0')}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Inhouse product searchable dropdown
// ─────────────────────────────────────────────────────────────────────────────
function InhouseProductPicker({ value, productCode, products, onChange }) {
  const [query, setQuery] = useState(value || '')
  const [open,  setOpen]  = useState(false)
  useEffect(() => { setQuery(value || '') }, [value])

  const filtered = products.filter(p =>
    !query ||
    p.productName.toLowerCase().includes(query.toLowerCase()) ||
    (p.productCode || '').toLowerCase().includes(query.toLowerCase())
  ).slice(0, 20)

  function pick(p) { setQuery(p.productName); setOpen(false); onChange(p.productName, p.productCode) }

  return (
    <div className="relative">
      <input value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); onChange(e.target.value, '') }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder="Search product master…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
      {productCode && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-green-600">{productCode}</span>
      )}
      {open && (
        <div className="absolute z-30 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
          {products.length === 0 ? (
            <div className="px-4 py-3 text-xs text-amber-600 bg-amber-50">
              No products in master yet — import recipe data via Data Import page first
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-3 text-xs text-gray-400 italic">No match — type free text or import more recipes</div>
          ) : filtered.map(p => (
            <button key={p.productCode} type="button" onMouseDown={() => pick(p)}
              className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm flex items-center justify-between gap-2">
              <span className="font-medium text-gray-800">{p.productName}</span>
              <span className="text-xs text-gray-400 font-mono shrink-0">{p.productCode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// Customer name picker — searches 489 profiles, auto-fills company + orderType
// ─────────────────────────────────────────────────────────────────────────────
function CustomerNamePicker({ value, profiles, onSelect }) {
  const [query, setQuery] = useState(value || '')
  const [open,  setOpen]  = useState(false)

  useEffect(() => { setQuery(value || '') }, [value])

  const filtered = profiles.filter(p =>
    !query || p.customerName.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 12)

  // Confidence badge based on orderCount
  function badge(count) {
    if (count >= 10) return { label: 'HIGH',   cls: 'bg-green-100 text-green-700' }
    if (count >= 3)  return { label: 'MEDIUM', cls: 'bg-blue-100 text-blue-600' }
    if (count >= 1)  return { label: 'LOW',    cls: 'bg-gray-100 text-gray-500' }
    return { label: 'NEW', cls: 'bg-yellow-100 text-yellow-700' }
  }

  function pick(p) {
    setQuery(p.customerName)
    setOpen(false)
    onSelect(p.customerName, p.company, p.orderType)
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); onSelect(e.target.value, null, null) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder="Type customer name…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
      />
      {open && (
        <div className="absolute z-40 w-full bg-white border border-gray-200 rounded-xl shadow-xl mt-1 max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 italic">
              New customer — will be added to memory on save
            </div>
          ) : (
            filtered.map(p => {
              const b = badge(p.orderCount)
              return (
                <button key={p.customerName} type="button" onMouseDown={() => pick(p)}
                  className="w-full text-left px-3 py-2.5 hover:bg-green-50 transition flex items-center justify-between gap-3 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{p.customerName}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {p.company} · {p.orderType}
                    </div>
                  </div>
                  <span className={'text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ' + b.cls}>
                    {b.label}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Line item row — used in booking form
// ─────────────────────────────────────────────────────────────────────────────
// Auto-calculate number of secondary packs
function calcTotalCS(totalQty, unitQty, unitsPerCS) {
  const tq = parseFloat(totalQty)
  const uq = parseFloat(unitQty)
  const up = parseInt(unitsPerCS)
  if (!tq || !uq || !up || uq <= 0 || up <= 0) return ''
  return String(Math.ceil(tq / (uq * up)))
}

// ── CustomerProductPicker: searchable dropdown from cpProfiles ───────────────
function CustomerProductPicker({ value, cpProfiles, onSelect, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(value || '')
  const ref = useRef(null)

  // sync search with external value
  useEffect(() => { setSearch(value || '') }, [value])

  // close on outside click
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = search.trim().length >= 1
    ? cpProfiles.filter(p => p.productName.toLowerCase().includes(search.toLowerCase())).slice(0, 10)
    : cpProfiles.slice(0, 10)

  return (
    <div className="relative" ref={ref}>
      <input
        value={search}
        onChange={e => { setSearch(e.target.value); onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
        placeholder={cpProfiles.length > 0 ? `${cpProfiles.length} known products…` : 'Type product name'} />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
          {filtered.map((p, i) => (
            <button key={i} type="button"
              onMouseDown={e => { e.preventDefault(); setSearch(p.productName); onChange(p.productName); setOpen(false); onSelect(p) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 flex items-center justify-between gap-2">
              <span className="font-medium text-gray-800 truncate">{p.productName}</span>
              <span className="text-xs text-gray-400 shrink-0 flex gap-1">
                {p.unitQty && <span>{p.unitQty}{p.unitUom}</span>}
                {p.primaryPack && <span>· {p.primaryPack}</span>}
                {p.labelType && <span className="text-green-600">· {p.labelType.replace('_',' ')}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Table row — one product line in the new wide-table booking form
// ─────────────────────────────────────────────────────────────────────────────
function TableRow({ item, idx, cpProfiles, carriers, primaryPacks, secondaryPacks, onChange, onRemove, onCpProductPicked }) {
  const set = (k, v) => {
    const updated = { ...item, [k]: v }
    if (['totalQty','unitQty','unitsPerCS'].includes(k)) {
      const tq = k === 'totalQty'  ? v : item.totalQty
      const uq = k === 'unitQty'   ? v : item.unitQty
      const up = k === 'unitsPerCS'? v : item.unitsPerCS
      updated.totalCS = calcTotalCS(tq, uq, up)
    }
    onChange(idx, updated)
  }

  const inp = 'w-full border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-green-500 bg-white'
  const sel = 'w-full border border-gray-200 rounded px-1 py-1 text-xs bg-white focus:outline-none focus:border-green-500'

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 align-top">
      {/* # */}
      <td className="px-2 py-2 text-center text-xs text-gray-400 font-semibold w-8">{idx + 1}</td>

      {/* Customer Product Name */}
      <td className="px-1 py-1.5 min-w-[160px]">
        <CustomerProductPicker
          value={item.customerProductName}
          cpProfiles={cpProfiles}
          onSelect={p => onCpProductPicked(idx, p)}
          onChange={v => set('customerProductName', v)}
        />
      </td>

      {/* Inhouse Product Name */}
      <td className="px-1 py-1.5 min-w-[150px]">
        <input value={item.inhouseProductName || ''} onChange={e => set('inhouseProductName', e.target.value)}
          className={inp} placeholder="Search inhouse…" />
        {item.inhouseProductCode && (
          <div className="text-xs text-gray-400 mt-0.5 px-1 truncate">{item.inhouseProductCode}</div>
        )}
      </td>

      {/* Order Qty */}
      <td className="px-1 py-1.5 w-20">
        <input type="number" value={item.totalQty || ''} onChange={e => set('totalQty', e.target.value)}
          className={inp} placeholder="0" min="0" />
      </td>

      {/* UOM */}
      <td className="px-1 py-1.5 w-16">
        <select value={item.totalUom || 'KG'} onChange={e => set('totalUom', e.target.value)} className={sel}>
          {UOMS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>

      {/* Specification / CFU */}
      <td className="px-1 py-1.5 min-w-[110px]">
        <input value={item.activeSpecs || ''} onChange={e => set('activeSpecs', e.target.value)}
          className={inp} placeholder="2×10⁹ CFU/g" />
      </td>

      {/* Carrier */}
      <td className="px-1 py-1.5 min-w-[110px]">
        <select value={item.carrier || ''} onChange={e => set('carrier', e.target.value)} className={sel}>
          <option value="">— Select —</option>
          {carriers.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>

      {/* Section */}
      <td className="px-1 py-1.5 w-28">
        <select value={item.sectionName || ''} onChange={e => set('sectionName', e.target.value)} className={sel}>
          <option value="">— Select —</option>
          {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>

      {/* Unit Pack Qty */}
      <td className="px-1 py-1.5 w-20">
        <input type="number" value={item.unitQty || ''} onChange={e => set('unitQty', e.target.value)}
          className={inp} placeholder="1" min="0" />
        {item.unitUom && <div className="text-xs text-gray-400 mt-0.5 px-1">{item.unitUom}</div>}
      </td>

      {/* Primary Pack */}
      <td className="px-1 py-1.5 min-w-[120px]">
        <select value={item.unitPackType || ''} onChange={e => set('unitPackType', e.target.value)} className={sel}>
          <option value="">— Select —</option>
          {primaryPacks.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </td>

      {/* Secondary Pack */}
      <td className="px-1 py-1.5 min-w-[120px]">
        <select value={item.packingType || ''} onChange={e => set('packingType', e.target.value)} className={sel}>
          <option value="">— Select —</option>
          {secondaryPacks.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </td>

      {/* Units per Secondary Pack */}
      <td className="px-1 py-1.5 w-16">
        <input type="number" value={item.unitsPerCS || ''} onChange={e => set('unitsPerCS', e.target.value)}
          className={inp} placeholder="0" min="0" />
      </td>

      {/* No. of Secondary Packs — auto-calc, read-only */}
      <td className="px-2 py-2 w-16 text-center">
        <div className={`text-sm font-bold rounded px-2 py-1 ${item.totalCS ? 'bg-green-50 text-green-700 border border-green-200' : 'text-gray-300 bg-gray-50'}`}>
          {item.totalCS || '—'}
        </div>
      </td>

      {/* Label Details */}
      <td className="px-1 py-1.5 min-w-[120px]">
        <select value={item.labelType || ''} onChange={e => set('labelType', e.target.value)} className={sel}>
          {LABEL_TYPES.map(lt => <option key={lt.value} value={lt.value}>{lt.label}</option>)}
        </select>
      </td>

      {/* Delete */}
      <td className="px-2 py-2 text-center">
        <button type="button" onClick={() => onRemove(idx)}
          className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded p-1 text-xs leading-none">
          ✕
        </button>
      </td>
    </tr>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Booking form — sales team fills this
// ─────────────────────────────────────────────────────────────────────────────
const BLANK_ITEM = {
  customerProductName:'', inhouseProductName:'', inhouseProductCode:'',
  activeSpecs:'', carrier:'',
  sectionName:'', totalQty:'', totalUom:'KG',
  unitQty:'', unitUom:'KG', unitsPerCS:'', totalCS:'',
  unitPackType:'', packingType:'',
  labelType:'',
  // Dispatch-time fields (filled by inventory team, not on this form)
  batchNo:'', mfgDate:'', expDate:'', mrp:'',
}

function OrderForm({ initial, products, profiles, onSave, onCancel }) {
  const today = new Date().toISOString().split('T')[0]
  const [hdr, setHdr] = useState({
    company:            COMPANIES[0] || 'SOM',
    diNo:               '',
    customerName:       '',
    orderType:          'DOMESTIC',
    orderReceivedDate:  today,
    remarks:            '',
    ...initial,
  })
  const [items, setItems] = useState(
    initial?.items?.length
      ? initial.items.map(it => ({ ...BLANK_ITEM, ...it }))
      : [{ ...BLANK_ITEM }]
  )
  const [saving,       setSaving]       = useState(false)
  const [err,          setErr]          = useState('')
  const [cpProfiles,   setCpProfiles]   = useState([])
  const [carriers,     setCarriers]     = useState([])
  const [primaryPacks, setPrimaryPacks] = useState([])
  const [secondaryPacks,setSecondaryPacks] = useState([])
  const setH = (k, v) => setHdr(h => ({ ...h, [k]: v }))

  // Load configurable dropdown options
  useEffect(() => {
    configurableOptionsApi.list().then(r => {
      const opts = r.data || []
      setCarriers(opts.filter(o => o.category === 'CARRIER').map(o => o.value))
      setPrimaryPacks(opts.filter(o => o.category === 'PRIMARY_PACK').map(o => o.value))
      setSecondaryPacks(opts.filter(o => o.category === 'SECONDARY_PACK').map(o => o.value))
    }).catch(() => {
      // Fallback to hardcoded until migration is run
      setCarriers(['Dextrose','Talc','Lactose','HSCAS','China Clay','Diatomaceous Earth','LSP','Precipitated CaCO3','Silica'])
      setPrimaryPacks(['LD Pouch','AL Pouch','HDPE Jar','100ml Bottle (Round)','100ml Bottle (Regular)','100ml Bottle (Triangle)','200ml Bottle (Round)','200ml Bottle (Regular)','200ml Bottle (Triangle)','500ml Bottle (Round)','500ml Bottle (Regular)','500ml Bottle (Triangle)','1L Bottle (Round)','1L Bottle (Regular)','1L Bottle (Triangle)'])
      setSecondaryPacks(['W-CBB','B-CBB','OMB 30 (30kg Drum)','OMB 50 (50kg Drum)','25Kg HDPE Bag','50Kg HDPE Bag','Cartons','25L Jerry Can','50L Barrel','5L Can','10L Can','Others'])
    })
  }, [])

  // Load customer-product profiles on customer change
  useEffect(() => {
    if (!hdr.customerName?.trim()) { setCpProfiles([]); return }
    cpProfileApi.forCustomer(hdr.customerName.trim())
      .then(res => setCpProfiles(res.data || []))
      .catch(() => setCpProfiles([]))
  }, [hdr.customerName])

  // Apply profile memory to a row
  function applyProfile(idx, mem) {
    if (!mem) return
    setItems(its => its.map((it, i) => {
      if (i !== idx) return it
      const newUnitQty    = mem.unitQty    ? String(mem.unitQty)    : it.unitQty
      const newUnitUom    = mem.unitUom    || it.unitUom
      const newUnitsPerCS = mem.unitsPerCS ? String(mem.unitsPerCS) : it.unitsPerCS
      const newTotalCS    = calcTotalCS(it.totalQty, newUnitQty, newUnitsPerCS)
      return {
        ...it,
        activeSpecs:  mem.activeSpecs   || it.activeSpecs,
        carrier:      mem.carrier       || it.carrier,
        sectionName:  mem.sectionName   || it.sectionName,
        unitQty:      newUnitQty,
        unitUom:      newUnitUom,
        unitPackType: mem.primaryPack   || it.unitPackType,
        packingType:  mem.secondaryPack || it.packingType,
        unitsPerCS:   newUnitsPerCS,
        totalCS:      newTotalCS        || it.totalCS,
        totalUom:     mem.totalUom      || it.totalUom,
        labelType:    mem.labelType     || it.labelType,
      }
    }))
  }

  // Customer product picker selected — apply profile + fill inhouse fields
  function applyCpProfile(idx, profile) {
    applyProfile(idx, profile)
    if (profile.inhouseName || profile.productCode) {
      setItems(its => its.map((it, i) => i !== idx ? it : {
        ...it,
        inhouseProductName: profile.inhouseName || it.inhouseProductName,
        inhouseProductCode: profile.productCode || it.inhouseProductCode,
      }))
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (!hdr.diNo.trim())         return setErr('DI No. is required')
    if (!hdr.customerName.trim()) return setErr('Customer Name is required')
    if (items.some(it => !it.customerProductName?.trim() || !it.totalQty))
      return setErr('Each line needs a Customer Product Name and Quantity')
    setSaving(true); setErr('')
    try { await onSave({ ...hdr, items }) }
    catch (ex) { setErr(ex.message) }
    finally { setSaving(false) }
  }

  const fieldCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

  return (
    <form onSubmit={submit}>
      {err && (
        <div className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-200 mb-5">⚠ {err}</div>
      )}

      {/* ── Section 1: Order Information ──────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-green-700 text-white text-xs font-bold flex items-center justify-center shrink-0">1</div>
          <h3 className="font-semibold text-gray-800 text-sm">Order Information</h3>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">DI No. *</label>
            <input value={hdr.diNo || ''} onChange={e => setH('diNo', e.target.value)}
              className={fieldCls} placeholder="e.g. DVS/SO-25-001" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Customer Name *</label>
            <CustomerNamePicker
              value={hdr.customerName} profiles={profiles}
              onSelect={(name, company, orderType) => {
                setH('customerName', name)
                if (company)   setH('company', company)
                if (orderType) setH('orderType', orderType)
              }} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Order Type *</label>
            <select value={hdr.orderType} onChange={e => setH('orderType', e.target.value)} className={fieldCls}>
              {ORDER_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Company *</label>
            <select value={hdr.company} onChange={e => setH('company', e.target.value)} className={fieldCls}>
              {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Order Date *</label>
            <input type="date" value={hdr.orderReceivedDate || today} onChange={e => setH('orderReceivedDate', e.target.value)}
              className={fieldCls} />
          </div>
          <div className="col-span-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Order Remarks</label>
            <input value={hdr.remarks || ''} onChange={e => setH('remarks', e.target.value)}
              className={fieldCls} placeholder="Special instructions, delivery notes, terms or any other remarks…" />
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700 flex items-center gap-2">
          <span>ℹ</span>
          <span>Invoice, batch details and dispatch information will be completed by the Inventory team once the order reaches the inventory stage.</span>
        </div>
      </div>

      {/* ── Section 2: Product Details ─────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-green-700 text-white text-xs font-bold flex items-center justify-center shrink-0">2</div>
            <h3 className="font-semibold text-gray-800 text-sm">Product Details</h3>
          </div>
          <button type="button"
            onClick={() => setItems(it => [...it, { ...BLANK_ITEM }])}
            className="text-sm bg-green-700 text-white px-3 py-1.5 rounded-lg hover:bg-green-800 font-medium">
            + Add Line
          </button>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
          <table className="w-full text-sm border-collapse" style={{ minWidth: '1450px' }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-2 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center w-8">#</th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{minWidth:'160px'}}>Customer Product Name</th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{minWidth:'150px'}}>Inhouse Product Name</th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{width:'80px'}}>Order Qty</th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{width:'65px'}}>UOM</th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{minWidth:'115px'}}>Specification / CFU</th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{minWidth:'110px'}}>Carrier</th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{width:'105px'}}>Section</th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{width:'85px'}}>Unit Pack Qty</th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{minWidth:'125px'}}>Primary Pack</th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{minWidth:'125px'}}>Secondary Pack</th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{width:'80px'}}>Units per Secondary Pack</th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{width:'75px'}}>No. of Secondary Packs</th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{minWidth:'120px'}}>Label Details</th>
                <th className="px-2 py-2.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <TableRow
                  key={idx} item={item} idx={idx}
                  cpProfiles={cpProfiles}
                  carriers={carriers}
                  primaryPacks={primaryPacks}
                  secondaryPacks={secondaryPacks}
                  onChange={(i, u) => setItems(its => its.map((x, j) => j === i ? u : x))}
                  onRemove={i => setItems(its => its.filter((_, j) => j !== i))}
                  onCpProductPicked={applyCpProfile}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={15} className="px-4 py-2.5 text-xs text-gray-500">
                  <strong className="text-gray-700">{items.length}</strong> product line{items.length !== 1 ? 's' : ''}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel}
          className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
        <button type="button"
          onClick={() => { setHdr({ company: COMPANIES[0]||'SOM', diNo:'', customerName:'', orderType:'DOMESTIC', orderReceivedDate:today, remarks:'' }); setItems([{...BLANK_ITEM}]) }}
          className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          ↺ Reset
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-50"
          style={{ background: BRAND }}>
          {saving ? 'Saving…' : initial?.id ? '✓ Update Order' : '✓ Create Sales Order'}
        </button>
      </div>
    </form>
  )
}


function DispatchModal({ order, onSave, onDelete, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [saving,       setSaving]       = useState(false)
  const [invoiceNo,    setInvoiceNo]    = useState(order.invoiceNo     || '')
  const [transportName,setTransportName]= useState(order.transportName || '')
  const [dispatchedBy, setDispatchedBy] = useState(order.dispatchedBy  || '')
  const [remarks,      setRemarks]      = useState(order.remarks       || '')

  // Per-line partial dispatch state
  const [partialToggles, setPartialToggles] = useState({}) // { lineId: bool }
  const [partialQty,     setPartialQty]     = useState({}) // { lineId: secPacksStr }

  const dominantStatus = order.items.every(it => it.status === 'DISPATCHED') ? 'DISPATCHED'
    : order.items.some(it => ['READY_TO_DISPATCH','IN_INVENTORY','PACKED'].includes(it.status))
      ? order.items.find(it => ['READY_TO_DISPATCH','IN_INVENTORY','PACKED'].includes(it.status))?.status
      : order.items[0]?.status || 'PENDING'

  const lines = order.items.map(it => ({
    id:            it.id,
    productName:   it.inhouseProductName || it.customerProductName,
    totalQty:      it.totalQty,
    totalUom:      it.totalUom   || 'KG',
    unitQty:       it.unitQty    || '',
    unitUom:       it.unitUom    || 'KG',
    batchNo:       it.batchNo    || '—',
    mrp:           it.mrp        || '—',
    mfgDate:       it.mfgDate    ? new Date(it.mfgDate).toLocaleDateString('en-IN') : '—',
    expDate:       it.expDate    ? new Date(it.expDate).toLocaleDateString('en-IN') : '—',
    primaryPack:   it.unitPackType || '—',
    secondaryPack: it.packingType  || '—',
    noOfUnits:     it.unitQty      ? `${it.unitQty} ${it.unitUom || 'KG'}` : '—',
    noOfSecPacks:  it.totalCS      || '—',
    labelType:     it.labelType    ? LABEL_TYPES.find(l => l.value === it.labelType)?.label || it.labelType : '—',
    currentStatus: it.status,
    totalCSNum:    parseInt(it.totalCS) || 0,
  }))

  async function markDispatched() {
    setSaving(true)
    try {
      await salesOrderApi.patchDispatch(order.id, {
        invoiceNo, transportName, dispatchedBy, remarks,
        invoiceDate: today,
      })
      for (const line of lines) {
        const isPartial = partialToggles[line.id]
        if (isPartial) {
          const dispatched = parseInt(partialQty[line.id] || 0)
          const isFullyDispatched = dispatched >= line.totalCSNum && line.totalCSNum > 0
          await salesOrderApi.updateItem(line.id, {
            status: isFullyDispatched ? 'DISPATCHED' : line.currentStatus,
          })
        } else {
          await salesOrderApi.updateItem(line.id, { status: 'DISPATCHED' })
        }
      }
      onSave()
    } finally { setSaving(false) }
  }

  const ro = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 font-medium select-none'
  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none'
  const isAlreadyDispatched = dominantStatus === 'DISPATCHED'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl text-white" style={{ background: BRAND }}>
          <div>
            <h2 className="font-bold text-sm tracking-wide">{order.customerName} — {order.company}</h2>
            <p className="text-xs text-white/70 mt-0.5">{order.items.length} product line{order.items.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={'text-xs font-bold px-3 py-1 rounded-full ' + (STATUS_STYLE[dominantStatus] || 'bg-gray-100 text-gray-500')}>
              {STATUS_LABELS[dominantStatus] || dominantStatus}
            </span>
            <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">×</button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* ── Verification section — READ ONLY ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Production Details — Verification</p>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Read Only</span>
            </div>
            <div className="space-y-3">
              {lines.map((line, idx) => (
                <div key={line.id} className="border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                  <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: '#f0fdf4' }}>
                    <p className="text-sm font-bold" style={{ color: BRAND }}>
                      Line {idx + 1}: {line.productName}
                    </p>
                    <span className={'text-xs font-semibold px-2 py-0.5 rounded-full ' + (STATUS_STYLE[line.currentStatus] || 'bg-gray-100 text-gray-600')}>
                      {STATUS_LABELS[line.currentStatus] || line.currentStatus}
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-5 gap-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Total Qty</p>
                      <p className="text-sm font-bold text-gray-800">{line.totalQty} {line.totalUom}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Batch No.</p>
                      <p className="text-sm font-semibold text-gray-800">{line.batchNo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">MRP</p>
                      <p className="text-sm text-gray-700">{line.mrp}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Mfg. Date</p>
                      <p className="text-sm text-gray-700">{line.mfgDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Exp. Date</p>
                      <p className="text-sm text-gray-700">{line.expDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Primary Pack</p>
                      <p className="text-sm text-gray-700">{line.primaryPack}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Secondary Pack</p>
                      <p className="text-sm text-gray-700">{line.secondaryPack}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Unit Per Sec. Pack</p>
                      <p className="text-sm text-gray-700">{line.noOfUnits}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">No. of Sec. Packs</p>
                      <p className="text-sm font-semibold text-gray-800">{line.noOfSecPacks}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Label Type</p>
                      <p className="text-sm text-gray-700">{line.labelType}</p>
                    </div>
                  </div>

                  {/* Partial dispatch toggle per line */}
                  {!isAlreadyDispatched && (
                    <div className="px-4 pb-4">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <div className="relative">
                          <input type="checkbox" className="sr-only"
                            checked={!!partialToggles[line.id]}
                            onChange={e => setPartialToggles(t => ({ ...t, [line.id]: e.target.checked }))} />
                          <div className={'w-9 h-5 rounded-full transition-colors ' + (partialToggles[line.id] ? 'bg-green-500' : 'bg-gray-300')} />
                          <div className={'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ' + (partialToggles[line.id] ? 'translate-x-4' : '')} />
                        </div>
                        <span className="text-xs font-semibold text-gray-600">Partial Dispatch</span>
                      </label>
                      {partialToggles[line.id] && (
                        <div className="mt-2 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          <label className="text-xs text-amber-800 font-semibold whitespace-nowrap">Sec. Packs Dispatching Now:</label>
                          <input type="number" min="0" max={line.totalCSNum || 9999}
                            value={partialQty[line.id] || ''}
                            onChange={e => setPartialQty(q => ({ ...q, [line.id]: e.target.value }))}
                            className="w-24 border border-amber-300 rounded-lg px-2 py-1 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                            placeholder="0" />
                          {line.totalCSNum > 0 && partialQty[line.id] && (
                            <span className="text-xs text-amber-700">
                              of {line.totalCSNum} total
                              {parseInt(partialQty[line.id] || 0) >= line.totalCSNum
                                ? ' — full dispatch ✓'
                                : ` — ${line.totalCSNum - parseInt(partialQty[line.id] || 0)} remaining`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Dispatch entry fields (editable) ── */}
          {!isAlreadyDispatched && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Dispatch Entry</p>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Invoice No.</label>
                  <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className={inp} placeholder="INV-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Transport / Courier</label>
                  <input value={transportName} onChange={e => setTransportName(e.target.value)} className={inp} placeholder="Truck / courier name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Dispatched By</label>
                  <input value={dispatchedBy} onChange={e => setDispatchedBy(e.target.value)} className={inp} placeholder="Name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Remarks</label>
                  <input value={remarks} onChange={e => setRemarks(e.target.value)} className={inp} placeholder="Optional" />
                </div>
              </div>
            </div>
          )}

          {isAlreadyDispatched && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-sm text-green-800 font-semibold text-center">
              ✅ This order has been dispatched.
              {order.invoiceNo && <span className="ml-2 font-normal text-green-700">Invoice: {order.invoiceNo}</span>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={() => onDelete(order)}
            className="text-sm text-red-500 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50">
            Delete Order
          </button>
          <div className="flex gap-3">
            {!isAlreadyDispatched && (
              <button onClick={markDispatched} disabled={saving}
                className="text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50 shadow-sm"
                style={{ background: BRAND }}>
                {saving ? 'Processing…' : '🚚 Mark as Dispatched'}
              </button>
            )}
            <button onClick={onClose}
              className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function SalesOrders() {
  const [activeTab,     setActiveTab]     = useState('orders')
  const [orders,        setOrders]        = useState([])
  const [products,      setProducts]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [showForm,      setShowForm]      = useState(false)
  const [editing,       setEditing]       = useState(null)
  // Profiles: start with static data immediately; DB results (if any) merge on top
  const [profiles,      setProfiles]      = useState(STATIC_CUSTOMER_PROFILES)
  const [dispatchOrder, setDispatchOrder] = useState(null)
  const [err,           setErr]           = useState('')
  const [search,        setSearch]        = useState('')
  const [filterStatus,  setFilterStatus]  = useState('ALL')
  const [filterCompany, setFilterCompany] = useState('ALL')
  const [dispatchFilter,setDispatchFilter]= useState('ALL')
  const [sfgAlert,      setSfgAlert]      = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Companies come from COMPANIES constant — no DB call needed
      // Profiles: static data is already loaded; try to get DB extras
      const [ordRes, prodRes] = await Promise.all([
        salesOrderApi.list({}),
        productApi.list({}),
      ])
      setOrders(ordRes.data)
      setProducts(prodRes.data || [])
      // Try to load any extra DB profiles (learned from orders), merge with static
      try {
        const profRes = await customerProfileApi.list()
        if (profRes.data?.length > 0) {
          // Merge: DB entries take precedence (higher orderCount) over static
          const dbMap = {}
          for (const p of profRes.data) dbMap[p.customerName] = p
          setProfiles(prev => {
            const merged = [...prev]
            for (const p of profRes.data) {
              if (!merged.find(x => x.customerName === p.customerName)) merged.push(p)
            }
            return merged.sort((a,b) => (b.orderCount||0) - (a.orderCount||0))
          })
        }
      } catch { /* non-critical — static data is sufficient */ }
    } catch (ex) { setErr(ex.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(form) {
    let sfgResult = null
    if (editing) {
      await salesOrderApi.update(editing.id, form)
    } else {
      const res = await salesOrderApi.create(form)
      if (res?.sfgAvailability?.length) sfgResult = res.sfgAvailability
    }
    // Update customer-level memory
    if (form.customerName?.trim()) {
      try {
        await customerProfileApi.upsert({
          customerName: form.customerName.trim().toUpperCase(),
          company:   form.company   || '',
          orderType: form.orderType || 'DOMESTIC',
        })
      } catch (_) { /* non-critical */ }
    }
    // Update customer-product deep memory — key by customerProductName, store all fields
    if (form.customerName?.trim() && form.items?.length) {
      try {
        const itemsToSave = form.items.filter(it => it.customerProductName?.trim())
        if (itemsToSave.length > 0) {
          await cpProfileApi.upsertMany(
            form.customerName.trim(),
            itemsToSave.map(it => ({
              ...it,
              // new key field
              customerProductName: it.customerProductName,
              // backward-compat fields
              productCode:  it.inhouseProductCode || null,
              productName:  it.customerProductName,
              inhouseName:  it.inhouseProductName  || null,
              primaryPack:  it.unitPackType        || null,
              secondaryPack:it.packingType         || null,
            }))
          )
        }
      } catch (_) { /* non-critical */ }
    }
    setShowForm(false); setEditing(null)
    if (sfgResult) setSfgAlert(sfgResult)
    load()
  }

  async function handleDelete(order) {
    if (!confirm('Delete order ' + order.diNo + '?')) return
    await salesOrderApi.remove(order.id)
    setDispatchOrder(null); load()
  }

  async function handleStatusChange(itemId, status) {
    await salesOrderApi.updateItem(itemId, { status })
    load()
  }

  async function handleDispatchSave() {
    setDispatchOrder(null); load()
  }

  async function handleAddCompany(code, name) {
    // Persist to DB but COMPANIES constant already has the 5 core ones
    try { await salesOrderApi.addCompany(code, name) } catch { /* non-critical */ }
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const summary = STATUSES.reduce((acc, s) => {
    acc[s] = orders.reduce((n, o) => n + o.items.filter(it => it.status === s).length, 0)
    return acc
  }, {})

  const totalOpen = orders.filter(o => o.items.some(it => it.status !== 'DISPATCHED')).length

  // Orders tab — active/open orders
  const ordersVisible = orders.filter(o => {
    const matchSearch = !search || o.customerName.toLowerCase().includes(search.toLowerCase()) || o.diNo.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'ALL' || o.items.some(it => it.status === filterStatus)
    const matchCo = filterCompany === 'ALL' || o.company === filterCompany
    return matchSearch && matchStatus && matchCo
  })

  // Dispatch tab — all orders, optionally filtered by status
  const dispatchVisible = orders.filter(o => {
    if (dispatchFilter === 'ALL') return true
    return o.items.some(it => it.status === dispatchFilter)
  })

  // History tab — all orders with search
  const historyVisible = orders.filter(o =>
    !search || o.customerName.toLowerCase().includes(search.toLowerCase()) || o.diNo.toLowerCase().includes(search.toLowerCase())
  )

  const TABS = [
    { key: 'orders',   label: 'Sales Orders', count: totalOpen },
    { key: 'dispatch', label: 'Dispatch',      count: summary['READY_TO_DISPATCH'] || 0 },
    { key: 'history',  label: 'Order History', count: orders.length },
  ]

  const etdDays = (dateStr) => {
    if (!dateStr) return null
    return Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Sales Orders</h1>
        <p className="text-sm text-gray-500 mt-0.5">SOM Phytopharma — {orders.length} orders total</p>
      </div>

      {err && <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{err}</div>}

      {/* SFG Availability Alert — shown after creating order when SFG stock exists */}
      {sfgAlert && (
        <div className="mb-4 rounded-xl border border-green-300 bg-green-50 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-bold text-green-800 mb-2">
                ✅ SFG Stock Available — Planner Action Required
              </p>
              <div className="space-y-1">
                {sfgAlert.map((s, i) => (
                  <div key={i} className="text-sm text-green-700 flex gap-3">
                    <span className="font-semibold">{s.productCode}</span>
                    <span>{s.productName}</span>
                    <span className="ml-auto text-green-900 font-semibold">
                      {s.sfgQty} {s.uom} in SFG
                      {s.orderedQty && (
                        <span className={s.sfgQty >= s.orderedQty ? ' text-green-600' : ' text-orange-600'}>
                          {' '}(ordered {s.orderedQty} {s.uom}
                          {s.sfgQty >= s.orderedQty ? ' — fully covered ✓' : ' — partial'})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-green-600 mt-2">
                Inform the planner — these products can be packed directly from SFG stock.
              </p>
            </div>
            <button onClick={() => setSfgAlert(null)}
              className="text-green-500 hover:text-green-800 text-lg leading-none mt-0.5">×</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b border-gray-200">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setShowForm(false) }}
            className={'px-5 py-3 text-sm font-semibold border-b-2 transition-colors ' + (
              activeTab === tab.key
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}>
            {tab.label}
            {tab.count > 0 && (
              <span className={'ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full ' + (
                activeTab === tab.key ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              )}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── SALES ORDERS TAB ──────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div>
          {/* New order form */}
          {showForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-800 mb-5">
                {editing ? 'Edit — ' + editing.soId : 'New Sales Order'}
              </h2>
              <OrderForm initial={editing || undefined} products={products} profiles={profiles}
                onSave={handleSave}
                onCancel={() => { setShowForm(false); setEditing(null) }} />
            </div>
          )}

          {/* Status summary */}
          <div className="grid grid-cols-4 gap-3 mb-5 lg:grid-cols-7">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setFilterStatus(prev => prev === s ? 'ALL' : s)}
                className={'text-center p-3 rounded-xl border transition ' + (
                  filterStatus === s
                    ? STATUS_STYLE[s] + ' border-current'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                )}>
                <div className="text-xl font-bold text-gray-900">{summary[s]}</div>
                <div className={'text-xs mt-0.5 ' + (filterStatus === s ? '' : 'text-gray-500')}>{STATUS_LABELS[s]}</div>
              </button>
            ))}
          </div>

          {/* Filters + New Order button inline */}
          <div className="flex flex-wrap gap-3 mb-5 items-center">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search customer or order…"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-52 focus:ring-2 focus:ring-green-500 focus:outline-none" />
            <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="ALL">All Companies</option>
              {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex-1" />
            {!showForm && (
              <button onClick={() => { setEditing(null); setShowForm(true) }}
                className="text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 flex items-center gap-1.5"
                style={{ background: BRAND }}>
                + New Order
              </button>
            )}
          </div>

          {loading ? <div className="text-center py-16 text-gray-400">Loading…</div>
          : ordersVisible.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">📋</div>
              <p className="font-medium">No orders found</p>
              <p className="text-sm mt-1">Click "+ New Order" to add one</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ordersVisible.map(order => {
                const days = etdDays(order.estimatedDispatchDate)
                const overdue = days !== null && days < 0
                return (
                  <div key={order.id}
                    className={'bg-white border rounded-xl overflow-hidden ' + (overdue ? 'border-red-300' : 'border-gray-200')}>
                    <div className="flex items-start justify-between px-5 py-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-gray-900">{order.diNo}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{order.company}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">{order.orderType}</span>
                        </div>
                        <div className="text-sm font-semibold text-gray-700">{order.customerName}</div>
                        <div className="flex gap-4 mt-1 text-xs text-gray-400 flex-wrap">
                          <span>{order.items.length} product{order.items.length !== 1 ? 's' : ''}</span>
                          {days !== null && (
                            <span className={overdue ? 'text-red-500 font-semibold' : days <= 7 ? 'text-orange-500 font-semibold' : ''}>
                              ETD: {fmtDate(order.estimatedDispatchDate)}
                              {overdue ? ' (' + Math.abs(days) + 'd overdue)' : days === 0 ? ' (today)' : ' (' + days + 'd)'}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {order.items.map(it => (
                            <span key={it.id} className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (STATUS_STYLE[it.status] || 'bg-gray-100 text-gray-600')}>
                              {it.inhouseProductName} — {STATUS_LABELS[it.status] || it.status}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        <button onClick={() => { setEditing(order); setShowForm(true) }}
                          className="text-xs border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                          Edit
                        </button>
                        <button onClick={() => { setDispatchOrder(order); setActiveTab('dispatch') }}
                          className="text-xs text-white px-3 py-1.5 rounded-lg font-semibold"
                          style={{ background: BRAND }}>
                          Dispatch
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── DISPATCH TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'dispatch' && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <p className="text-sm text-gray-500 flex-1">Click any order to open the dispatch form.</p>
            <select value={dispatchFilter} onChange={e => setDispatchFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="ALL">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>

          {loading ? <div className="text-center py-16 text-gray-400">Loading…</div>
          : dispatchVisible.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">🚚</div>
              <p className="font-medium">No orders</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 font-semibold border-b border-gray-100" style={{ background: '#f8fdf8' }}>
                    <th className="text-left px-4 py-3">DI No.</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Customer</th>
                    <th className="text-left px-4 py-3">Products</th>
                    <th className="text-right px-4 py-3">Total Qty</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">ETD</th>
                    <th className="text-center px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatchVisible.map(order => {
                    const days = etdDays(order.estimatedDispatchDate)
                    const overdue = days !== null && days < 0
                    const totalQty = order.items.reduce((n, it) => n + parseFloat(it.totalQty || 0), 0)
                    return (
                      <tr key={order.id} className="border-b border-gray-50 hover:bg-green-50 transition cursor-pointer"
                        onClick={() => setDispatchOrder(order)}>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700">{order.diNo}</td>
                        <td className="px-4 py-3 text-gray-500">{fmtDate(order.orderReceivedDate)}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{order.customerName}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {order.items.map(it => it.inhouseProductName).join(', ')}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {totalQty} {order.items[0]?.totalUom || 'KG'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={'text-xs font-semibold px-2 py-0.5 rounded-full ' + (STATUS_STYLE[order.items[0]?.status] || 'bg-gray-100 text-gray-600')}>
                            {STATUS_LABELS[order.items[0]?.status] || order.items[0]?.status}
                          </span>
                        </td>
                        <td className={'px-4 py-3 text-xs ' + (overdue ? 'text-red-500 font-semibold' : days !== null && days <= 7 ? 'text-orange-500 font-semibold' : 'text-gray-500')}>
                          {fmtDate(order.estimatedDispatchDate)}
                          {days !== null && (overdue ? ' (' + Math.abs(days) + 'd overdue)' : days <= 7 ? ' (' + days + 'd)' : '')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={e => { e.stopPropagation(); setDispatchOrder(order) }}
                            className="text-xs text-white px-3 py-1.5 rounded-lg font-semibold"
                            style={{ background: BRAND }}>
                            Open
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ORDER HISTORY TAB ─────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div>
          <div className="flex flex-wrap gap-3 mb-5">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search customer or order…"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-52 focus:ring-2 focus:ring-green-500 focus:outline-none" />
            <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="ALL">All Companies</option>
              {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {loading ? <div className="text-center py-16 text-gray-400">Loading…</div>
          : historyVisible.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No orders found.</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 font-semibold border-b border-gray-100" style={{ background: '#f8fdf8' }}>
                    <th className="text-left px-4 py-3">DI No.</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Customer</th>
                    <th className="text-left px-4 py-3">Products</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-right px-4 py-3">Qty</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">ETD</th>
                    <th className="text-left px-4 py-3">Invoice</th>
                    <th className="text-center px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {historyVisible.map(order => {
                    const days = etdDays(order.estimatedDispatchDate)
                    const overdue = days !== null && days < 0
                    const totalQty = order.items.reduce((n, it) => n + parseFloat(it.totalQty || 0), 0)
                    return (
                      <tr key={order.id} className="border-b border-gray-50 hover:bg-green-50 transition">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700">{order.diNo}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(order.orderReceivedDate)}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{order.customerName}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                          {order.items.map(it => it.inhouseProductName).join(', ')}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{order.orderType}</td>
                        <td className="px-4 py-3 text-right font-semibold text-xs">{totalQty} {order.items[0]?.totalUom || 'KG'}</td>
                        <td className="px-4 py-3">
                          <span className={'text-xs font-semibold px-2 py-0.5 rounded-full ' + (STATUS_STYLE[order.items[0]?.status] || 'bg-gray-100 text-gray-600')}>
                            {STATUS_LABELS[order.items[0]?.status] || order.items[0]?.status}
                          </span>
                        </td>
                        <td className={'px-4 py-3 text-xs ' + (overdue ? 'text-red-500 font-semibold' : 'text-gray-500')}>
                          {fmtDate(order.estimatedDispatchDate)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{order.invoiceNo || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => setDispatchOrder(order)}
                            className="text-xs border border-gray-300 px-2 py-1 rounded-lg hover:bg-gray-50">
                            Edit
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Dispatch modal */}
      {dispatchOrder && (
        <DispatchModal
          order={dispatchOrder}
          onSave={handleDispatchSave}
          onDelete={handleDelete}
          onClose={() => setDispatchOrder(null)} />
      )}
    </div>
  )
}