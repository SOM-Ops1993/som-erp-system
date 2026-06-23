import { useState, useEffect, useCallback, useRef } from 'react'
import Pagination from '../../../components/erp/Pagination.jsx'
import { planEngineApi as planningApi } from '../../../api/planning.js'
import BackButton from '../../../components/erp/BackButton.jsx'
import { indentApi, productionApi } from '../../../api/production.js'
import { equipmentApi } from '../../../api/masters.js'
import { employeeApi } from '../../../api/hr.js'
import { microbialSfgApi } from '../../../api/microbial.js'
import { bomSendApi } from '../../../api/sales.js'

// ── Constants ─────────────────────────────────────────────────────────────────
const SECTIONS = ['NANO', 'BOTANICAL', 'LIQUID', 'POWDER', 'GRANULES']
const SHIFTS = [
  { value: 'A', label: 'A — 6:00 AM to 2:00 PM' },
  { value: 'G', label: 'G — 9:00 AM to 5:30 PM' },
  { value: 'B', label: 'B — 2:00 PM to 10:00 PM' },
  { value: 'C', label: 'C — 10:00 PM to 6:00 AM' },
]

const TASK_STATUSES = ['DRAFT','PLANNED','RM_READY','ISSUED','IN_PROCESS','AWAITING_QC','QC_PASSED','COMPLETED','QC_FAILED','REWORK','REJECTED','CANCELLED']
const ISSUE_STATUSES = ['BOM_NOT_GENERATED','BOM_GENERATED','SENT_TO_STORES','PARTIALLY_ISSUED','FULLY_ISSUED']
const QC_STATUSES    = ['PENDING','PASS','FAIL','RETEST','HOLD']

const SECTION_ICON = { NANO:'🔬', BOTANICAL:'🌿', LIQUID:'💧', POWDER:'🧪', GRANULES:'🌾' }
const SECTION_BAR  = { NANO:'bg-blue-500', BOTANICAL:'bg-green-500', LIQUID:'bg-cyan-500', POWDER:'bg-purple-500', GRANULES:'bg-amber-500' }
const SECTION_BADGE = {
  NANO:      'bg-blue-100 text-blue-800 border border-blue-200',
  BOTANICAL: 'bg-green-100 text-green-800 border border-green-200',
  LIQUID:    'bg-cyan-100 text-cyan-800 border border-cyan-200',
  POWDER:    'bg-purple-100 text-purple-800 border border-purple-200',
  GRANULES:  'bg-amber-100 text-amber-800 border border-amber-200',
}
const SECTION_CAPACITY = { NANO:2000, BOTANICAL:1500, LIQUID:5000, POWDER:4000, GRANULES:3000 }

const TASK_STATUS_STYLE = {
  DRAFT:       'bg-gray-100 text-gray-600',
  PLANNED:     'bg-blue-100 text-blue-700',
  REVIEWED:    'bg-blue-100 text-blue-700',
  RM_READY:    'bg-teal-100 text-teal-700',
  ISSUED:      'bg-indigo-100 text-indigo-700',
  IN_PROCESS:  'bg-orange-100 text-orange-700',
  IN_PROGRESS: 'bg-orange-100 text-orange-700',
  AWAITING_QC: 'bg-yellow-100 text-yellow-700',
  QC_PASSED:   'bg-emerald-100 text-emerald-700',
  COMPLETED:   'bg-green-100 text-green-700',
  QC_FAILED:   'bg-red-100 text-red-700',
  REWORK:      'bg-pink-100 text-pink-700',
  REJECTED:    'bg-red-200 text-red-800',
  CANCELLED:   'bg-gray-100 text-gray-400',
}

const ISSUE_STATUS_LABEL = {
  BOM_NOT_GENERATED: 'BOM Not Generated',
  BOM_GENERATED:     'BOM Generated',
  SENT_TO_STORES:    'Sent To Stores',
  PARTIALLY_ISSUED:  'Partially Issued',
  FULLY_ISSUED:      'Fully Issued',
}
const ISSUE_STATUS_STYLE = {
  BOM_NOT_GENERATED: 'bg-red-50 text-red-600',
  BOM_GENERATED:     'bg-yellow-50 text-yellow-700',
  SENT_TO_STORES:    'bg-blue-50 text-blue-700',
  PARTIALLY_ISSUED:  'bg-orange-50 text-orange-700',
  FULLY_ISSUED:      'bg-green-50 text-green-700',
}
const QC_STATUS_STYLE = {
  PENDING: 'bg-gray-100 text-gray-500',
  PASS:    'bg-green-100 text-green-700',
  FAIL:    'bg-red-100 text-red-700',
  RETEST:  'bg-yellow-100 text-yellow-700',
  HOLD:    'bg-orange-100 text-orange-700',
}

const RM_ICON = { GREEN:'🟢', AMBER:'🟡', RED:'🔴' }
const PRIORITY_STYLE = {
  MODERATE:    'bg-gray-100 text-gray-600',
  URGENT:      'bg-orange-100 text-orange-700',
  VERY_URGENT: 'bg-red-100 text-red-700',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
}
function todayStr() { return new Date().toISOString().split('T')[0] }

function deriveIssueStatus(plan) {
  if (plan.issueStatus) return plan.issueStatus
  const s = plan.status
  if (s === 'DRAFT' || s === 'PLANNED' || s === 'REVIEWED') return 'BOM_NOT_GENERATED'
  if (s === 'RM_READY') return 'BOM_GENERATED'
  if (s === 'ISSUED')   return 'FULLY_ISSUED'
  if (['IN_PROCESS','IN_PROGRESS','AWAITING_QC','QC_PASSED','COMPLETED'].includes(s)) return 'FULLY_ISSUED'
  return 'BOM_NOT_GENERATED'
}
function deriveQcStatus(plan) {
  if (plan.qcStatus) return plan.qcStatus
  if (['COMPLETED','QC_PASSED'].includes(plan.status)) return 'PASS'
  if (plan.status === 'QC_FAILED') return 'FAIL'
  if (plan.status === 'AWAITING_QC') return 'PENDING'
  return '—'
}

// ── Microbial SFG Panel ───────────────────────────────────────────────────────
function MicrobialSFGPanel({ plan, multiplicationFactor, onMfChange }) {
  const [sfgData, setSfgData]         = useState(null)
  const [loading, setLoading]         = useState(false)
  const [allocating, setAllocating]   = useState(false)
  const [allocations, setAllocations] = useState([])
  const [mfInput, setMfInput]         = useState(String(multiplicationFactor || 1))
  const [checked, setChecked]         = useState(false)

  const fmtCfu = (v) => {
    if (!v) return '—'
    const n = Number(v)
    if (n >= 1e11) return `${(n/1e11).toFixed(2)}×10¹¹`
    if (n >= 1e10) return `${(n/1e10).toFixed(2)}×10¹⁰`
    if (n >= 1e9)  return `${(n/1e9).toFixed(2)}×10⁹`
    if (n >= 1e8)  return `${(n/1e8).toFixed(2)}×10⁸`
    return n.toExponential(2)
  }

  const checkSfg = async (mf) => {
    if (!plan?.planId) return
    setLoading(true)
    try {
      const res = await microbialSfgApi.checkPlanMicrobes(plan.planId, mf || 1)
      setSfgData(res); setChecked(true)
      if (res?.has_microbes && onMfChange) onMfChange(parseFloat(mf) || 1)
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => {
    if (!plan?.planId) return
    microbialSfgApi.listAllocations(plan.planId).then(r => setAllocations(r?.data || [])).catch(() => {})
    checkSfg(mfInput)
  }, [plan?.planId])

  const handleAllocate = async (microbe, typeData) => {
    if (!typeData || !typeData.batches?.length) return
    const mf    = parseFloat(mfInput) || 1
    const reqKg = typeData.required_qty_kg
    if (!reqKg || reqKg <= 0) { alert('Cannot allocate: required CFU not set in recipe for this microbe.'); return }
    let remaining = reqKg
    const picks = []
    for (const batch of typeData.batches) {
      if (remaining <= 0) break
      const take = Math.min(remaining, Number(batch.remaining_qty_kg))
      if (take > 0) {
        picks.push({ inward_id:batch.inward_id, container_code:batch.container_code, inhouse_cfu_per_g:Number(batch.inhouse_cfu_per_g), qty_kg:parseFloat(take.toFixed(3)) })
        remaining -= take
      }
    }
    if (remaining > 0.001 && !confirm(`Stock insufficient — only ${(reqKg-remaining).toFixed(3)} kg available, need ${reqKg.toFixed(3)} kg. Allocate partial?`)) return
    setAllocating(true)
    try {
      await microbialSfgApi.allocate({ plan_id:plan.planId, microbe_code:microbe.microbe_code, microbe_name:microbe.rm_name, microbe_type:typeData.microbe_type, multiplication_factor:mf, required_cfu_per_g:microbe.required_cfu_per_g, order_qty_kg:microbe.order_qty_kg, picks })
      const [allocs, sfg] = await Promise.all([microbialSfgApi.listAllocations(plan.planId), microbialSfgApi.checkPlanMicrobes(plan.planId, mf)])
      setAllocations(allocs?.data || []); setSfgData(sfg)
      alert(`✅ Allocated ${picks.reduce((s,p)=>s+p.qty_kg,0).toFixed(3)} kg — Cold Room incharge notified!`)
    } catch (err) { alert('Allocation failed: ' + err.message) }
    setAllocating(false)
  }

  const handleCancelAlloc = async (allocId) => {
    if (!confirm('Cancel this allocation?')) return
    try {
      await microbialSfgApi.cancelAllocation(allocId)
      const [allocs, sfg] = await Promise.all([microbialSfgApi.listAllocations(plan.planId), microbialSfgApi.checkPlanMicrobes(plan.planId, parseFloat(mfInput)||1)])
      setAllocations(allocs?.data || []); setSfgData(sfg)
    } catch (err) { alert(err.message) }
  }

  if (checked && sfgData && !sfgData.has_microbes) return null
  return (
    <div className="border-t pt-3 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-teal-700 uppercase tracking-wide">🦠 Microbial SFG Availability</span>
        <span className="text-xs text-gray-400 ml-auto">Required = MF × Req.CFU × Qty ÷ Inhouse CFU</span>
      </div>
      <div className="flex items-end gap-3 mb-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Multiplication Factor</label>
          <input type="number" min="0.1" step="0.1" value={mfInput} onChange={e => setMfInput(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28 font-bold focus:ring-2 focus:ring-teal-400 focus:outline-none" />
        </div>
        <button type="button" onClick={() => checkSfg(mfInput)} disabled={loading}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 disabled:opacity-50">
          {loading ? '⏳ Checking…' : '🔍 Check SFG'}
        </button>
        {allocations.length > 0 && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">{allocations.length} allocation(s)</span>}
      </div>
      {sfgData?.has_microbes && sfgData.microbes?.map((microbe, mi) => (
        <div key={mi} className="border border-teal-200 rounded-xl mb-3 overflow-hidden">
          <div className="bg-teal-50 px-4 py-2 flex items-center gap-3">
            <span className="font-bold text-teal-800 text-sm">{microbe.rm_name}</span>
            {microbe.microbe_code && <span className="text-xs bg-teal-200 text-teal-800 px-2 py-0.5 rounded-full font-mono">{microbe.microbe_code}</span>}
            <span className="text-xs text-gray-500 ml-auto">Req. CFU/g: <strong>{fmtCfu(microbe.required_cfu_per_g)||'Not set'}</strong> · Order: <strong>{microbe.order_qty_kg} kg</strong></span>
          </div>
          {microbe.types.length === 0 ? (
            <div className="px-4 py-3 text-xs text-amber-700 bg-amber-50">⚠️ No SFG stock. Add inward entries in Microbial Inward.</div>
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="bg-gray-50">
                <th className="text-left px-4 py-2 font-semibold text-gray-500">Type</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-500">Available (kg)</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-500">Avg CFU/g</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-500">Required (kg)</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-500">Status</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-500">Action</th>
              </tr></thead>
              <tbody>
                {microbe.types.map((t, ti) => {
                  const alreadyAllocated = allocations.some(a => a.microbe_code === microbe.microbe_code && a.microbe_type === t.microbe_type && a.status !== 'CANCELLED')
                  return (
                    <tr key={ti} className={`border-t ${ti%2===0?'bg-white':'bg-gray-50'}`}>
                      <td className="px-4 py-2 font-semibold text-gray-800">{t.microbe_type}</td>
                      <td className="px-4 py-2 text-right font-bold text-gray-800">{t.total_available_kg.toFixed(3)}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{fmtCfu(t.avg_cfu_per_g)}</td>
                      <td className="px-4 py-2 text-right font-bold text-indigo-700">{t.required_qty_kg!=null?t.required_qty_kg.toFixed(3):<span className="text-gray-400">Set req. CFU in recipe</span>}</td>
                      <td className="px-4 py-2 text-right">{t.is_sufficient===null?<span className="text-gray-400">—</span>:t.is_sufficient?<span className="text-green-600 font-bold">✅</span>:<span className="text-red-500 font-bold">⚠️ Low</span>}</td>
                      <td className="px-4 py-2 text-right">
                        {alreadyAllocated ? <span className="text-green-600 font-bold text-xs">✅ Done</span> : (
                          <button type="button" onClick={() => handleAllocate(microbe, t)} disabled={allocating||t.total_available_kg===0}
                            className="px-3 py-1 bg-teal-600 text-white rounded text-xs font-bold hover:bg-teal-700 disabled:opacity-40">
                            {allocating?'…':'Allocate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      ))}
      {allocations.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mt-2">
          <p className="text-xs font-bold text-green-800 mb-2">🧊 Current Microbial Allocations</p>
          <table className="w-full text-xs">
            <thead><tr>
              {['Microbe','Type','Container','Qty (kg)','Status',''].map(h => (
                <th key={h} className={`${h?'text-left':''}  py-1 text-gray-500 font-semibold`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {allocations.map(a => (
                <tr key={a.allocation_id} className="border-t border-green-100">
                  <td className="py-1 text-gray-800">{a.microbe_name}</td>
                  <td className="py-1 text-gray-600">{a.microbe_type}</td>
                  <td className="py-1 font-mono text-gray-700">{a.container_code}</td>
                  <td className="py-1 text-right font-bold text-teal-700">{Number(a.allocated_qty_kg).toFixed(3)}</td>
                  <td className="py-1 text-right"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${a.status==='RESERVED'?'bg-amber-100 text-amber-700':'bg-green-100 text-green-700'}`}>{a.status}</span></td>
                  <td className="py-1 text-right">{a.status!=='PICKED'&&<button type="button" onClick={()=>handleCancelAlloc(a.allocation_id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">✕</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Planning Drawer ───────────────────────────────────────────────────────────
function PlanningDrawer({ plan, pendingItem, onSave, onClose, equipList, employees }) {
  const section = plan?.sectionType || pendingItem?.salesOrder?.sectionName || 'POWDER'
  const so   = plan?.salesOrder || pendingItem?.salesOrder || {}
  const item = pendingItem || {}

  const [form, setForm] = useState({
    plannedDate:      plan?.plannedDate ? plan.plannedDate.split('T')[0] : todayStr(),
    shift:            plan?.shift            || '',
    batchIncharge:    plan?.batchIncharge    || '',
    equipment:        plan?.equipment        || '',
    location:         plan?.location         || '',
    batchCode:        plan?.batchCode        || '',
    carrier:          plan?.carrier          || item.carrier || '',
    specs:            plan?.specs            || item.activeSpecs || '',
    process:          plan?.process          || '',
    stageInfo:        plan?.stageInfo        || '',
    noOfCycles:       plan?.noOfCycles       || '1',
    cycleBatchSize:   plan?.cycleBatchSize   || String(plan?.totalQty || item.totalQty || ''),
    unitPackQty:      plan?.unitPackQty      || item.unitQty || '',
    noOfUnits:        plan?.noOfUnits        || item.totalCS || '',
    primaryPack:      plan?.pp1              || item.unitPackType || '',
    primaryPack2:     plan?.pp2              || '',
    secondaryPack:    plan?.sp1              || item.packingType  || '',
    noOfSecPacks:     plan?.noOfSp           || item.totalCS     || '',
    labels:           plan?.labels           || item.labelType   || '',
    packingSpec:      plan?.packingSpec      || '',
    perDayCompletion: plan?.perDayCompletion || '',
    femaleWorkers:    plan?.femaleWorkers    || '',
    maleWorkers:      plan?.maleWorkers      || '',
    remarks:          plan?.remarks          || '',
  })

  const [saving, setSaving]                           = useState(false)
  const [multiplicationFactor, setMultiplicationFactor] = useState(1)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const [rmCheck, setRmCheck]               = useState(null)
  const [rmCheckLoading, setRmCheckLoading] = useState(false)
  const [rmCheckExpanded, setRmCheckExpanded] = useState(true)

  const productCode = plan?.productCode || pendingItem?.productCode || so?.productCode || ''
  const batchQty    = plan?.totalQty    || item?.totalQty || ''

  useEffect(() => {
    if (!productCode || !batchQty) return
    setRmCheckLoading(true)
    indentApi.stockCheck(productCode, batchQty)
      .then(res => { const d = res.data || res; setRmCheck(d); setRmCheckExpanded(!d.allOk) })
      .catch(() => setRmCheck(null))
      .finally(() => setRmCheckLoading(false))
  }, [productCode, batchQty])

  const filteredEquip = equipList.filter(e => !e.plant || e.plant.toUpperCase() === section.toUpperCase())
  const eqpOptions    = filteredEquip.length ? filteredEquip : equipList
  const filteredEmps  = employees.filter(e => !e.department || e.department.toUpperCase() === section.toUpperCase() || !e.section || e.section.toUpperCase() === section.toUpperCase())
  const empOptions    = filteredEmps.length ? filteredEmps : employees

  function onEquipChange(eqpName) {
    const eqp   = eqpOptions.find(e => e.equipName === eqpName)
    const total = parseFloat(plan?.totalQty || item.totalQty || 0)
    if (eqp?.workingVolume && total > 0) {
      const cap    = parseFloat(eqp.workingVolume)
      const cycles = cap > 0 ? Math.ceil(total / cap) : 1
      setForm(f => ({ ...f, equipment:eqpName, noOfCycles:String(cycles), cycleBatchSize:String(cap) }))
    } else {
      set('equipment', eqpName)
    }
  }

  function onCyclesChange(val) {
    const n     = parseInt(val) || 1
    const total = parseFloat(plan?.totalQty || item.totalQty || 0)
    setForm(f => ({ ...f, noOfCycles:String(n), cycleBatchSize:total>0?String(Math.ceil(total/n)):f.cycleBatchSize }))
  }

  async function submit(e) {
    e?.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, pp1: form.primaryPack, pp2: form.primaryPack2, sp1: form.secondaryPack, noOfSp: form.noOfSecPacks, status: plan?.status === 'DRAFT' ? 'PLANNED' : plan?.status }
      await onSave(plan?.id, payload, pendingItem)
      onClose()
    } catch (err) { alert('Save failed: ' + err.message) }
    finally { setSaving(false) }
  }

  const showNano      = section === 'NANO'
  const showBotanical = section === 'BOTANICAL'
  const showLiquid    = section === 'LIQUID'
  const showPowder    = section === 'POWDER'
  const showGranules  = section === 'GRANULES'
  const showPacking   = ['LIQUID','POWDER','GRANULES'].includes(section)
  const showCarrier   = ['POWDER','GRANULES','LIQUID'].includes(section)
  const showWorkers   = ['LIQUID','POWDER','GRANULES'].includes(section)
  const showLocation  = ['POWDER','GRANULES'].includes(section)

  const productName  = plan?.productName  || item.inhouseProductName || ''
  const totalQty     = plan?.totalQty     || item.totalQty || ''
  const uom          = plan?.uom          || item.totalUom || 'KG'
  const diNo         = plan?.diNo         || so.diNo || ''
  const customerName = plan?.customerName || so.customerName || ''
  const planId       = plan?.planId       || '(new plan)'

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        <div className="px-5 py-4 border-b bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-lg">{SECTION_ICON[section]}</span>
                <span className="font-bold text-base">{planId}</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{section}</span>
              </div>
              <p className="text-sm text-white/80 font-medium">{productName}</p>
              <p className="text-xs text-white/60 mt-0.5">
                {diNo && <>DI: <strong className="text-white/90">{diNo}</strong> · </>}
                {customerName} · {totalQty} {uom}
              </p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none mt-1">×</button>
          </div>
        </div>

        {(rmCheckLoading || rmCheck) && (
          <div className={`flex-shrink-0 border-b ${rmCheckLoading ? 'bg-gray-50' : rmCheck?.allOk ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <button type="button" onClick={() => setRmCheckExpanded(e => !e)} className="w-full flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2">
                {rmCheckLoading ? <span className="text-xs text-gray-500 animate-pulse">⏳ Checking RM stock…</span>
                : rmCheck?.allOk ? <><span className="text-base">✅</span><span className="text-sm font-bold text-green-700">All materials available for this batch</span></>
                : <><span className="text-base">⚠️</span><span className="text-sm font-bold text-red-700">{rmCheck?.checks?.filter(c=>!c.ok).length} material{rmCheck?.checks?.filter(c=>!c.ok).length>1?'s':''} short — check before saving</span></>}
              </div>
              {!rmCheckLoading && <span className="text-xs text-gray-400">{rmCheckExpanded ? '▲ Hide' : '▼ Show'}</span>}
            </button>
            {rmCheckExpanded && !rmCheckLoading && rmCheck?.checks?.length > 0 && (
              <div className="px-5 pb-4">
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-gray-100">
                      {['Material','Required','Available','Shortfall','Status'].map(h => (
                        <th key={h} className={`${['Required','Available','Shortfall'].includes(h)?'text-right':'text-left text-center'.split(' ')[h==='Status'?1:0]} px-3 py-2 font-semibold text-gray-600`}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {rmCheck.checks.map((c, i) => (
                        <tr key={c.rmCode} className={`border-t border-gray-100 ${i%2===0?'bg-white':'bg-gray-50/50'}`}>
                          <td className="px-3 py-2"><div className="font-semibold text-gray-800">{c.rmName}</div><div className="text-gray-400 font-mono">{c.rmCode}</div></td>
                          <td className="px-3 py-2 text-right font-mono text-gray-700">{parseFloat(c.required.toFixed(3))}</td>
                          <td className={`px-3 py-2 text-right font-mono font-bold ${c.ok?'text-green-700':'text-red-600'}`}>{parseFloat(c.available.toFixed(3))}</td>
                          <td className="px-3 py-2 text-right font-mono text-red-600 font-bold">{c.shortfall>0?`−${parseFloat(c.shortfall.toFixed(3))}`:'—'}</td>
                          <td className="px-3 py-2 text-center">
                            {c.ok ? <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">OK</span>
                            : c.available===0 ? <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-0.5 rounded-full">NO STOCK</span>
                            : <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">SHORT</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!rmCheck.allOk && <p className="text-xs text-red-600 mt-2 font-semibold">⚠ You can still save the plan — BOM will be sent to stores with shortage flagged.</p>}
              </div>
            )}
          </div>
        )}

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Schedule</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Date <span className="text-red-500">*</span></label>
                <input type="date" value={form.plannedDate} onChange={e => set('plannedDate', e.target.value)} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Shift</label>
                <select value={form.shift} onChange={e => set('shift', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  <option value="">— Select —</option>
                  {SHIFTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Batch Incharge</label>
                {empOptions.length > 0 ? (
                  <select value={form.batchIncharge} onChange={e => set('batchIncharge', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    <option value="">— Select —</option>
                    {empOptions.map(e => <option key={e.id} value={e.name||e.employeeName}>{e.name||e.employeeName}</option>)}
                  </select>
                ) : (
                  <input value={form.batchIncharge} onChange={e => set('batchIncharge', e.target.value)} placeholder="Name of incharge"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Batch Number</label>
                <input value={form.batchCode} onChange={e => set('batchCode', e.target.value)} placeholder="e.g. B-2026-001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Equipment &amp; Cycles <span className="ml-2 text-gray-400 normal-case font-normal">Total: {totalQty} {uom}</span></p>
            <div className="grid grid-cols-3 gap-3">
              <div className={showLocation ? 'col-span-2' : 'col-span-3'}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{showNano ? 'Reactor / Vessel' : 'Equipment Allocated'}</label>
                {eqpOptions.length > 0 ? (
                  <select value={form.equipment} onChange={e => onEquipChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    <option value="">— Select Equipment —</option>
                    {eqpOptions.map(e => <option key={e.equipId||e.id} value={e.equipName}>{e.equipName}{e.workingVolume ? ` (cap: ${e.workingVolume} ${uom})` : ''}</option>)}
                  </select>
                ) : (
                  <input value={form.equipment} onChange={e => set('equipment', e.target.value)} placeholder="Equipment name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                )}
              </div>
              {showLocation && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Location / Bay</label>
                  <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Bay 3"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
              )}
              {!showNano && !showBotanical && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">No. of Cycles</label>
                    <input type="number" min="1" value={form.noOfCycles} onChange={e => onCyclesChange(e.target.value)}
                      className="w-full border border-blue-300 bg-blue-50 rounded-lg px-3 py-2 text-sm font-bold text-blue-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Qty per Cycle</label>
                    <input type="number" value={form.cycleBatchSize} onChange={e => set('cycleBatchSize', e.target.value)}
                      className="w-full border border-blue-300 bg-blue-50 rounded-lg px-3 py-2 text-sm font-bold text-blue-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                </>
              )}
            </div>
            {parseInt(form.noOfCycles) > 1 && (
              <div className="mt-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-xs text-indigo-800">
                📋 <strong>{form.noOfCycles} cycles</strong> × <strong>{form.cycleBatchSize} {uom}</strong> — indent raised for {form.noOfCycles}× BOM quantities
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Product Details <span className="text-gray-300 normal-case font-normal">— pre-filled from Sales Order</span></p>
            <div className="grid grid-cols-2 gap-3">
              {showCarrier && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Carrier</label>
                  <input value={form.carrier} onChange={e => set('carrier', e.target.value)} placeholder="e.g. Talc, Dextrose"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Product Specifications</label>
                <input value={form.specs} onChange={e => set('specs', e.target.value)} placeholder="e.g. 2×10⁹ CFU/g"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Process</label>
                <input value={form.process} onChange={e => set('process', e.target.value)} placeholder="Process / method description"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              {showBotanical && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Stage Info</label>
                  <input value={form.stageInfo} onChange={e => set('stageInfo', e.target.value)} placeholder="e.g. Day 3 of 7"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
              )}
            </div>
          </div>

          {showPacking && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Packing Details <span className="text-gray-300 normal-case font-normal">— pre-filled from Sales Order</span></p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Packing Quantity</label>
                  <input type="number" value={form.unitPackQty} onChange={e => set('unitPackQty', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Number of Units</label>
                  <input type="number" value={form.noOfUnits} onChange={e => set('noOfUnits', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                {showLiquid && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Packing Spec</label>
                    <input value={form.packingSpec} onChange={e => set('packingSpec', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Primary Pack</label>
                  <input value={form.primaryPack} onChange={e => set('primaryPack', e.target.value)} placeholder="e.g. Pouch, Bottle"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Primary Pack 2</label>
                  <input value={form.primaryPack2} onChange={e => set('primaryPack2', e.target.value)} placeholder="Secondary inner pack"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Secondary Pack</label>
                  <input value={form.secondaryPack} onChange={e => set('secondaryPack', e.target.value)} placeholder="e.g. Carton, Drum"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">No. of Secondary Packs</label>
                  <input type="number" value={form.noOfSecPacks} onChange={e => set('noOfSecPacks', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Labels</label>
                  <input value={form.labels} onChange={e => set('labels', e.target.value)} placeholder="Label type"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                {showWorkers && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Per Day Output</label>
                      <input type="number" value={form.perDayCompletion} onChange={e => set('perDayCompletion', e.target.value)} placeholder="units/day"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Female Workers</label>
                      <input type="number" value={form.femaleWorkers} onChange={e => set('femaleWorkers', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Male Workers</label>
                      <input type="number" value={form.maleWorkers} onChange={e => set('maleWorkers', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {plan && <MicrobialSFGPanel plan={plan} multiplicationFactor={multiplicationFactor} onMfChange={setMultiplicationFactor} />}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Additional Instructions / Remarks</label>
            <textarea value={form.remarks} onChange={e => set('remarks', e.target.value)} rows={2}
              placeholder="Notes for the shopfloor team…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none" />
          </div>
          <div className="pb-4" />
        </form>

        <div className="px-5 py-4 border-t bg-gray-50 flex-shrink-0 space-y-2">
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
            💡 Saving auto-generates Formulation &amp; Packing BOM, checks RM availability, creates material reservation and store request.
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={submit} disabled={saving}
              className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><span className="animate-spin inline-block">⚙</span> Saving &amp; Generating BOMs…</> : '✅ Save &amp; Generate BOMs'}
            </button>
            <button type="button" onClick={onClose} className="px-4 border border-gray-300 py-2.5 rounded-lg text-sm hover:bg-gray-100">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Section 1: KPI Dashboard ──────────────────────────────────────────────────
function KPICard({ icon, label, value, color, active, onClick, sub }) {
  return (
    <button onClick={onClick}
      className={`flex flex-col p-4 rounded-xl border text-left transition-all hover:shadow-md ${active ? color+' shadow-md ring-2 ring-current ring-offset-1' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xl">{icon}</span>
        <span className={`text-2xl font-bold ${active?'':'text-gray-900'}`}>{value ?? '—'}</span>
      </div>
      <span className={`text-xs font-semibold mt-1 ${active?'':'text-gray-500'}`}>{label}</span>
      {sub && <span className="text-xs text-gray-400 mt-0.5">{sub}</span>}
    </button>
  )
}

function CapacityBar({ section, plans }) {
  const planned  = plans.filter(p => p.sectionType === section && !['CANCELLED','COMPLETED'].includes(p.status)).reduce((s,p) => s + parseFloat(p.totalQty||0), 0)
  const capacity = SECTION_CAPACITY[section]
  const pct      = Math.min(100, Math.round((planned / capacity) * 100))
  const barColor = SECTION_BAR[section]
  const textColor = pct > 90 ? 'text-red-600' : pct > 70 ? 'text-orange-500' : 'text-gray-600'
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-24 text-xs font-bold text-gray-700 shrink-0">{SECTION_ICON[section]} {section}</span>
      <div className="flex-1">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Cap: {capacity.toLocaleString()} {section==='LIQUID'?'L':'kg'}</span>
          <span>Planned: {planned.toLocaleString()} {section==='LIQUID'?'L':'kg'}</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width:`${pct}%` }} />
        </div>
      </div>
      <span className={`text-xs font-bold w-10 text-right shrink-0 ${textColor}`}>{pct}%</span>
    </div>
  )
}

// ── Section 2: Unplanned Orders Table ────────────────────────────────────────
function UnplannedOrdersTable({ orders, onPlan }) {
  const today = new Date()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(15)
  const paginated = orders.slice((page - 1) * limit, page * limit)
  useEffect(() => { setPage(1) }, [orders])
  if (!orders.length) return (
    <div className="text-center py-10 text-gray-400">
      <div className="text-4xl mb-2">🎉</div>
      <p className="font-semibold text-gray-500">All orders are planned!</p>
      <p className="text-xs mt-1">No unplanned items in the queue</p>
    </div>
  )
  return (
    <>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {['DI Number','Customer','Product','Section','Quantity','ETD','RM','Biomass','SFG','Priority','Action'].map(h => (
              <th key={h} className={`${['Quantity'].includes(h)?'text-right':['RM','Biomass','SFG','Priority','Action'].includes(h)?'text-center':'text-left'} px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginated.map(item => {
            const so       = item.salesOrder || {}
            const etd      = so.estimatedDispatchDate ? new Date(so.estimatedDispatchDate) : null
            const daysLeft = etd ? Math.ceil((etd - today) / 86400000) : null
            const overdue  = daysLeft !== null && daysLeft < 0
            const section  = item.sectionName || '—'
            return (
              <tr key={item.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${overdue?'bg-red-50/40':''}`}>
                <td className="px-4 py-3"><span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{so.diNo||'—'}</span></td>
                <td className="px-4 py-3 text-sm font-medium text-gray-800 max-w-[120px] truncate">{so.customerName||'—'}</td>
                <td className="px-4 py-3"><div className="text-sm font-semibold text-gray-900 max-w-[140px] truncate">{item.inhouseProductName||'—'}</div></td>
                <td className="px-4 py-3">
                  {section !== '—' ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SECTION_BADGE[section]||'bg-gray-100 text-gray-600'}`}>{SECTION_ICON[section]} {section}</span>
                    : <span className="text-gray-400 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700">{item.totalQty} <span className="text-gray-400 font-normal text-xs">{item.totalUom}</span></td>
                <td className="px-4 py-3">
                  <div className={`text-xs font-semibold ${overdue?'text-red-600':daysLeft<=7?'text-orange-500':'text-gray-600'}`}>{etd ? fmt(etd) : '—'}</div>
                  {daysLeft !== null && <div className="text-xs text-gray-400">{overdue?`${Math.abs(daysLeft)}d late`:`${daysLeft}d left`}</div>}
                </td>
                <td className="px-4 py-3 text-center">{so.priority==='VERY_URGENT'?<span title="Check RM">🟡</span>:<span title="Pending check">⚪</span>}</td>
                <td className="px-4 py-3 text-center text-gray-300 text-xs">—</td>
                <td className="px-4 py-3 text-center text-gray-300 text-xs">—</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_STYLE[so.priority]||'bg-gray-100 text-gray-500'}`}>
                    {so.priority?.replace('_',' ') || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => onPlan(item)} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition">PLAN</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    <Pagination page={page} total={orders.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
    </>
  )
}

// ── Section 3: Planned Tasks Table ────────────────────────────────────────────
function PlannedTasksTable({ plans, onRowClick, onStatusChange, loading }) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(15)
  const paginated = plans.slice((page - 1) * limit, page * limit)
  useEffect(() => { setPage(1) }, [plans])
  if (loading) return <div className="text-center py-12 text-gray-400 text-sm">Loading tasks…</div>
  if (!plans.length) return (
    <div className="text-center py-12 text-gray-400">
      <div className="text-4xl mb-2">📋</div>
      <p className="font-medium text-gray-500">No tasks yet</p>
      <p className="text-xs mt-1">Run the planning engine or manually plan from the Unplanned Orders section</p>
    </div>
  )
  return (
    <>
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[1200px]">
        <thead className="sticky top-0 z-10">
          <tr className="bg-gray-800 text-white">
            {['Task ID','Planned Date','DI No.','Product','Section','Quantity','Equipment','Shift','Incharge','RM','Issue Status','Production','QC','Task Status'].map(h => (
              <th key={h} className={`${h==='Quantity'?'text-right':['RM','QC'].includes(h)?'text-center':'text-left'} px-3 py-3 text-xs font-semibold whitespace-nowrap`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginated.map((plan, idx) => {
            const issueStatus = deriveIssueStatus(plan)
            const qcStatus    = deriveQcStatus(plan)
            const rowBg = plan.status === 'CANCELLED' ? 'bg-gray-50 opacity-60' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
            return (
              <tr key={plan.id} className={`border-b border-gray-100 hover:bg-indigo-50/30 cursor-pointer transition-colors group ${rowBg}`} onClick={() => onRowClick(plan)}>
                <td className="px-3 py-3"><span className="font-mono text-xs font-bold text-indigo-700">{plan.planId}</span></td>
                <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{fmt(plan.plannedDate)}</td>
                <td className="px-3 py-3"><span className="font-mono text-xs text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{plan.diNo||'—'}</span></td>
                <td className="px-3 py-3">
                  <div className="text-sm font-semibold text-gray-900 max-w-[150px] truncate" title={plan.productName}>{plan.productName||'—'}</div>
                  {plan.carrier && <div className="text-xs text-gray-400 truncate max-w-[150px]">Carrier: {plan.carrier}</div>}
                </td>
                <td className="px-3 py-3">
                  {plan.sectionType ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SECTION_BADGE[plan.sectionType]||'bg-gray-100 text-gray-600'}`}>{SECTION_ICON[plan.sectionType]} {plan.sectionType}</span> : '—'}
                </td>
                <td className="px-3 py-3 text-right text-sm font-bold text-gray-700 whitespace-nowrap">{plan.totalQty} <span className="text-xs text-gray-400 font-normal">{plan.uom}</span></td>
                <td className="px-3 py-3 text-xs text-gray-600 max-w-[100px] truncate">{plan.equipment||<span className="text-gray-300">—</span>}</td>
                <td className="px-3 py-3 text-xs font-bold text-gray-700">{plan.shift||<span className="text-gray-300">—</span>}</td>
                <td className="px-3 py-3 text-xs text-gray-600 max-w-[80px] truncate">{plan.batchIncharge||<span className="text-gray-300">—</span>}</td>
                <td className="px-3 py-3 text-center text-base" title={`RM: ${plan.rmCheckStatus}`}>{RM_ICON[plan.rmCheckStatus] || '⚪'}</td>
                <td className="px-3 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${ISSUE_STATUS_STYLE[issueStatus]||'bg-gray-100 text-gray-500'}`}>
                    {ISSUE_STATUS_LABEL[issueStatus]||issueStatus}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <select value={plan.status} onClick={e => e.stopPropagation()} onChange={e => { e.stopPropagation(); onStatusChange(plan.id, e.target.value) }}
                    className={`text-xs rounded-lg px-2 py-1 border-0 font-semibold cursor-pointer ${TASK_STATUS_STYLE[plan.status]||'bg-gray-100 text-gray-600'} focus:ring-1 focus:ring-indigo-400 focus:outline-none`}>
                    {TASK_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                  </select>
                </td>
                <td className="px-3 py-3 text-center">
                  {qcStatus !== '—' ? <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${QC_STATUS_STYLE[qcStatus]||'bg-gray-100 text-gray-500'}`}>{qcStatus}</span>
                    : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="px-3 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${TASK_STATUS_STYLE[plan.status]||'bg-gray-100 text-gray-600'}`}>
                    {plan.status?.replace(/_/g,' ')||'—'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    <Pagination page={page} total={plans.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
    </>
  )
}

// ── Section 4: Daily Execution Schedule ──────────────────────────────────────
function DailyExecutionSchedule({ plans }) {
  const [scheduleDate, setScheduleDate] = useState(todayStr())
  const printRef = useRef()

  const filtered = plans.filter(p => {
    if (!p.plannedDate || p.status === 'CANCELLED') return false
    return p.plannedDate.split('T')[0] <= scheduleDate
  })

  const grouped = {}
  filtered.forEach(p => {
    const sec = p.sectionType  || 'GENERAL'
    const sh  = p.shift        || 'UNASSIGNED'
    const eqp = p.equipment    || 'Unassigned Equipment'
    if (!grouped[sec]) grouped[sec] = {}
    if (!grouped[sec][sh]) grouped[sec][sh] = {}
    if (!grouped[sec][sh][eqp]) grouped[sec][sh][eqp] = []
    grouped[sec][sh][eqp].push(p)
  })

  const shiftLabel = { A:'Shift A — 6AM to 2PM', B:'Shift B — 2PM to 10PM', C:'Shift C — 10PM to 6AM', G:'General — 9AM to 5:30PM', UNASSIGNED:'Shift Not Assigned' }

  function handlePrint() {
    const content = printRef.current.innerHTML
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>Daily Schedule — ${scheduleDate}</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px}
      h1{font-size:16px;margin-bottom:4px} h2{font-size:13px;color:#333;margin:16px 0 4px;background:#f5f5f5;padding:6px 10px}
      table{width:100%;border-collapse:collapse;margin-bottom:8px}
      th,td{border:1px solid #ddd;padding:5px 8px;text-align:left;font-size:11px}
      th{background:#eee;font-weight:bold}
      @media print{@page{margin:15mm}}</style></head>
      <body>${content}</body></html>`)
    win.document.close()
    win.print()
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Show tasks up to date</label>
          <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        </div>
        <div className="mt-5">
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white text-sm font-semibold rounded-lg hover:bg-gray-900 transition">
            🖨 Print Schedule
          </button>
        </div>
        <div className="mt-5 text-xs text-gray-400">{filtered.length} task{filtered.length !== 1 ? 's' : ''} up to {scheduleDate}</div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <div className="text-3xl mb-2">📅</div>
          <p className="text-sm font-medium text-gray-500">No tasks scheduled up to {scheduleDate}</p>
        </div>
      ) : (
        <div ref={printRef}>
          <h1 className="hidden print:block text-xl font-bold mb-1">SOM Phytopharma — Daily Production Schedule</h1>
          <p className="hidden print:block text-sm text-gray-500 mb-4">Up to: {scheduleDate} · Generated: {new Date().toLocaleString('en-IN')}</p>
          {Object.entries(grouped).sort().map(([sec, shifts]) => (
            <div key={sec} className="mb-6">
              <div className={`flex items-center gap-3 px-4 py-3 rounded-t-xl border ${SECTION_BADGE[sec]||'bg-gray-100 border-gray-200'}`}>
                <span className="text-xl">{SECTION_ICON[sec]}</span>
                <h2 className="font-bold text-base">{sec}</h2>
              </div>
              {Object.entries(shifts).sort().map(([sh, equipMap]) => (
                <div key={sh} className="border border-t-0 border-gray-200">
                  <div className="bg-gray-100 px-4 py-2 flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase">{shiftLabel[sh]||sh}</span>
                  </div>
                  {Object.entries(equipMap).map(([eqp, tasks]) => (
                    <div key={eqp} className="border-t border-gray-100">
                      <div className="px-4 py-2 bg-white flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-600">⚙ {eqp}</span>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50">
                            {['Task ID','Product','Qty','Incharge','DI No.','Status'].map(h => (
                              <th key={h} className={`${h==='Qty'?'text-right':'text-left'} px-4 py-2 font-semibold text-gray-400`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tasks.map(t => (
                            <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono font-bold text-indigo-700">{t.planId}</td>
                              <td className="px-4 py-2 font-semibold text-gray-800">{t.productName}</td>
                              <td className="px-4 py-2 text-right font-bold text-gray-700">{t.totalQty} <span className="text-gray-400 font-normal">{t.uom}</span></td>
                              <td className="px-4 py-2 text-gray-600">{t.batchIncharge||'—'}</td>
                              <td className="px-4 py-2 font-mono text-gray-600">{t.diNo||'—'}</td>
                              <td className="px-4 py-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TASK_STATUS_STYLE[t.status]||'bg-gray-100 text-gray-500'}`}>
                                  {t.status?.replace(/_/g,' ')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Planning Page ────────────────────────────────────────────────────────
export default function Planning() {
  const [plans,           setPlans]           = useState([])
  const [pendingOrders,   setPendingOrders]   = useState([])
  const [dashboard,       setDashboard]       = useState(null)
  const [loading,         setLoading]         = useState(true)
  const [running,         setRunning]         = useState(false)
  const [runMsg,          setRunMsg]          = useState('')
  const [equipList,       setEquipList]       = useState([])
  const [employees,       setEmployees]       = useState([])
  const [drawer,          setDrawer]          = useState(null)
  const [filterSection,   setFilterSection]   = useState('ALL')
  const [filterStatus,    setFilterStatus]    = useState('ALL')
  const [activeKpiFilter, setActiveKpiFilter] = useState(null)

  useEffect(() => {
    equipmentApi.list().then(res => setEquipList(res?.data || (Array.isArray(res)?res:[]))).catch(()=>{})
    employeeApi.list({}).then(res => setEmployees(res?.data || (Array.isArray(res)?res:[]))).catch(()=>{})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterSection !== 'ALL') params.section = filterSection
      if (filterStatus  !== 'ALL') params.status  = filterStatus
      const [planRes, pendRes, dashRes] = await Promise.all([planningApi.listPlans(params), planningApi.pendingOrders(), planningApi.dashboard()])
      setPlans(planRes.data || []); setPendingOrders(pendRes.data || []); setDashboard(dashRes.data || null)
    } finally { setLoading(false) }
  }, [filterSection, filterStatus])

  useEffect(() => { load() }, [load])

  async function runEngine() {
    setRunning(true); setRunMsg('')
    try {
      const res = await planningApi.run()
      setRunMsg(`✅ ${res.plansCreated} new plans created from ${res.ordersProcessed} pending orders`)
      load()
    } catch (ex) { setRunMsg(`❌ ${ex.message}`) }
    finally { setRunning(false) }
  }

  async function handleSave(planId, form, pendingItem) {
    if (planId) {
      await planningApi.updatePlan(planId, {
        plannedDate: form.plannedDate, shift: form.shift, batchIncharge: form.batchIncharge,
        equipment: form.equipment, location: form.location, batchCode: form.batchCode,
        carrier: form.carrier, specs: form.specs, process: form.process, stageInfo: form.stageInfo,
        noOfCycles: form.noOfCycles, cycleBatchSize: form.cycleBatchSize,
        unitPackQty: form.unitPackQty, noOfUnits: form.noOfUnits,
        pp1: form.primaryPack, pp2: form.primaryPack2, sp1: form.secondaryPack, noOfSp: form.noOfSecPacks,
        labels: form.labels, packingSpec: form.packingSpec, perDayCompletion: form.perDayCompletion,
        femaleWorkers: form.femaleWorkers, maleWorkers: form.maleWorkers, remarks: form.remarks,
        status: form.status || 'PLANNED',
      })
      const plan = plans.find(p => p.id === planId)
      if (plan) {
        try {
          await bomSendApi.create({ planId:plan.id, productCode:plan.productCode||'', productName:plan.productName, batchNo:form.batchCode||plan.batchCode||'', diNo:plan.diNo||'', sectionType:plan.sectionType||null, bomType:'FORMULATION', totalQty:plan.totalQty, uom:plan.uom||'KG', sentBy:'PLANNER' })
        } catch { /* non-fatal */ }
        if (['LIQUID','POWDER','GRANULES'].includes(plan.sectionType)) {
          try {
            await bomSendApi.create({ planId:plan.id, productCode:plan.productCode||'', productName:plan.productName, batchNo:form.batchCode||plan.batchCode||'', diNo:plan.diNo||'', sectionType:plan.sectionType||null, bomType:'PACKING', totalQty:plan.totalQty, uom:plan.uom||'KG', sentBy:'PLANNER' })
          } catch { /* non-fatal */ }
        }
        if (form.equipment || plan.equipment) {
          try {
            await indentApi.create({ productCode:plan.productCode||'', productName:plan.productName, batchSize:String(plan.totalQty), batchNo:form.batchCode||plan.batchCode||'', diNo:plan.diNo||'', plant:plan.sectionType||'', equipment:form.equipment||plan.equipment||'', cycleBatchSize:form.cycleBatchSize||String(plan.totalQty), noOfCycles:String(parseInt(form.noOfCycles)||1) })
          } catch { /* non-fatal */ }
          try {
            await productionApi.create({ productCode:plan.productCode||'', productName:plan.productName, batchSize:parseFloat(plan.totalQty)||0, batchNo:form.batchCode||plan.batchCode||'', diNo:plan.diNo||'', sectionType:plan.sectionType||'', equipment:form.equipment||plan.equipment||'', plannedDate:form.plannedDate||plan.plannedDate||null, shift:form.shift||plan.shift||'', batchIncharge:form.batchIncharge||plan.batchIncharge||'', noOfCycles:parseInt(form.noOfCycles)||1, cycleBatchSize:parseFloat(form.cycleBatchSize)||0, carrier:form.carrier||plan.carrier||'', specs:form.specs||plan.specs||'', planId:plan.planId })
          } catch { /* non-fatal */ }
        }
      }
    }
    load()
  }

  async function handleStatusChange(id, status) { await planningApi.updatePlan(id, { status }); load() }

  function openDrawerForPlan(plan) { setDrawer({ plan, pendingItem: null }) }
  function openDrawerForNew(item)  { setDrawer({ plan: null, pendingItem: item }) }

  const dash = dashboard || {}
  const pendingCount  = dash.pendingOrders || 0
  const totalPlanned  = (dash.byStatus||[]).reduce((s,b)=>s+b.count,0)
  const draftCount    = (dash.byStatus||[]).find(b=>b.status==='DRAFT')?.count || 0
  const inProgressCnt = (dash.byStatus||[]).find(b=>['IN_PROGRESS','IN_PROCESS'].includes(b.status))?.count || 0
  const completedCnt  = (dash.byStatus||[]).find(b=>b.status==='COMPLETED')?.count || 0

  const filteredPlans = plans.filter(p => {
    if (!activeKpiFilter) return true
    if (activeKpiFilter === 'running') return ['IN_PROCESS','IN_PROGRESS'].includes(p.status)
    if (activeKpiFilter === 'draft')   return p.status === 'DRAFT'
    if (activeKpiFilter === 'rmshort') return p.rmCheckStatus === 'RED'
    if (activeKpiFilter === 'qc')      return p.status === 'AWAITING_QC'
    return true
  })

  return (
    <div className="max-w-full bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">🏭 Production Planning</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}
              &nbsp;·&nbsp;Auto-runs daily 08:30 · Reads Sales Orders · Checks RM &amp; Equipment
            </p>
          </div>
          <div className="flex items-center gap-3">
            {runMsg && (
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${runMsg.startsWith('✅')?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>{runMsg}</span>
            )}
            <button onClick={runEngine} disabled={running}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition">
              {running ? <><span className="animate-spin inline-block">⚙</span> Running…</> : '⚡ Run Planning Engine'}
            </button>
            <BackButton />
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-8">
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-5 w-1 bg-indigo-600 rounded-full" />
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Factory Planning Dashboard</h2>
          </div>
          <div className="grid grid-cols-4 gap-3 lg:grid-cols-8 mb-5">
            <KPICard icon="🕐" label="Orders Waiting" value={pendingCount} color="bg-amber-50 border-amber-300 text-amber-800" active={activeKpiFilter==='pending'} onClick={() => setActiveKpiFilter(f=>f==='pending'?null:'pending')} sub="Not yet planned" />
            <KPICard icon="📋" label="Ready To Plan" value={draftCount} color="bg-blue-50 border-blue-300 text-blue-800" active={activeKpiFilter==='draft'} onClick={() => setActiveKpiFilter(f=>f==='draft'?null:'draft')} sub="Draft plans" />
            <KPICard icon="✅" label="Ready To Produce" value={(dash.byStatus||[]).find(b=>b.status==='PLANNED')?.count||0} color="bg-teal-50 border-teal-300 text-teal-800" active={activeKpiFilter==='ready'} onClick={() => setActiveKpiFilter(f=>f==='ready'?null:'ready')} sub="Confirmed" />
            <KPICard icon="🔴" label="RM Shortages" value={plans.filter(p=>p.rmCheckStatus==='RED'&&p.status!=='CANCELLED').length} color="bg-red-50 border-red-300 text-red-700" active={activeKpiFilter==='rmshort'} onClick={() => setActiveKpiFilter(f=>f==='rmshort'?null:'rmshort')} sub="Need procurement" />
            <KPICard icon="🦠" label="Biomass Shortages" value={0} color="bg-purple-50 border-purple-300 text-purple-800" active={false} onClick={() => {}} sub="Cold room check" />
            <KPICard icon="⚙" label="Running Today" value={inProgressCnt} color="bg-orange-50 border-orange-300 text-orange-800" active={activeKpiFilter==='running'} onClick={() => setActiveKpiFilter(f=>f==='running'?null:'running')} sub="In production" />
            <KPICard icon="🧪" label="Waiting For QC" value={plans.filter(p=>p.status==='AWAITING_QC').length} color="bg-yellow-50 border-yellow-300 text-yellow-800" active={activeKpiFilter==='qc'} onClick={() => setActiveKpiFilter(f=>f==='qc'?null:'qc')} sub="QC pending" />
            <KPICard icon="✔" label="Completed" value={completedCnt} color="bg-green-50 border-green-300 text-green-800" active={activeKpiFilter==='completed'} onClick={() => setActiveKpiFilter(f=>f==='completed'?null:'completed')} sub="This period" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Today</p>
                <p className="text-2xl font-bold text-gray-900">{new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</p>
                <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-IN',{weekday:'long'})}</p>
              </div>
              {dash.lastRun && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400">Last engine run</p>
                  <p className="text-xs font-semibold text-gray-600 mt-0.5">{new Date(dash.lastRun.runAt).toLocaleString('en-IN')}</p>
                  <p className="text-xs text-indigo-600 font-bold mt-0.5">{dash.lastRun.plansCreated} plans created · {dash.lastRun.trigger}</p>
                </div>
              )}
            </div>
            <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Plant-Wise Load</p>
                <span className="text-xs text-gray-400">Planned vs. capacity</span>
              </div>
              <div className="divide-y divide-gray-100">
                {SECTIONS.map(s => <CapacityBar key={s} section={s} plans={plans} />)}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 bg-amber-500 rounded-full" />
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Unplanned Orders</h2>
              {pendingOrders.length > 0 && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-0.5 rounded-full">{pendingOrders.length} waiting</span>}
            </div>
            <button onClick={runEngine} disabled={running}
              className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-600 disabled:opacity-50 transition">
              {running ? '⚙ Running…' : '⚡ Auto-Plan All'}
            </button>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <UnplannedOrdersTable orders={pendingOrders} onPlan={openDrawerForNew} />
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 bg-indigo-500 rounded-full" />
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Planned Production Tasks</h2>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full">{plans.length} tasks</span>
            </div>
            {activeKpiFilter && (
              <button onClick={() => setActiveKpiFilter(null)} className="text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-50">
                ✕ Clear Filter
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center mb-3">
            <select value={filterSection} onChange={e => setFilterSection(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              <option value="ALL">All Sections</option>
              {SECTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              <option value="ALL">All Statuses</option>
              {TASK_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
            </select>
            <div className="flex flex-wrap gap-1.5">
              {(dash.byStatus||[]).filter(s=>s.count>0).map(s => (
                <button key={s.status} onClick={() => setFilterStatus(f=>f===s.status?'ALL':s.status)}
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition ${filterStatus===s.status?TASK_STATUS_STYLE[s.status]+' border-current':'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {s.status.replace(/_/g,' ')} ({s.count})
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <PlannedTasksTable plans={filteredPlans} onRowClick={openDrawerForPlan} onStatusChange={handleStatusChange} loading={loading} />
          </div>
        </section>

        <section className="pb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-5 w-1 bg-green-500 rounded-full" />
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Daily Execution Schedule</h2>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <DailyExecutionSchedule plans={plans} />
          </div>
        </section>
      </div>

      {drawer && (
        <PlanningDrawer plan={drawer.plan} pendingItem={drawer.pendingItem} onSave={handleSave} onClose={() => setDrawer(null)} equipList={equipList} employees={employees} />
      )}
    </div>
  )
}
