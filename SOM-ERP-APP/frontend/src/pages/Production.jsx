import { useState, useEffect } from 'react'
import { productionApi, indentApi, sfgApi } from '../api/client.js'

// ─── Stage config ────────────────────────────────────────────────────────────
const STAGES = [
  { key: 'BIOMASS',     label: 'Biomass Input',       icon: '🧫', color: '#16a34a' },
  { key: 'TECHNICAL',   label: 'Technical',            icon: '⚙️',  color: '#2563eb' },
  { key: 'FORMULATION', label: 'Formulation',          icon: '🔄',  color: '#7c3aed' },
  { key: 'UNLOADING',   label: 'Unloading',            icon: '📦',  color: '#b45309' },
  { key: 'SIEVING',     label: 'Sieving',              icon: '⬡',  color: '#0891b2' },
  { key: 'PACKING',     label: 'Packing',              icon: '🎁',  color: '#dc2626' },
  { key: 'QC',          label: 'QC Sampling',          icon: '🧪',  color: '#9333ea' },
  { key: 'INVENTORY',   label: 'Inventory Handover',   icon: '✅',  color: '#065f46' },
]
const STAGE_KEYS = STAGES.map(s => s.key)

const STATUS_COLOR = { DRAFT: 'bg-gray-100 text-gray-600', IN_PROGRESS: 'bg-amber-100 text-amber-700', COMPLETED: 'bg-emerald-100 text-emerald-700' }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Flag({ active }) {
  if (!active) return null
  return <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">⚑ Flag</span>
}

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function Input({ value, onChange, type = 'text', placeholder, readOnly, className = '' }) {
  return (
    <input
      type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder}
      readOnly={readOnly}
      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none
        focus:ring-2 focus:ring-indigo-400 bg-white disabled:bg-gray-50
        ${readOnly ? 'bg-gray-50 text-gray-500' : ''} ${className}`}
    />
  )
}

function SaveBtn({ saving, onClick, label = 'Save & Continue' }) {
  return (
    <button onClick={onClick} disabled={saving}
      className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2">
      {saving ? <><span className="animate-spin">↻</span> Saving…</> : <>{label}</>}
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Production() {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeBatch, setActiveBatch] = useState(null)   // full batch object with all stages
  const [activeStageKey, setActiveStageKey] = useState('BIOMASS')
  const [showNewForm, setShowNewForm] = useState(false)
  const [indents, setIndents] = useState([])

  useEffect(() => { loadBatches() }, [])

  const loadBatches = async () => {
    setLoading(true)
    try {
      const res = await productionApi.list()
      setBatches(res.data || [])
    } catch { /* silent */ }
    setLoading(false)
  }

  const openBatch = async (batch) => {
    try {
      const res = await productionApi.get(batch.id)
      setActiveBatch(res.data)
      setActiveStageKey(res.data.currentStage || 'BIOMASS')
    } catch (e) { alert(e.message) }
  }

  const refreshBatch = async () => {
    if (!activeBatch) return
    const res = await productionApi.get(activeBatch.id)
    setActiveBatch(res.data)
    loadBatches()
  }

  const stageIndex = (key) => STAGE_KEYS.indexOf(key)
  const currentIdx = activeBatch ? stageIndex(activeBatch.currentStage) : 0
  const activeIdx  = stageIndex(activeStageKey)

  if (activeBatch) {
    return (
      <div className="flex h-full" style={{ minHeight: 0 }}>
        {/* Stage nav (left) */}
        <div className="w-52 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
          <div className="px-4 py-3 border-b bg-gray-50">
            <button onClick={() => { setActiveBatch(null); loadBatches() }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
              ← All Batches
            </button>
            <p className="font-bold text-gray-900 text-sm mt-2 truncate">{activeBatch.productName}</p>
            <p className="font-mono text-xs text-gray-400 mt-0.5">{activeBatch.batchCode}</p>
            <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLOR[activeBatch.status]}`}>
              {activeBatch.status}
            </span>
          </div>
          <nav className="flex-1 py-2">
            {STAGES.map((s, i) => {
              const done = i < currentIdx
              const current = i === currentIdx
              const isActive = s.key === activeStageKey
              const flags = activeBatch[`${s.key.toLowerCase()}Flag`]
              return (
                <button key={s.key} onClick={() => setActiveStageKey(s.key)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-sm transition
                    border-l-4 ${isActive ? 'bg-indigo-50 border-indigo-500' : 'border-transparent hover:bg-gray-50'}`}>
                  <span className="text-base leading-none" style={{ minWidth: 20 }}>{done ? '✓' : s.icon}</span>
                  <span className={`flex-1 text-xs font-medium
                    ${done ? 'text-emerald-600' : current ? 'text-indigo-700 font-semibold' : 'text-gray-500'}`}>
                    {s.label}
                  </span>
                  {flags && <span className="text-amber-500 text-xs">⚑</span>}
                </button>
              )
            })}
          </nav>
          {/* Batch meta */}
          <div className="px-4 py-3 border-t text-xs text-gray-400 space-y-1">
            <p>DI: <span className="font-mono text-gray-600">{activeBatch.diNo}</span></p>
            <p>Order Qty: <strong className="text-gray-700">{activeBatch.orderQty} kg</strong></p>
            {activeBatch.temperature && <p>Temp: {activeBatch.temperature}°C</p>}
            {activeBatch.humidity && <p>Humidity: {activeBatch.humidity}%</p>}
          </div>
        </div>

        {/* Stage content (right) */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {activeStageKey === 'BIOMASS'     && <Stage1Biomass     batch={activeBatch} onSaved={refreshBatch} />}
          {activeStageKey === 'TECHNICAL'   && <Stage2Technical   batch={activeBatch} onSaved={refreshBatch} />}
          {activeStageKey === 'FORMULATION' && <Stage3Formulation batch={activeBatch} onSaved={refreshBatch} />}
          {activeStageKey === 'UNLOADING'   && <Stage4Unloading   batch={activeBatch} onSaved={refreshBatch} />}
          {activeStageKey === 'SIEVING'     && <Stage5Sieving     batch={activeBatch} onSaved={refreshBatch} />}
          {activeStageKey === 'PACKING'     && <Stage6Packing     batch={activeBatch} onSaved={refreshBatch} />}
          {activeStageKey === 'QC'          && <Stage7QC          batch={activeBatch} onSaved={refreshBatch} />}
          {activeStageKey === 'INVENTORY'   && <Stage8Inventory   batch={activeBatch} onSaved={refreshBatch} />}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏭 Production Master</h1>
          <p className="text-sm text-gray-500 mt-1">Powder Formulations — end-to-end batch execution & traceability</p>
        </div>
        <button onClick={() => { setShowNewForm(true); indentApi.list({ limit: 200 }).then(r => setIndents(r.data || [])) }}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-700 transition">
          + Start New Batch
        </button>
      </div>

      {/* Category tabs (future scalability) */}
      <div className="flex gap-0 mb-5 border-b border-gray-200">
        {['Powder Formulations', 'Liquid (soon)', 'Granules (soon)', 'Microbial (soon)'].map((t, i) => (
          <button key={t} disabled={i > 0}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition -mb-px
              ${i === 0 ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-300 cursor-not-allowed'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Batch list */}
      {loading ? <p className="text-gray-400">Loading…</p> : batches.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">🏭</p>
          <p className="font-semibold text-gray-500">No production batches yet</p>
          <p className="text-sm mt-1">Click "Start New Batch" to begin — link to a closed indent</p>
        </div>
      ) : (
        <div className="space-y-2">
          {batches.map(b => {
            const anyFlag = b.biomassFlag || b.technicalFlag || b.formulationFlag || b.sievingFlag || b.packingFlag || b.qcFlag
            return (
              <div key={b.id} onClick={() => openBatch(b)}
                className="bg-white border border-gray-200 rounded-xl px-5 py-4 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900">{b.productName}</span>
                    <span className="font-mono text-xs text-indigo-600">{b.batchCode}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLOR[b.status]}`}>{b.status}</span>
                    {anyFlag && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-semibold">⚑ Flags</span>}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-400 mt-1 flex-wrap">
                    <span>DI: <span className="font-mono">{b.diNo}</span></span>
                    <span>Order: <strong>{b.orderQty} kg</strong></span>
                    <span>Cycles: {b.formulationCycles?.length || 0}</span>
                    <span>{new Date(b.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</span>
                  </div>
                </div>
                {/* Stage progress dots */}
                <div className="hidden sm:flex items-center gap-1">
                  {STAGES.map((s, i) => {
                    const idx = stageIndex(b.currentStage)
                    return <div key={s.key} className={`w-2.5 h-2.5 rounded-full ${i < idx ? 'bg-emerald-400' : i === idx ? 'bg-indigo-500' : 'bg-gray-200'}`} title={s.label} />
                  })}
                </div>
                <span className="text-gray-300 text-sm">›</span>
              </div>
            )
          })}
        </div>
      )}

      {/* New batch modal */}
      {showNewForm && (
        <NewBatchModal indents={indents} onClose={() => setShowNewForm(false)}
          onCreate={async (payload) => {
            try {
              const res = await productionApi.create(payload)
              setShowNewForm(false)
              await openBatch(res.data)
              loadBatches()
            } catch (e) { alert(e.message) }
          }} />
      )}
    </div>
  )
}

// ─── New Batch Modal ──────────────────────────────────────────────────────────
function NewBatchModal({ indents, onClose, onCreate }) {
  const [indentId, setIndentId] = useState('')
  const [temp, setTemp] = useState('')
  const [humidity, setHumidity] = useState('')
  const [cfuTarget, setCfuTarget] = useState('')
  const [creating, setCreating] = useState(false)
  const selected = indents.find(i => i.indentId === indentId)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Start New Production Batch</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <Field label="Select Indent *">
            <select value={indentId} onChange={e => setIndentId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">— Choose a production indent —</option>
              {indents.filter(i => i.status === 'CLOSED' || i.status === 'OPEN').map(i => (
                <option key={i.indentId} value={i.indentId}>
                  {i.productName} · {i.batchNo} · {i.diNo} ({i.status})
                </option>
              ))}
            </select>
          </Field>
          {selected && (
            <div className="bg-indigo-50 border border-indigo-100 px-4 py-3 rounded-lg text-sm space-y-1">
              <p><span className="text-indigo-400">Product:</span> <strong>{selected.productName}</strong></p>
              <p><span className="text-indigo-400">Batch Code:</span> <span className="font-mono">{selected.batchNo}</span></p>
              <p><span className="text-indigo-400">Order Qty:</span> {selected.batchSize} kg</p>
              <p><span className="text-indigo-400">DI No:</span> {selected.diNo}</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Temperature (°C)">
              <Input type="number" value={temp} onChange={e => setTemp(e.target.value)} placeholder="e.g. 28" />
            </Field>
            <Field label="Humidity (%)">
              <Input type="number" value={humidity} onChange={e => setHumidity(e.target.value)} placeholder="e.g. 65" />
            </Field>
            <Field label="CFU Target">
              <Input value={cfuTarget} onChange={e => setCfuTarget(e.target.value)} placeholder="e.g. 1×10⁸" />
            </Field>
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={async () => {
            if (!indentId) { alert('Select an indent first'); return }
            setCreating(true)
            await onCreate({ indentId, category: 'POWDER', temperature: temp || undefined, humidity: humidity || undefined, cfuTarget: cfuTarget || undefined })
            setCreating(false)
          }} disabled={!indentId || creating}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition">
            {creating ? 'Creating…' : '🏭 Create Production Batch'}
          </button>
          <button onClick={onClose} className="border border-gray-300 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Stage 1: Biomass Input ───────────────────────────────────────────────────
function Stage1Biomass({ batch, onSaved }) {
  const [rows, setRows] = useState(batch.biomassInputs?.length ? batch.biomassInputs : [emptyBiomass()])
  const [saving, setSaving] = useState(false)
  function emptyBiomass() { return { cultureName:'', batchNo:'', doi:'', cfuPerGram:'', biomassQty:'', moisture:'', form:'', receivedFrom:'', receivedDate:'', receivedTime:'' } }
  const addRow = () => setRows(r => [...r, emptyBiomass()])
  const removeRow = (i) => { if (rows.length > 1) setRows(r => r.filter((_, idx) => idx !== i)) }
  const update = (i, key, val) => setRows(r => r.map((row, idx) => idx === i ? { ...row, [key]: val } : row))

  const save = async () => {
    setSaving(true)
    try {
      await productionApi.saveBiomass(batch.id, rows)
      await onSaved()
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  return (
    <StageCard title="🧫 Stage 1 — Biomass Input" flag={batch.biomassFlag}
      desc="Record all culture/biomass inputs for this production batch. Add one row per culture.">
      <div className="space-y-4">
        {rows.map((row, i) => (
          <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-indigo-700 uppercase">Culture Entry #{i + 1}</p>
              {rows.length > 1 && (
                <button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600 text-xs font-medium">✕ Remove</button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Culture Name *">
                <Input value={row.cultureName} onChange={e => update(i,'cultureName',e.target.value)} placeholder="e.g. Bacillus subtilis" />
              </Field>
              <Field label="Batch No">
                <Input value={row.batchNo} onChange={e => update(i,'batchNo',e.target.value)} placeholder="MCB-001" />
              </Field>
              <Field label="DOI / DOH">
                <Input type="date" value={row.doi} onChange={e => update(i,'doi',e.target.value)} />
              </Field>
              <Field label="CFU/g" hint={!row.cfuPerGram ? '⚑ Required for flag' : ''}>
                <Input type="number" value={row.cfuPerGram} onChange={e => update(i,'cfuPerGram',e.target.value)} placeholder="e.g. 1000000000" />
              </Field>
              <Field label="Biomass Qty (kg)" hint={!row.biomassQty ? '⚑ Required for flag' : ''}>
                <Input type="number" value={row.biomassQty} onChange={e => update(i,'biomassQty',e.target.value)} placeholder="kg" />
              </Field>
              <Field label="Moisture %">
                <Input type="number" value={row.moisture} onChange={e => update(i,'moisture',e.target.value)} placeholder="%" />
              </Field>
              <Field label="Form">
                <select value={row.form} onChange={e => update(i,'form',e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                  <option value="">— Select —</option>
                  {['Broth', 'Spray Dried', 'Koji', 'Harvested'].map(f => <option key={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Received From">
                <select value={row.receivedFrom} onChange={e => update(i,'receivedFrom',e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                  <option value="">— Select —</option>
                  {['MCR', 'SSF', 'External'].map(f => <option key={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Date Received">
                <Input type="date" value={row.receivedDate} onChange={e => update(i,'receivedDate',e.target.value)} />
              </Field>
              <Field label="Time Received">
                <Input type="time" value={row.receivedTime} onChange={e => update(i,'receivedTime',e.target.value)} />
              </Field>
            </div>
          </div>
        ))}
        <button onClick={addRow} className="border-2 border-dashed border-indigo-300 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 transition w-full">
          + Add Another Culture Entry
        </button>
      </div>
      <div className="mt-5 flex gap-3"><SaveBtn saving={saving} onClick={save} /></div>
    </StageCard>
  )
}

// ─── Stage 2: Technical ───────────────────────────────────────────────────────
function Stage2Technical({ batch, onSaved }) {
  const d = batch.technicalDetail || {}
  const [form, setForm] = useState({
    method: d.method || 'MANUAL',
    startTime: d.startTime || '', endTime: d.endTime || '',
    biomassQty: d.biomassQty ?? '',
    qtyAfterSieving: d.qtyAfterSieving ?? '',
  })
  const [saving, setSaving] = useState(false)
  const up = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-calculate co-formulants
  const bq = parseFloat(form.biomassQty) || 0
  const silica   = bq > 0 ? (bq * 0.40).toFixed(3) : (d.silicaQty ?? '—')
  const caco3    = bq > 0 ? (bq * 0.30).toFixed(3) : (d.caco3Qty ?? '—')
  const mgStear  = bq > 0 ? (bq * 0.10).toFixed(3) : (d.mgStearateQty ?? '—')
  const smp      = bq > 0 ? (bq * 0.10).toFixed(3) : (d.smpQty ?? '—')
  const coForm   = bq > 0 ? (bq * 0.90).toFixed(3) : '—'
  const total    = bq > 0 ? (bq * 1.90).toFixed(3) : (d.totalTechnicalQty ?? '—')
  const afterSiev = parseFloat(form.qtyAfterSieving) || 0
  const wastage  = (parseFloat(total) > 0 && afterSiev > 0) ? (parseFloat(total) - afterSiev).toFixed(3) : '—'

  const save = async () => {
    setSaving(true)
    try {
      await productionApi.saveTechnical(batch.id, { ...form, totalTechnicalQty: total !== '—' ? total : undefined, wastage: wastage !== '—' ? wastage : undefined })
      await onSaved()
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  return (
    <StageCard title="⚙️ Stage 2 — Technical Stage" flag={batch.technicalFlag}
      desc="Record technical blending details. Co-formulants auto-calculate from biomass quantity.">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Field label="Method">
          <select value={form.method} onChange={e => up('method', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
            <option value="MANUAL">Manual</option>
            <option value="RMG">RMG (Rapid Mixer Granulator)</option>
          </select>
        </Field>
        <Field label="Start Time">
          <Input type="time" value={form.startTime} onChange={e => up('startTime', e.target.value)} />
        </Field>
        <Field label="End Time">
          <Input type="time" value={form.endTime} onChange={e => up('endTime', e.target.value)} />
        </Field>
        <Field label="Biomass Qty (kg)" hint="Co-formulants auto-calculate from this">
          <Input type="number" value={form.biomassQty} onChange={e => up('biomassQty', e.target.value)} placeholder="kg" />
        </Field>
      </div>

      {/* Auto-calculated co-formulants */}
      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">Co-formulants (auto-calculated)</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          {[
            { label: 'Silica (40%)', val: silica },
            { label: 'CaCO₃ (30%)', val: caco3 },
            { label: 'Mg Stearate (10%)', val: mgStear },
            { label: 'SMP (10%)', val: smp },
            { label: 'Total Co-Form.', val: coForm },
          ].map(({ label, val }) => (
            <div key={label} className="bg-white rounded-lg p-2 border border-blue-100">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-lg font-bold text-blue-700">{val}</p>
              {val !== '—' && <p className="text-xs text-gray-400">kg</p>}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between bg-slate-800 text-white rounded-lg px-4 py-2">
          <span className="text-sm font-semibold">Total Technical Qty (Biomass + Co-Form.)</span>
          <span className="text-xl font-bold">{total} kg</span>
        </div>
      </div>

      {/* Post-sieving wastage */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Field label="Qty After Sieving (kg)" hint="Manual entry">
          <Input type="number" value={form.qtyAfterSieving} onChange={e => up('qtyAfterSieving', e.target.value)} placeholder="kg" />
        </Field>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Wastage (kg)</label>
          <div className="border border-red-200 bg-red-50 rounded-lg px-3 py-2 text-sm font-bold text-red-600">
            {wastage} kg
          </div>
          <p className="text-xs text-gray-400 mt-0.5">= Total − After Sieving (read-only)</p>
        </div>
      </div>

      <div className="mt-5 flex gap-3"><SaveBtn saving={saving} onClick={save} /></div>
    </StageCard>
  )
}

// ─── Stage 3: Formulation Cycles ──────────────────────────────────────────────
function Stage3Formulation({ batch, onSaved }) {
  const [cycles, setCycles] = useState(batch.formulationCycles || [])
  const [editCycle, setEditCycle] = useState(null)   // null = add new
  const [showForm, setShowForm] = useState(false)
  const [sfgList, setSfgList] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    sfgApi.listAll({}).then(r => setSfgList(r.data || [])).catch(() => {})
  }, [])

  const emptyC = () => ({
    formulationDate: '', startTime: '', endTime: '',
    noOfWorkers: '', sfgUsed: false, sfgId: '', sfgDiNo: '', sfgQtyUsed: '',
    carrierType: '', inchargeName: ''
  })

  const openAdd = () => { setEditCycle(emptyC()); setShowForm(true) }
  const openEdit = (c) => { setEditCycle({ ...c }); setShowForm(true) }

  const save = async () => {
    if (!editCycle) return
    setSaving(true)
    try {
      if (editCycle.id) {
        await productionApi.updateCycle(batch.id, editCycle.id, editCycle)
      } else {
        await productionApi.addCycle(batch.id, editCycle)
      }
      await onSaved()
      const res = await productionApi.get(batch.id)
      setCycles(res.data.formulationCycles || [])
      setShowForm(false)
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  const deleteCycle = async (cycleId) => {
    if (!confirm('Delete this cycle?')) return
    await productionApi.deleteCycle(batch.id, cycleId)
    setCycles(c => c.filter(x => x.id !== cycleId))
  }

  const totalCycles = Math.ceil(batch.orderQty / 1000)  // rough estimate: 1T equipment

  return (
    <StageCard title="🔄 Stage 3 — Formulation Cycles" flag={batch.formulationFlag}
      desc={`Batch-wise formulation execution. For ${batch.orderQty} kg order — estimated ~${totalCycles} cycle(s).`}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">{cycles.length} cycle{cycles.length !== 1 ? 's' : ''} recorded</p>
        <button onClick={openAdd} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition">
          + Add Cycle
        </button>
      </div>

      {cycles.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
          No formulation cycles yet — click "Add Cycle" to begin
        </div>
      ) : (
        <div className="space-y-2">
          {cycles.map(c => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-4">
              <div className="text-2xl font-black text-indigo-200">#{c.cycleNo}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{c.formulationDate || '—'}</span>
                  <span className="text-xs text-gray-400">{c.startTime} → {c.endTime}</span>
                  {c.sfgUsed && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">SFG Used</span>}
                  {c.flagged && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-semibold">⚑ Flag</span>}
                </div>
                <div className="flex gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                  {c.noOfWorkers && <span>Workers: {c.noOfWorkers}</span>}
                  {c.carrierType && <span>Carrier: {c.carrierType}</span>}
                  {c.inchargeName && <span>Incharge: {c.inchargeName}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(c)} className="text-indigo-500 hover:text-indigo-700 text-xs font-medium border border-indigo-200 px-2.5 py-1 rounded-lg">Edit</button>
                <button onClick={() => deleteCycle(c.id)} className="text-red-400 hover:text-red-600 text-xs font-medium border border-red-200 px-2.5 py-1 rounded-lg">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cycle form modal */}
      {showForm && editCycle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold">{editCycle.id ? 'Edit' : 'Add'} Formulation Cycle</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-xl">×</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Date"><Input type="date" value={editCycle.formulationDate} onChange={e => setEditCycle(c => ({...c, formulationDate: e.target.value}))} /></Field>
                <Field label="Start Time"><Input type="time" value={editCycle.startTime} onChange={e => setEditCycle(c => ({...c, startTime: e.target.value}))} /></Field>
                <Field label="End Time"><Input type="time" value={editCycle.endTime} onChange={e => setEditCycle(c => ({...c, endTime: e.target.value}))} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="No. of Workers"><Input type="number" value={editCycle.noOfWorkers} onChange={e => setEditCycle(c => ({...c, noOfWorkers: e.target.value}))} /></Field>
                <Field label="Carrier Type"><Input value={editCycle.carrierType || ''} onChange={e => setEditCycle(c => ({...c, carrierType: e.target.value}))} placeholder="e.g. Talc, Kaolin" /></Field>
              </div>
              <Field label="Incharge Name"><Input value={editCycle.inchargeName || ''} onChange={e => setEditCycle(c => ({...c, inchargeName: e.target.value}))} /></Field>
              <div className="border border-purple-100 rounded-xl p-4 bg-purple-50">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-purple-700 mb-3">
                  <input type="checkbox" checked={editCycle.sfgUsed} onChange={e => setEditCycle(c => ({...c, sfgUsed: e.target.checked}))} className="rounded" />
                  SFG Used in this cycle?
                </label>
                {editCycle.sfgUsed && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Select SFG">
                      <select value={editCycle.sfgId || ''} onChange={e => {
                        const sfg = sfgList.find(s => s.sfgId === e.target.value)
                        setEditCycle(c => ({ ...c, sfgId: e.target.value, sfgDiNo: sfg?.indentId || '' }))
                      }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                        <option value="">— Select SFG —</option>
                        {sfgList.map(s => <option key={s.sfgId} value={s.sfgId}>{s.productName} — Bal: {Number(s.sfgQty).toFixed(2)} kg</option>)}
                      </select>
                    </Field>
                    <Field label="SFG Qty Used (kg)"><Input type="number" value={editCycle.sfgQtyUsed || ''} onChange={e => setEditCycle(c => ({...c, sfgQtyUsed: e.target.value}))} /></Field>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <SaveBtn saving={saving} onClick={save} label={editCycle.id ? 'Update Cycle' : 'Save Cycle'} />
              <button onClick={() => setShowForm(false)} className="border border-gray-300 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </StageCard>
  )
}

// ─── Stage 4: Unloading ───────────────────────────────────────────────────────
function Stage4Unloading({ batch, onSaved }) {
  const d = batch.unloadingLog || {}
  const [form, setForm] = useState({ startTime: d.startTime||'', endTime: d.endTime||'', weightAfter: d.weightAfter??'', noOfWorkers: d.noOfWorkers??'', inchargeName: d.inchargeName||'' })
  const [saving, setSaving] = useState(false)
  const up = (k,v) => setForm(f => ({...f, [k]: v}))
  const save = async () => { setSaving(true); try { await productionApi.saveUnloading(batch.id, form); await onSaved() } catch(e){alert(e.message)} setSaving(false) }
  return (
    <StageCard title="📦 Stage 4 — Unloading" flag={batch.unloadingLog?.flagged}
      desc="Record the unloading stage after formulation.">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Field label="Start Time"><Input type="time" value={form.startTime} onChange={e=>up('startTime',e.target.value)} /></Field>
        <Field label="End Time"><Input type="time" value={form.endTime} onChange={e=>up('endTime',e.target.value)} /></Field>
        <Field label="Weight After Unloading (kg)" hint={!form.weightAfter ? '⚑ Required' : ''}>
          <Input type="number" value={form.weightAfter} onChange={e=>up('weightAfter',e.target.value)} placeholder="kg" />
        </Field>
        <Field label="No. of Workers"><Input type="number" value={form.noOfWorkers} onChange={e=>up('noOfWorkers',e.target.value)} /></Field>
        <Field label="Incharge Name"><Input value={form.inchargeName} onChange={e=>up('inchargeName',e.target.value)} /></Field>
      </div>
      <div className="mt-5 flex gap-3"><SaveBtn saving={saving} onClick={save} /></div>
    </StageCard>
  )
}

// ─── Stage 5: Sieving ────────────────────────────────────────────────────────
function Stage5Sieving({ batch, onSaved }) {
  const d = batch.sievingLog || {}
  const [form, setForm] = useState({ sievingDone: d.sievingDone||false, meshSize: d.meshSize||'', startTime: d.startTime||'', endTime: d.endTime||'', noOfWorkers: d.noOfWorkers??'', inchargeName: d.inchargeName||'' })
  const [saving, setSaving] = useState(false)
  const up = (k,v) => setForm(f => ({...f, [k]: v}))
  const save = async () => { setSaving(true); try { await productionApi.saveSieving(batch.id, form); await onSaved() } catch(e){alert(e.message)} setSaving(false) }
  return (
    <StageCard title="⬡ Stage 5 — Sieving" flag={batch.sievingLog?.flagged}
      desc="Record sieving details and mesh parameters.">
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
          <input type="checkbox" checked={form.sievingDone} onChange={e=>up('sievingDone',e.target.checked)} className="rounded" />
          Sieving Done
        </label>
      </div>
      {form.sievingDone && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Mesh Size (microns)" hint={!form.meshSize ? '⚑ Required when sieving done' : ''}>
            <select value={form.meshSize} onChange={e=>up('meshSize',e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
              <option value="">— Select —</option>
              {['850', '1000', '1500'].map(m => <option key={m}>{m} microns</option>)}
            </select>
          </Field>
          <Field label="Start Time"><Input type="time" value={form.startTime} onChange={e=>up('startTime',e.target.value)} /></Field>
          <Field label="End Time"><Input type="time" value={form.endTime} onChange={e=>up('endTime',e.target.value)} /></Field>
          <Field label="No. of Workers"><Input type="number" value={form.noOfWorkers} onChange={e=>up('noOfWorkers',e.target.value)} /></Field>
          <Field label="Incharge Name"><Input value={form.inchargeName} onChange={e=>up('inchargeName',e.target.value)} /></Field>
        </div>
      )}
      <div className="mt-5 flex gap-3"><SaveBtn saving={saving} onClick={save} /></div>
    </StageCard>
  )
}

// ─── Stage 6: Packing ────────────────────────────────────────────────────────
function Stage6Packing({ batch, onSaved }) {
  const d = batch.packingLog || {}
  const [f, setF] = useState({
    packingType: d.packingType||'', weightPerUnit: d.weightPerUnit??'', totalUnitsPacked: d.totalUnitsPacked??'',
    totalQtyPacked: d.totalQtyPacked??'', unitsPerBag: d.unitsPerBag??'', totalOuterPackages: d.totalOuterPackages??'',
    packingStart: d.packingStart||'', packingEnd: d.packingEnd||'',
    labelingStart: d.labelingStart||'', labelingEnd: d.labelingEnd||'',
    strappingStart: d.strappingStart||'', strappingEnd: d.strappingEnd||'',
    stretchWrapping: d.stretchWrapping||false, noOfCartons: d.noOfCartons??'',
    noOfWorkers: d.noOfWorkers??'', inchargeName: d.inchargeName||''
  })
  const [saving, setSaving] = useState(false)
  const up = (k,v) => setF(prev => ({...prev, [k]: v}))
  const save = async () => { setSaving(true); try { await productionApi.savePacking(batch.id, f); await onSaved() } catch(e){alert(e.message)} setSaving(false) }

  const TimeCapture = ({label, startKey, endKey}) => (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
      <p className="text-xs font-bold text-gray-500 uppercase mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Start"><Input type="time" value={f[startKey]} onChange={e=>up(startKey,e.target.value)} /></Field>
        <Field label="End"><Input type="time" value={f[endKey]} onChange={e=>up(endKey,e.target.value)} /></Field>
      </div>
    </div>
  )

  return (
    <StageCard title="🎁 Stage 6 — Packing" flag={batch.packingLog?.flagged}
      desc="Record all packing details and time stamps. Time data builds analytics for future optimization.">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <Field label="Type of Packing"><Input value={f.packingType} onChange={e=>up('packingType',e.target.value)} placeholder="e.g. HDPE bag, Drum" /></Field>
        <Field label="Weight per Unit (kg)"><Input type="number" value={f.weightPerUnit} onChange={e=>up('weightPerUnit',e.target.value)} /></Field>
        <Field label="Total Units Packed"><Input type="number" value={f.totalUnitsPacked} onChange={e=>up('totalUnitsPacked',e.target.value)} /></Field>
        <Field label="Total Qty Packed (kg)" hint={!f.totalQtyPacked ? '⚑ Required' : ''}>
          <Input type="number" value={f.totalQtyPacked} onChange={e=>up('totalQtyPacked',e.target.value)} />
        </Field>
        <Field label="Units per Bag/Drum"><Input type="number" value={f.unitsPerBag} onChange={e=>up('unitsPerBag',e.target.value)} /></Field>
        <Field label="Total Outer Packages"><Input type="number" value={f.totalOuterPackages} onChange={e=>up('totalOuterPackages',e.target.value)} /></Field>
        <Field label="No. of Cartons"><Input type="number" value={f.noOfCartons} onChange={e=>up('noOfCartons',e.target.value)} /></Field>
        <Field label="No. of Workers"><Input type="number" value={f.noOfWorkers} onChange={e=>up('noOfWorkers',e.target.value)} /></Field>
        <Field label="Incharge Name"><Input value={f.inchargeName} onChange={e=>up('inchargeName',e.target.value)} /></Field>
      </div>
      <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-3">⏱️ Time Tracking (for analytics)</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <TimeCapture label="Packing" startKey="packingStart" endKey="packingEnd" />
        <TimeCapture label="Labeling" startKey="labelingStart" endKey="labelingEnd" />
        <TimeCapture label="Carry Strapping" startKey="strappingStart" endKey="strappingEnd" />
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Stretch Wrapping</p>
          <label className="flex items-center gap-2 cursor-pointer text-sm mt-2">
            <input type="checkbox" checked={f.stretchWrapping} onChange={e=>up('stretchWrapping',e.target.checked)} className="rounded" />
            Stretch Wrapping Done
          </label>
        </div>
      </div>
      <div className="mt-5 flex gap-3"><SaveBtn saving={saving} onClick={save} /></div>
    </StageCard>
  )
}

// ─── Stage 7: QC ─────────────────────────────────────────────────────────────
function Stage7QC({ batch, onSaved }) {
  const d = batch.qcSample || {}
  const [f, setF] = useState({ sampleCollected: d.sampleCollected||false, sampleId: d.sampleId||'', collectedAtStage: d.collectedAtStage||'', submittedOn: d.submittedOn||'', rxAttached: d.rxAttached||false })
  const [saving, setSaving] = useState(false)
  const up = (k,v) => setF(prev => ({...prev, [k]: v}))
  const save = async () => { setSaving(true); try { await productionApi.saveQC(batch.id, f); await onSaved() } catch(e){alert(e.message)} setSaving(false) }
  return (
    <StageCard title="🧪 Stage 7 — QC Sampling" flag={batch.qcSample?.flagged}
      desc="Record quality control sample submission details.">
      <div className="space-y-4">
        <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
          <input type="checkbox" checked={f.sampleCollected} onChange={e=>up('sampleCollected',e.target.checked)} className="rounded" />
          Sample Collected
        </label>
        {f.sampleCollected && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sample ID"><Input value={f.sampleId} onChange={e=>up('sampleId',e.target.value)} placeholder="QCS-2026-001" /></Field>
            <Field label="Collected At Stage">
              <select value={f.collectedAtStage} onChange={e=>up('collectedAtStage',e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                <option value="">— Select Stage —</option>
                {['Biomass','Technical','Formulation','Unloading','Sieving','Packing','Final'].map(s=><option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Submitted On" hint={!f.submittedOn ? '⚑ Required when sample collected' : ''}>
              <Input type="date" value={f.submittedOn} onChange={e=>up('submittedOn',e.target.value)} />
            </Field>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                <input type="checkbox" checked={f.rxAttached} onChange={e=>up('rxAttached',e.target.checked)} className="rounded" />
                Rx Attached
              </label>
            </div>
          </div>
        )}
        {!f.sampleCollected && batch.packingLog?.totalQtyPacked && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            ⚑ Packing is complete but QC sample not yet submitted.
          </div>
        )}
      </div>
      <div className="mt-5 flex gap-3"><SaveBtn saving={saving} onClick={save} /></div>
    </StageCard>
  )
}

// ─── Stage 8: Inventory Handover ─────────────────────────────────────────────
function Stage8Inventory({ batch, onSaved }) {
  const d = batch.inventoryHandover || {}
  const [f, setF] = useState({ sentToInventoryOn: d.sentToInventoryOn||'', handedOverTo: d.handedOverTo||'', leftoverQtyAt: d.leftoverQtyAt||'', sfgUpdated: d.sfgUpdated||false, packedQty: batch.packingLog?.totalQtyPacked||'' })
  const [saving, setSaving] = useState(false)
  const up = (k,v) => setF(prev => ({...prev, [k]: v}))
  const save = async () => { setSaving(true); try { await productionApi.saveInventory(batch.id, f); await onSaved() } catch(e){alert(e.message)} setSaving(false) }
  return (
    <StageCard title="✅ Stage 8 — Inventory Handover" desc="Final stage: record inventory handover and optionally update SFG balance.">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Sent to Inventory On"><Input type="date" value={f.sentToInventoryOn} onChange={e=>up('sentToInventoryOn',e.target.value)} /></Field>
        <Field label="Handed Over To"><Input value={f.handedOverTo} onChange={e=>up('handedOverTo',e.target.value)} placeholder="Stores person name" /></Field>
        <Field label="Leftover Qty Stored At"><Input value={f.leftoverQtyAt} onChange={e=>up('leftoverQtyAt',e.target.value)} placeholder="e.g. Cold Room A" /></Field>
      </div>
      <div className="mt-4 border border-emerald-200 bg-emerald-50 rounded-xl p-4">
        <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-emerald-800 mb-2">
          <input type="checkbox" checked={f.sfgUpdated} onChange={e=>up('sfgUpdated',e.target.checked)} className="rounded" />
          Update SFG Balance after handover
        </label>
        {f.sfgUpdated && (
          <div className="mt-2">
            <Field label="Packed Qty to Deduct from SFG (kg)">
              <Input type="number" value={f.packedQty} onChange={e=>up('packedQty',e.target.value)} />
            </Field>
            <p className="text-xs text-emerald-700 mt-1">This will add to SFG packed qty and recalculate the balance automatically.</p>
          </div>
        )}
      </div>
      <div className="mt-5 flex gap-3">
        <SaveBtn saving={saving} onClick={save} label="💾 Complete & Handover" />
      </div>
    </StageCard>
  )
}

// ─── Stage Card wrapper ───────────────────────────────────────────────────────
function StageCard({ title, desc, flag, children }) {
  return (
    <div className="max-w-3xl">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          {title}
          {flag && <Flag active={flag} />}
        </h2>
        {desc && <p className="text-sm text-gray-500 mt-1">{desc}</p>}
        <div className="mt-1 text-xs text-indigo-600 font-medium">
          ℹ️ All fields optional unless flagged — system will not block progress
        </div>
      </div>
      {children}
    </div>
  )
}
