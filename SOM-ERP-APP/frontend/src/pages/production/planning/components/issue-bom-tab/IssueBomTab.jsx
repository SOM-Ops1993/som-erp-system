import { useState, useRef } from 'react'
import { ClipboardPaste, FlaskConical, Layers, Settings2, Sparkles, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import ComponentsTable from '../components-table/ComponentsTable.jsx'
import { incrCode } from '../../utils/bomPrintTemplates.js'
import { PLANT_KEYS, PLANT_CONFIG } from '../../data/plantConfig.js'

const SHIFTS = ['A', 'B', 'C', 'General', 'Day', 'Night']
const BATCH_TYPES = ['Commercial', 'Pilot', 'R&D', 'Trial', 'Validation']
const BATCH_UOMS = ['L', 'kg', 'mL', 'g', 'MT', 'pcs']

function Field({ label, children, span }) {
  return (
    <div className={span ? 'col-span-full' : ''}>
      <label className="text-[11px] font-semibold text-slate-500 block mb-1">{label}</label>
      {children}
    </div>
  )
}

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-[13.5px] font-bold text-slate-800 leading-tight">{title}</p>
        {description && <p className="text-[11.5px] text-slate-400 leading-tight">{description}</p>}
      </div>
    </div>
  )
}

// Base styling without a width utility — combine with an explicit width class
// at each use site instead of appending one after inputCls, since Tailwind's
// generated stylesheet order (not className order) decides which width wins
// when two width utilities are combined.
const inputBaseCls = 'border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none transition-colors focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white'
const inputCls = `w-full ${inputBaseCls}`

// Parses one pasted schedule row and auto-detects Format 1 (7 cols) vs Format 2 (11 cols) —
// same column mapping as the legacy handleSchedulePaste().
function parseSchedulePaste(text) {
  const row  = text.split(/\r?\n/)[0]
  const vals = row.split('\t')

  if (vals.length >= 10) {
    const location  = (vals[3] || '').trim()
    const equipment = (vals[6] || '').trim()
    return {
      label: 'Format 2 detected (11-col schedule)',
      patch: {
        batchIncharge: vals[0]?.trim() || '',
        diNumber:      vals[1]?.trim() || '',
        shift:         vals[2]?.trim() || '',
        reactor:       location || equipment,
        product:       vals[4]?.trim() || '',
        batchNo:       vals[5]?.trim() || '',
        batchSize:     vals[10]?.trim() || '',
      },
    }
  }
  return {
    label: 'Format 1 detected (7-col schedule)',
    patch: {
      diNumber:      vals[0]?.trim() || '',
      shift:         vals[1]?.trim() || '',
      batchIncharge: vals[2]?.trim() || '',
      reactor:       vals[3]?.trim() || '',
      product:       vals[4]?.trim() || '',
      batchNo:       vals[5]?.trim() || '',
      batchSize:     vals[6]?.trim() || '',
    },
  }
}

export default function IssueBomTab({
  form, setForm, rows, setRows, settings, setSettings,
  productSuggestions, onProductSearch, onSelectProduct, recipeLoadedMsg,
  onGenerate, generating, error,
  rmList, onSaveCorrections, savingCorrections,
}) {
  const [pasteLabel, setPasteLabel] = useState('')
  const [showSugg, setShowSugg]     = useState(false)
  const pasteRef = useRef(null)

  const patch = (fields) => setForm(f => ({ ...f, ...fields }))

  const n = Math.max(1, parseInt(form.cycles, 10) || 1)
  const lastBatch = form.batchNo ? incrCode(form.batchNo, n - 1) : ''
  const componentCount = rows.filter(r => r.comp?.trim() && !r.comp.trim().startsWith('##')).length
  const totalQty = form.batchSize ? (parseFloat(form.batchSize || 0) * n) : 0

  const handleSchedulePaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    const { label, patch: p } = parseSchedulePaste(text)
    patch(p)
    setPasteLabel(`✓ ${label} — filled`)
    if (pasteRef.current) pasteRef.current.value = ''
  }

  return (
    <div className="max-w-[1700px] mx-auto p-6">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5">
          <AlertTriangle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        {/* ── Main column ─────────────────────────────────────────── */}
        <div className="space-y-5 min-w-0">
          {/* Paste-from-schedule zone */}
          <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3.5">
            <p className="text-[12.5px] text-amber-900 font-semibold mb-1.5 flex items-center gap-1.5">
              <ClipboardPaste size={14} /> Paste from Schedule — click the box, then Ctrl+V. Format is auto-detected.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-amber-700 mb-2">
              <div className="bg-white/70 border border-amber-200 rounded-md px-2.5 py-1.5">
                <b>Format 1 (7 cols):</b> DI No → Shift → Batch Incharge → Reactor → Product → Batch No → Total Qty
              </div>
              <div className="bg-white/70 border border-amber-200 rounded-md px-2.5 py-1.5">
                <b>Format 2 (11 cols):</b> Incharge → DI No → Shift → Location → Product → Batch Code → Equipment → … → Total Qty
              </div>
            </div>
            <input ref={pasteRef} onPaste={handleSchedulePaste}
              placeholder="👆 Click here and paste your schedule row (Ctrl+V)"
              className="w-full border-2 border-dashed border-amber-400 bg-amber-50/60 rounded-lg px-3 py-2 text-[13px] text-amber-900 outline-none focus:bg-white transition-colors" />
            {pasteLabel && <p className="text-[11px] text-green-700 font-medium mt-1.5 flex items-center gap-1"><CheckCircle2 size={12} /> {pasteLabel}</p>}
          </div>

          {/* Header form */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <SectionHeader icon={FlaskConical} title="Batch Details" description="Product, schedule and equipment for this requisition" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="col-span-full relative">
                <Field label="Product Name *">
                  <input value={form.product}
                    onChange={e => { patch({ product: e.target.value, productCode: '' }); onProductSearch(e.target.value); setShowSugg(true) }}
                    onFocus={() => setShowSugg(true)}
                    onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                    placeholder="Type to search recipes in the Recipe Master…"
                    className={inputCls} autoComplete="off" />
                </Field>
                {showSugg && productSuggestions.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {productSuggestions.map(p => (
                      <div key={p.productCode}
                        onMouseDown={() => { onSelectProduct(p.productCode, p.productName); setShowSugg(false) }}
                        className="px-3 py-2 text-[13px] hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 flex items-center justify-between">
                        <span className="font-medium text-slate-800">{p.productName}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{p.productCode}</span>
                      </div>
                    ))}
                  </div>
                )}
                {recipeLoadedMsg && (
                  <p className="text-[12px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 mt-1.5">{recipeLoadedMsg}</p>
                )}
                {/* No recipe matched what's typed — without this, an unmatched
                    name (typo, or a product with no BOM in Recipe Master yet)
                    silently leaves the components table empty with no clue why. */}
                {!recipeLoadedMsg && !form.productCode && form.product.trim() && productSuggestions.length === 0 && (
                  <p className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-1.5">
                    ⚠ No recipe found matching "{form.product.trim()}" in the Recipe Master — check the spelling, or add its BOM in the Recipe Library tab first.
                  </p>
                )}
              </div>

              <Field label="DI Number">
                <input value={form.diNumber} onChange={e => patch({ diNumber: e.target.value })} placeholder="e.g. LT-26-018" className={inputCls} />
              </Field>
              <Field label="Shift">
                <select value={form.shift} onChange={e => patch({ shift: e.target.value })} className={inputCls}>
                  {SHIFTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Batch Incharge">
                <input value={form.batchIncharge} onChange={e => patch({ batchIncharge: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Reactor / Equipment">
                <input value={form.reactor} onChange={e => patch({ reactor: e.target.value })} placeholder="e.g. Reactor-1" className={inputCls} />
              </Field>

              <Field label="Batch No (First) *">
                <input value={form.batchNo} onChange={e => patch({ batchNo: e.target.value })} placeholder="e.g. LT-RO260402" className={inputCls} />
                <div className="text-[11px] text-green-700 font-medium mt-1">
                  {form.batchNo && n > 1 ? `Cycles ${n}: ${form.batchNo} → ${lastBatch}` : 'Auto-increments across cycles'}
                </div>
              </Field>
              <Field label="Type of Batch">
                <select value={form.batchType} onChange={e => patch({ batchType: e.target.value })} className={inputCls}>
                  {BATCH_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Batch Size * & UOM">
                <div className="flex gap-2">
                  <input type="number" value={form.batchSize} onChange={e => patch({ batchSize: e.target.value })}
                    placeholder="e.g. 300" className={`${inputBaseCls} flex-1 min-w-0`} />
                  <select value={form.batchSizeUom} onChange={e => patch({ batchSizeUom: e.target.value })}
                    className={`${inputBaseCls} w-20 flex-shrink-0`}>
                    {BATCH_UOMS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </Field>
              <Field label="Plant *">
                <select value={form.section} onChange={e => patch({ section: e.target.value })} className={inputCls}>
                  <option value="">— Select Plant —</option>
                  {PLANT_KEYS.map(p => <option key={p} value={p}>{PLANT_CONFIG[p]?.label || p}</option>)}
                </select>
              </Field>

              <Field label="Date of Requisition">
                <input type="date" value={form.dateRequisition} onChange={e => patch({ dateRequisition: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Date Batch Planned">
                <input type="date" value={form.datePlanned} onChange={e => patch({ datePlanned: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Remarks" span>
                <input value={form.remarks} onChange={e => patch({ remarks: e.target.value })}
                  placeholder="General remarks (appears at bottom of BOM)" className={inputCls} />
              </Field>
            </div>
          </div>

          <ComponentsTable
            rows={rows} onChange={setRows}
            rmList={rmList} onSaveCorrections={onSaveCorrections} savingCorrections={savingCorrections}
          />

          {/* Issuance settings */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <SectionHeader icon={Settings2} title="Issuance Settings" description="Cycles and which paperwork gets attached" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <Field label="Number of Cycles / Batches">
                <input type="number" min={1} value={form.cycles} onChange={e => patch({ cycles: e.target.value })} className={inputCls} />
              </Field>
              <div className="sm:col-span-2 bg-slate-50 border border-slate-100 rounded-lg px-3.5 py-2.5 text-[12px] text-slate-600 flex items-center">
                {form.batchNo ? <>Batches: <b>{form.batchNo}</b> → <b>{lastBatch}</b>{form.batchSize ? <> · Total: <b>{totalQty.toLocaleString()} {form.batchSizeUom}</b></> : ''}</> : <span className="text-red-500 flex items-center gap-1"><AlertTriangle size={13} /> Enter Batch No</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
              <label className="flex items-center gap-2 bg-slate-50 rounded-lg px-3.5 py-2.5 text-[13px] cursor-pointer hover:bg-slate-100 transition-colors">
                <input type="checkbox" checked={settings.showTotal} onChange={e => setSettings(s => ({ ...s, showTotal: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
                <span className="font-medium text-slate-700">Show Total Quantity row at bottom of BOM</span>
              </label>
              <label className="flex items-center gap-2 bg-slate-50 rounded-lg px-3.5 py-2.5 text-[13px] cursor-pointer hover:bg-slate-100 transition-colors">
                <input type="checkbox" checked={settings.inclMasterSheet} onChange={e => setSettings(s => ({ ...s, inclMasterSheet: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
                <span className="font-medium text-slate-700">Include Master Requisition Sheet</span>
              </label>
              <label className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-[13px] cursor-pointer hover:bg-red-100/60 transition-colors">
                <input type="checkbox" checked={settings.skipCycleBOMs} onChange={e => setSettings(s => ({ ...s, skipCycleBOMs: e.target.checked }))} className="w-4 h-4 accent-red-600" />
                <span className="font-medium text-red-700">Skip individual cycle BOMs</span>
              </label>
              <label className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3.5 py-2.5 text-[13px] cursor-pointer hover:bg-orange-100/60 transition-colors">
                <input type="checkbox" checked={settings.sectionOnlyBMR} onChange={e => setSettings(s => ({ ...s, sectionOnlyBMR: e.target.checked }))} className="w-4 h-4 accent-orange-600" />
                <span className="font-medium text-orange-700">Section-Summary BMR</span>
              </label>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
              <p className="text-[13px] font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                <Sparkles size={14} /> Batch Sheets — driven by Plant selected above
              </p>
              {form.section === 'Nano' ? (
                <div className="bg-blue-50 border border-blue-300 rounded-lg px-3.5 py-2.5 text-[13px] text-blue-900">
                  <b>📘 Nano Technology Plant</b> — all 4 batch report pages (Pre-Start Checklist, Reactor Cleaning &amp; Batch
                  Start, Formulation Protocol, QC Form) are auto-attached to each BOM cycle.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    ['inclTechnical', 'Technical Sheet', 'Microbial culture prep'],
                    ['inclFormulation', 'Formulation Sheet', 'BOM components + blending'],
                    ['inclPacking', 'Packing Sheet', 'Packing, labelling, dispatch'],
                    ['inclCOA', 'COA Sheet', 'Certificate of Analysis'],
                  ].map(([key, title, desc]) => (
                    <label key={key} className="flex items-center gap-2.5 bg-white border border-amber-200 rounded-lg px-3 py-2 text-[13px] cursor-pointer hover:border-amber-400 transition-colors">
                      <input type="checkbox" checked={settings[key]} onChange={e => setSettings(s => ({ ...s, [key]: e.target.checked }))} className="w-4 h-4 accent-amber-600" />
                      <span><b>{title}</b><br /><span className="text-[11px] text-slate-500">{desc}</span></span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button type="button" onClick={onGenerate} disabled={generating}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm hover:shadow-md">
            {generating ? 'Preparing…' : '✅ Preview & Issue BOMs'}
          </button>
        </div>

        {/* ── Summary sidebar ─────────────────────────────────────── */}
        <aside className="space-y-4 xl:sticky xl:top-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">Product</p>
            {form.product.trim() ? (
              <>
                <p className="text-[14px] font-bold text-slate-800 leading-snug">{form.product}</p>
                {form.productCode && <p className="text-[11px] font-mono text-slate-400 mt-0.5">{form.productCode}</p>}
                <div className="mt-2.5">
                  {recipeLoadedMsg ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                      <CheckCircle2 size={12} /> Recipe loaded
                    </span>
                  ) : form.productCode ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                      <Info size={12} /> Loading recipe…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
                      <AlertTriangle size={12} /> No matching recipe
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-[12.5px] text-slate-400">No product selected yet — search above or paste a schedule row.</p>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">Batch Summary</p>
            <dl className="space-y-2 text-[12.5px]">
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Batch range</dt>
                <dd className="font-semibold text-slate-700 text-right">{form.batchNo ? (n > 1 ? `${form.batchNo} → ${lastBatch}` : form.batchNo) : '—'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Cycles</dt>
                <dd className="font-semibold text-slate-700">{n}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Total quantity</dt>
                <dd className="font-semibold text-slate-700">{totalQty ? `${totalQty.toLocaleString()} ${form.batchSizeUom}` : '—'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Plant</dt>
                <dd className="font-semibold text-slate-700">{form.section ? (PLANT_CONFIG[form.section]?.label || form.section) : '—'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Type</dt>
                <dd className="font-semibold text-slate-700">{form.batchType}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Layers size={13} /> Components
            </p>
            <p className="text-2xl font-bold text-slate-800">{componentCount}</p>
            <p className="text-[11.5px] text-slate-400 mt-0.5">ingredient row{componentCount === 1 ? '' : 's'} in this BOM</p>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
            <p className="text-[11.5px] text-indigo-800 leading-relaxed">
              💡 Tip: paste a schedule row above to auto-fill this whole form, or type a Product Name that exists in the
              Recipe Master to pull its BOM in automatically — scaled to your Batch Size.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
