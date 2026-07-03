import { useState, useEffect, useRef } from 'react'
import { PLANT_CONFIG, PLANT_KEYS, SHIFTS } from '../../data/plantConfig.js'
import './AddTaskDrawer.css'
import { genId, sfgLoad } from '../../utils/storage.js'
import { todayISO } from '../../utils/date.js'
import { generateTaskId } from '../../utils/batchCode.js'
import { planTasksApi } from '../../../../../api/production.js'
import { Button, IconButton } from '../../../../../components/ui'
import { X, Save } from 'lucide-react'

// ── Form primitive helpers ────────────────────────────────────────────────────
function Field({ label, children, hint }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      {children}
      {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
    </div>
  )
}

function Inp({ className = '', ...props }) {
  return (
    <input {...props}
      className={`px-3 py-2 border-[1.5px] border-gray-200 rounded-lg text-sm font-[inherit] text-gray-800 bg-white
        focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition ${className}`}
    />
  )
}
function Sel({ className = '', ...props }) {
  return (
    <select {...props}
      className={`px-3 py-2 border-[1.5px] border-gray-200 rounded-lg text-sm font-[inherit] text-gray-800 bg-white
        focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition ${className}`}
    />
  )
}
function SecLabel({ children }) {
  return (
    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1.5 mb-2.5 mt-4">
      {children}
    </div>
  )
}

// ── Autocomplete input ────────────────────────────────────────────────────────
function AutocompleteInput({ value, onChange, onSelect, fetchFn, placeholder, renderOption, className = '' }) {
  const [results, setResults] = useState([])
  const [show, setShow]       = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useRef(null)

  function handleChange(v) {
    onChange(v)
    clearTimeout(timer.current)
    if (!v.trim()) { setResults([]); setShow(false); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetchFn(v)
        setResults(res.data || [])
        setShow(true)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 280)
  }

  function pick(item) {
    setShow(false)
    setResults([])
    onSelect(item)
  }

  return (
    <div className="relative">
      <Inp
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => { if (results.length) setShow(true) }}
        onBlur={() => setTimeout(() => setShow(false), 180)}
        placeholder={placeholder}
        className={`w-full ${className}`}
      />
      {loading && (
        <span className="absolute right-3 top-2.5 text-[10px] text-gray-400">searching…</span>
      )}
      {show && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {results.map((item, i) => (
            <button key={i} type="button"
              onMouseDown={() => pick(item)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0">
              {renderOption(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AddTaskDrawer({ task, defaultDate, onSave, onClose }) {
  const isEdit = !!task

  const [plant,           setPlant]           = useState(task?.plant        || 'Nano')
  const [date,            setDate]            = useState(task?.date         || defaultDate || todayISO())
  const [diNo,            setDiNo]            = useState(task?.diNo         || '')
  const [shift,           setShift]           = useState(task?.shift        || 'General')
  const [productName,     setProductName]     = useState(task?.productName  || '')
  const [batchCode,       setBatchCode]       = useState(task?.batchCode    || '')
  const [qty,             setQty]             = useState(task?.qty          || '')
  const [process,         setProcess]         = useState(task?.process      || '')
  const [incharge,        setIncharge]        = useState(task?.incharge     || '')
  const [equipment,       setEquipment]       = useState(task?.equipment    || '')
  const [location,        setLocation]        = useState(task?.location     || '')
  const [carrier,         setCarrier]         = useState(task?.carrier      || '')
  const [specs,           setSpecs]           = useState(task?.specs        || '')
  const [status,          setStatus]          = useState(task?.status       || 'Not Started')
  const [remarks,         setRemarks]         = useState(task?.remarks      || '')
  const [primaryPack,     setPrimaryPack]     = useState(task?.primaryPack     || '')
  const [inners,          setInners]          = useState(task?.inners          || '')
  const [secondaryPack,   setSecondaryPack]   = useState(task?.secondaryPack   || '')
  const [unitPackQty,     setUnitPackQty]     = useState(task?.unitPackQty     || '')
  const [noUnits,         setNoUnits]         = useState(task?.noUnits         || '')
  const [unitsPerSecPack, setUnitsPerSecPack] = useState(task?.unitsPerSecPack || '')
  const [totalSecPacks,   setTotalSecPacks]   = useState(task?.totalSecPacks   || '')
  const [labels,          setLabels]          = useState(task?.labels          || '')
  const [packAfter,       setPackAfter]       = useState(task?.packAfter       || 'YES')
  const [sfgSourceId,     setSfgSourceId]     = useState(task?.sfgSourceId     || '')
  const [sfgHint,         setSfgHint]         = useState('')

  // DI → product picker
  const [diItems,        setDiItems]        = useState([])
  const [loadingDiItems, setLoadingDiItems] = useState(false)
  const [packingInfo,    setPackingInfo]    = useState(null) // packing details from SO after DI selection

  // Live data from backend
  const [equipmentList, setEquipmentList] = useState([])
  const [saving,        setSaving]        = useState(false)
  const [saveErr,       setSaveErr]       = useState('')

  const cfg = PLANT_CONFIG[plant]

  // Load equipment from backend when plant changes
  useEffect(() => {
    planTasksApi.searchEquipment(plant)
      .then(r => setEquipmentList((r.data || []).map(e => e.equipName)))
      .catch(() => setEquipmentList(cfg.equipment || []))
  }, [plant])

  // Reset process / incharge / equipment when plant changes (add mode only)
  useEffect(() => {
    if (!isEdit) {
      setProcess(cfg.process[0] || '')
      setIncharge(cfg.incharge[0] || '')
      setEquipment('')
      setLocation('')
      setCarrier('')
    }
  }, [plant])

  // Auto-calculate packing units
  useEffect(() => {
    const q = parseFloat(qty) || 0
    const u = parseFloat(unitPackQty) || 0
    if (q > 0 && u > 0) {
      const nu = Math.ceil(q / u)
      setNoUnits(String(nu))
      const ups = parseFloat(unitsPerSecPack) || 0
      if (ups > 0) setTotalSecPacks(String(Math.ceil(nu / ups)))
    }
  }, [qty, unitPackQty, unitsPerSecPack])

  // SFG availability hint
  useEffect(() => {
    if (!cfg.sfgEligible || !productName.trim()) return
    const matches = sfgLoad().filter(s =>
      s.status !== 'Consumed' && s.qtyRemaining > 0 &&
      s.productName.toLowerCase() === productName.toLowerCase()
    )
    setSfgHint(matches.length > 0
      ? `✓ ${matches.length} SFG batch(es) available for "${productName}"`
      : 'No SFG stock found — will be fresh formulation/packing.')
  }, [productName, plant])

  const availableSfg = sfgLoad().filter(s => s.status !== 'Consumed' && s.qtyRemaining > 0)

  function handleSfgSelect(id) {
    setSfgSourceId(id)
    if (!id) return
    const entry = availableSfg.find(s => s.id === id)
    if (!entry) return
    setBatchCode(entry.batchCode)
    if (!qty) setQty(String(entry.qtyRemaining))
    setSfgHint(`Sourcing: ${entry.batchCode} — ${entry.qtyRemaining} ${entry.qtyUom} @ ${entry.location || '—'}`)
  }

  async function handleSave() {
    if (!plant || !date || !productName.trim() || !qty || !process || !incharge) {
      setSaveErr('Fill all required fields marked with *')
      return
    }
    setSaving(true)
    setSaveErr('')
    try {
      const taskId = isEdit ? task.taskId : generateTaskId(plant, date)
      const batchKey = ['Powder', 'Granules'].includes(plant)
        ? `${productName}|${carrier}|${specs}`
        : productName

      const payload = {
        taskId,
        plant, date, diNo, shift,
        productName: productName.trim(),
        batchCode: batchCode || `${plant.slice(0,2).toUpperCase()}-${date.replace(/-/g,'')}-${Math.random().toString(36).slice(2,5).toUpperCase()}`,
        batchKey,
        qty: parseFloat(qty),
        qtyUom: cfg.qtyLabel?.match(/\((.+?)\)/)?.[1] || '',
        process, incharge, equipment, location, carrier, specs, status, remarks,
        primaryPack, inners, secondaryPack, unitPackQty, noUnits,
        unitsPerSecPack, totalSecPacks, labels,
        packAfter: cfg.sfgEligible ? packAfter : '',
        sfgSourceId,
        sent: isEdit ? task.sent : false,
        timerStart: isEdit ? task.timerStart : null,
        timerEnd: isEdit ? task.timerEnd : null,
        bmrSubmitted: isEdit ? task.bmrSubmitted : false,
        bmrSubmittedAt: isEdit ? task.bmrSubmittedAt : null,
        sentToQc: isEdit ? task.sentToQc : false,
        sentToQcAt: isEdit ? task.sentToQcAt : null,
      }

      let saved
      if (isEdit) {
        const r = await planTasksApi.update(task.id, payload)
        saved = r.data
      } else {
        const r = await planTasksApi.create(payload)
        saved = r.data
      }
      onSave(saved)
      onClose()
    } catch (e) {
      setSaveErr(e.response?.data?.error || e.message)
    } finally {
      setSaving(false)
    }
  }

  const showPacking       = cfg.fields?.includes('packing')
  const showCarrier       = cfg.fields?.includes('carrier')
  const showSpecs         = cfg.fields?.includes('specs')
  const showLocation      = cfg.fields?.includes('location')
  const isFormulation     = process === 'Formulation'
  const isPacking         = process === 'Packing'
  const showPackAfterWrap = cfg.sfgEligible && isFormulation
  const showPackingFields = showPacking && (!cfg.sfgEligible || !isFormulation || packAfter !== 'NO')
  const showSfgPicker     = cfg.sfgEligible && isPacking

  // Effective equipment list: backend first, fallback to config
  const effectiveEquipment = equipmentList.length > 0 ? equipmentList : (cfg.equipment || [])

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl flex flex-col shadow-2xl overflow-hidden"
           style={{ maxHeight: 'calc(100vh - 48px)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white z-10 rounded-t-2xl">
          <span className="font-bold text-base text-gray-900">
            {isEdit ? `Edit Task — ${task.taskId}` : 'Add New Task'}
          </span>
          <IconButton icon={X} tooltip="Close" onClick={onClose} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {saveErr && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{saveErr}</div>
          )}

          <SecLabel>Basic Details</SecLabel>
          <div className="grid grid-cols-2 gap-3 mb-1">
            <Field label="Plant *">
              <Sel value={plant} onChange={e => setPlant(e.target.value)}>
                {PLANT_KEYS.map(p => <option key={p}>{p}</option>)}
              </Sel>
            </Field>
            <Field label="Date *">
              <Inp type="date" value={date} onChange={e => setDate(e.target.value)} />
            </Field>
            <Field label="DI Number" hint="Type to search sales orders">
              <AutocompleteInput
                value={diNo}
                onChange={v => { setDiNo(v); if (!v.trim()) { setDiItems([]); setPackingInfo(null) } }}
                onSelect={async so => {
                  setDiNo(so.diNumber)
                  // Auto-fill plant from sectionName
                  if (so.sectionName) {
                    const sectionToPlant = {
                      NANO: 'Nano', BOTANICAL: 'Botanical',
                      LIQUID: 'Liquid', POWDER: 'Powder', GRANULES: 'Granules',
                    }
                    const autoPlant = sectionToPlant[so.sectionName.toUpperCase()]
                    if (autoPlant && PLANT_KEYS.includes(autoPlant)) setPlant(autoPlant)
                  }
                  // Fetch all products for this DI
                  setDiItems([])
                  setLoadingDiItems(true)
                  try {
                    const r = await planTasksApi.getSalesOrderItems(so.diNumber)
                    const items = r.data || []
                    if (items.length === 1) {
                      const it = items[0]
                      setProductName(it.productName)
                      if (it.orderQty) setQty(String(it.orderQty))
                      if (it.primaryPack)   setPrimaryPack(it.primaryPack)
                      if (it.secondaryPack) setSecondaryPack(it.secondaryPack)
                      if (it.unitPackQty)   setUnitPackQty(String(it.unitPackQty))
                      if (it.labelType)     setLabels(it.labelType)
                      setPackingInfo({ primaryPack: it.primaryPack, secondaryPack: it.secondaryPack, unitPackQty: it.unitPackQty, labelType: it.labelType })
                    } else {
                      setDiItems(items)
                    }
                  } catch { /* ignore */ }
                  finally { setLoadingDiItems(false) }
                }}
                fetchFn={q => planTasksApi.searchSalesOrders(q)}
                placeholder="e.g. LT-26-018"
                renderOption={so => (
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className="font-semibold text-blue-700">{so.diNumber}</span>
                    {so.sectionName && (
                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase">
                        {so.sectionName}
                      </span>
                    )}
                    <span className="text-gray-600 text-[12px]">{so.productName}</span>
                    {so.customerName && <span className="text-gray-400 text-[11px]">— {so.customerName}</span>}
                    {so.orderQty && <span className="text-gray-400 text-[11px]">({so.orderQty} {so.qtyUnit})</span>}
                  </div>
                )}
              />
            </Field>
            <Field label="Shift">
              <Sel value={shift} onChange={e => setShift(e.target.value)}>
                {SHIFTS.map(s => <option key={s}>{s}</option>)}
              </Sel>
            </Field>
          </div>

          {/* DI product picker — shown when a DI with multiple products is selected */}
          {(loadingDiItems || diItems.length > 0) && (
            <div className="mt-2 mb-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">
                {loadingDiItems ? 'Loading products…' : `Select product from DI ${diNo}`}
              </div>
              {!loadingDiItems && (
                <div className="flex flex-col gap-1.5">
                  {diItems.map((item, i) => (
                    <button key={i} type="button"
                      onClick={() => {
                        setProductName(item.productName)
                        if (item.orderQty) setQty(String(item.orderQty))
                        if (item.sectionName) {
                          const sectionToPlant = {
                            NANO: 'Nano', BOTANICAL: 'Botanical',
                            LIQUID: 'Liquid', POWDER: 'Powder', GRANULES: 'Granules',
                          }
                          const autoPlant = sectionToPlant[item.sectionName.toUpperCase()]
                          if (autoPlant && PLANT_KEYS.includes(autoPlant)) setPlant(autoPlant)
                        }
                        if (item.primaryPack)   setPrimaryPack(item.primaryPack)
                        if (item.secondaryPack) setSecondaryPack(item.secondaryPack)
                        if (item.unitPackQty)   setUnitPackQty(String(item.unitPackQty))
                        if (item.labelType)     setLabels(item.labelType)
                        setPackingInfo({ primaryPack: item.primaryPack, secondaryPack: item.secondaryPack, unitPackQty: item.unitPackQty, labelType: item.labelType })
                        setDiItems([])
                      }}
                      className="w-full text-left px-3 py-2.5 bg-white border-[1.5px] border-gray-200 rounded-lg
                        hover:border-blue-500 hover:bg-blue-50 transition text-sm flex items-center justify-between group">
                      <span className="font-medium text-gray-800 group-hover:text-blue-700">{item.productName}</span>
                      {item.orderQty != null && (
                        <span className="text-gray-400 text-[12px] shrink-0 ml-2">
                          {item.orderQty} {item.qtyUnit}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Packing info banner — shown after a product is chosen from a DI */}
          {packingInfo !== null && !loadingDiItems && diItems.length === 0 && (
            <div className={`mt-2 mb-3 rounded-xl border px-4 py-3 ${
              (packingInfo.primaryPack || packingInfo.secondaryPack || packingInfo.unitPackQty)
                ? 'border-green-200 bg-green-50'
                : 'border-amber-200 bg-amber-50'
            }`}>
              {(packingInfo.primaryPack || packingInfo.secondaryPack || packingInfo.unitPackQty) ? (
                <>
                  <div className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1.5">
                    Packing details auto-filled from sales order
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-green-800">
                    {packingInfo.primaryPack   && <span>Primary: <strong>{packingInfo.primaryPack}</strong></span>}
                    {packingInfo.unitPackQty   && <span>Unit pack: <strong>{packingInfo.unitPackQty} kg</strong></span>}
                    {packingInfo.secondaryPack && <span>Secondary: <strong>{packingInfo.secondaryPack}</strong></span>}
                    {packingInfo.labelType     && <span>Label: <strong>{packingInfo.labelType}</strong></span>}
                  </div>
                </>
              ) : (
                <div className="text-[12px] text-amber-800">
                  <span className="font-semibold">No packing details in sales order.</span>
                  <span className="ml-1 text-amber-700">Packing materials are available in the company — please coordinate with the packaging team.</span>
                </div>
              )}
            </div>
          )}

          <SecLabel>Product &amp; Batch</SecLabel>
          <div className="grid grid-cols-2 gap-3 mb-1">
            <Field label="Product Name *" hint="Type to search product master">
              <AutocompleteInput
                value={productName}
                onChange={setProductName}
                onSelect={p => setProductName(p.productName)}
                fetchFn={q => planTasksApi.searchProducts(q, plant)}
                placeholder="e.g. Kohinoor, Trichoderma..."
                renderOption={p => (
                  <div>
                    <span className="font-semibold">{p.productName}</span>
                    {p.productCode && <span className="text-gray-400 ml-2 font-mono text-[11px]">{p.productCode}</span>}
                  </div>
                )}
              />
            </Field>
            <Field label="Batch Code">
              <Inp value={batchCode} onChange={e => setBatchCode(e.target.value)} placeholder="Auto-generated if blank" />
            </Field>
            <Field label={cfg.qtyLabel || 'Total Qty *'}>
              <Inp type="number" step="0.001" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Process *">
              <Sel value={process} onChange={e => setProcess(e.target.value)}>
                {cfg.process.map(p => <option key={p}>{p}</option>)}
              </Sel>
            </Field>
          </div>

          <SecLabel>Assignment</SecLabel>
          <div className="grid grid-cols-2 gap-3 mb-1">
            <Field label="Batch Incharge *">
              <Sel value={incharge} onChange={e => setIncharge(e.target.value)}>
                {cfg.incharge.map(i => <option key={i}>{i}</option>)}
              </Sel>
            </Field>
            <Field label={cfg.equipLabel || 'Reactor / Vessel'}>
              <Sel value={equipment} onChange={e => setEquipment(e.target.value)}>
                <option value="">— Select —</option>
                {effectiveEquipment.map(e => <option key={e}>{e}</option>)}
              </Sel>
            </Field>
          </div>

          {showLocation && cfg.location && (
            <>
              <SecLabel>Location</SecLabel>
              <div className="mb-1">
                <Field label="Location *">
                  <Sel value={location} onChange={e => setLocation(e.target.value)}>
                    <option value="">— Select —</option>
                    {cfg.location.map(l => <option key={l}>{l}</option>)}
                  </Sel>
                </Field>
              </div>
            </>
          )}

          {(showCarrier || showSpecs) && (
            <>
              <SecLabel>Product Specifications</SecLabel>
              <div className="grid grid-cols-2 gap-3 mb-1">
                {showCarrier && cfg.carrier && (
                  <Field label="Carrier">
                    <Sel value={carrier} onChange={e => setCarrier(e.target.value)}>
                      <option value="">— Select —</option>
                      {cfg.carrier.map(c => <option key={c}>{c}</option>)}
                    </Sel>
                  </Field>
                )}
                {showSpecs && (
                  <Field label="Specs (CFU/g)" hint="e.g. 1.00E+09">
                    <Inp value={specs} onChange={e => setSpecs(e.target.value)} placeholder="e.g. 1.00E+09" />
                  </Field>
                )}
              </div>
            </>
          )}

          {showPackAfterWrap && (
            <>
              <SecLabel>SFG / Packing Decision</SecLabel>
              <div className="mb-3">
                <Field label="Packing Also? (this formulation batch)">
                  <Sel value={packAfter} onChange={e => setPackAfter(e.target.value)}>
                    <option value="YES">Yes — Pack immediately after formulation</option>
                    <option value="NO">No — Store as SFG for later packing</option>
                  </Sel>
                </Field>
                {packAfter === 'NO' && (
                  <p className="text-[11px] text-blue-600 mt-1 bg-blue-50 px-3 py-2 rounded-lg">
                    After BMR sign-off, the post-sieving quantity is stored as SFG for a future packing task.
                  </p>
                )}
              </div>
            </>
          )}

          {showSfgPicker && (
            <>
              <SecLabel>Pack from SFG Stock</SecLabel>
              <div className="mb-3">
                <Field label="Select SFG Batch (optional)" hint={sfgHint}>
                  <Sel value={sfgSourceId} onChange={e => handleSfgSelect(e.target.value)}>
                    <option value="">— Not from SFG —</option>
                    {availableSfg.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.productName} — {s.batchCode} — {s.qtyRemaining} {s.qtyUom} @ {s.location || '—'}
                      </option>
                    ))}
                  </Sel>
                </Field>
              </div>
            </>
          )}

          {showPackingFields && (
            <>
              <SecLabel>Packing Details</SecLabel>
              <div className="grid grid-cols-3 gap-3 mb-1">
                <Field label="Primary Pack">
                  <Sel value={primaryPack} onChange={e => setPrimaryPack(e.target.value)}>
                    <option value="">— Select —</option>
                    {(cfg.primaryPack || []).map(p => <option key={p}>{p}</option>)}
                  </Sel>
                </Field>
                {cfg.inners && (
                  <Field label="Inners">
                    <Sel value={inners} onChange={e => setInners(e.target.value)}>
                      <option value="">— Select —</option>
                      {cfg.inners.map(i => <option key={i}>{i}</option>)}
                    </Sel>
                  </Field>
                )}
                <Field label="Secondary Pack">
                  <Sel value={secondaryPack} onChange={e => setSecondaryPack(e.target.value)}>
                    <option value="">— Select —</option>
                    {(cfg.secondaryPack || []).map(s => <option key={s}>{s}</option>)}
                  </Sel>
                </Field>
                <Field label={`Unit Pack Qty (${plant === 'Liquid' ? 'L' : 'kg'})`}>
                  <Inp type="number" step="0.001" value={unitPackQty} onChange={e => setUnitPackQty(e.target.value)} placeholder="e.g. 0.1" />
                </Field>
                <Field label="No. of Units">
                  <Inp value={noUnits} readOnly className="bg-gray-50 text-gray-500" />
                </Field>
                <Field label="Units per Secondary Pack">
                  <Inp type="number" step="1" value={unitsPerSecPack} onChange={e => setUnitsPerSecPack(e.target.value)} placeholder="e.g. 100" />
                </Field>
                <Field label="Total Secondary Packs">
                  <Inp value={totalSecPacks} readOnly className="bg-gray-50 text-gray-500" />
                </Field>
                <Field label="Labels">
                  <Sel value={labels} onChange={e => setLabels(e.target.value)}>
                    <option value="">— Select —</option>
                    {(cfg.labels || []).map(l => <option key={l}>{l}</option>)}
                  </Sel>
                </Field>
              </div>
            </>
          )}

          <SecLabel>Status &amp; Notes</SecLabel>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Field label="Status">
              <Sel value={status} onChange={e => setStatus(e.target.value)}>
                {(cfg.statuses || []).map(s => <option key={s}>{s}</option>)}
              </Sel>
            </Field>
            <Field label="Remarks / Instructions">
              <Inp value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Notes for the plant team..." />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-white flex justify-end gap-3 rounded-b-2xl">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={Save} onClick={handleSave} loading={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update Task' : 'Save Task'}
          </Button>
        </div>
      </div>
    </div>
  )
}
