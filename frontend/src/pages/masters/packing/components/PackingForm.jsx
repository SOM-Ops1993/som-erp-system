import {
  CATEGORIES, CAT, SUB_TYPES, EMPTY_FORM,
  MATERIALS_BTL, MATERIALS_PCH, SHAPES,
  COLORS_BTL, COLORS_PCH, COLORS_CBB,
  CAPACITY_UNITS, PLY_OPTIONS, LAMINATES,
  inp, Lbl, Field,
} from './packingConstants.jsx'

export default function PackingForm({ editing, form, onChange, saving, msg, onSave, onClose }) {
  const set = (k, v) => onChange(k, v)
  const catMeta = form.category ? (CAT[form.category] || null) : null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {editing ? 'Edit Packing Material' : 'New Packing Material'}
            </h2>
            {editing && (
              <p className="text-xs text-gray-400 mt-0.5">
                Code: <span className={`font-mono font-bold ${catMeta?.cls.text}`}>{editing.itemCode}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center">×</button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[72vh] overflow-y-auto">
          {msg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-sm">{msg}</div>
          )}

          {/* Step 1 — Category */}
          <div>
            <Lbl text="Category" req />
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map(cat => (
                <button key={cat.value} type="button"
                  onClick={() => onChange('_resetCategory', cat.value)}
                  className={`p-3.5 border-2 rounded-xl text-center transition-all ${
                    form.category === cat.value
                      ? `${cat.cls.border} ${cat.cls.light} ring-2 ${cat.cls.ring}`
                      : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                  }`}>
                  <div className="text-2xl mb-1.5">{cat.icon}</div>
                  <div className="text-[11px] font-bold text-gray-700 leading-snug">{cat.label}</div>
                  <div className={`text-[10px] font-mono mt-1 ${cat.cls.text}`}>{cat.prefix}-001…</div>
                </button>
              ))}
            </div>
          </div>

          {form.category && (
            <>
              {/* Step 2 — Sub-type */}
              <div>
                <Lbl text="Type" req />
                <div className="flex flex-wrap gap-2">
                  {(SUB_TYPES[form.category] || []).map(s => (
                    <button key={s.value} type="button"
                      onClick={() => set('subType', form.subType === s.value ? '' : s.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        form.subType === s.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                      }`}>
                      <span>{s.icon}</span>{s.value}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3 — Base name */}
              <Field label="Product Name (short — specs in fields below)" req>
                <input value={form.itemName} onChange={e => set('itemName', e.target.value)}
                  placeholder={
                    form.category === 'CORRUGATED_BOXES' ? 'e.g. 5 PLY CBB' :
                    form.category === 'POUCHES_BAGS'     ? 'e.g. Silver Laminated Pouch' :
                                                           'e.g. HDPE Triangle Container'
                  }
                  className={inp} />
              </Field>

              {/* BOTTLES / CONTAINERS / TINS */}
              {form.category === 'BOTTLES_TINS' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Material">
                      <select value={form.material} onChange={e => set('material', e.target.value)} className={inp}>
                        <option value="">Select…</option>
                        {MATERIALS_BTL.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </Field>
                    <Field label="Shape">
                      <select value={form.shape} onChange={e => set('shape', e.target.value)} className={inp}>
                        <option value="">Select…</option>
                        {SHAPES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div>
                    <Lbl text="Capacity" />
                    <div className="flex gap-2">
                      <input type="number" min="0" step="any" value={form.capacity} onChange={e => set('capacity', e.target.value)} placeholder="e.g. 500" className={inp} />
                      <select value={form.capacityUnit} onChange={e => set('capacityUnit', e.target.value)} className="border border-gray-300 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-24">
                        {CAPACITY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Lbl text="Color" />
                    <div className="flex flex-wrap gap-2">
                      {COLORS_BTL.map(c => (
                        <button key={c} type="button" onClick={() => set('color', form.color === c ? '' : c)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${form.color === c ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Lbl text="Outer Dimensions — L × W × H (mm)" />
                    <div className="grid grid-cols-3 gap-3">
                      {[['length','Length'],['width','Width'],['height','Height']].map(([k,p]) => (
                        <input key={k} type="number" min="0" step="any" value={form[k]} onChange={e => set(k, e.target.value)} placeholder={p} className={inp} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* POUCHES / BAGS / COVERS */}
              {form.category === 'POUCHES_BAGS' && (
                <>
                  <Field label="Material">
                    <select value={form.material} onChange={e => set('material', e.target.value)} className={inp}>
                      <option value="">Select…</option>
                      {MATERIALS_PCH.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                  <div>
                    <Lbl text="Dimensions — Width × Height (mm)" />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="number" min="0" step="any" value={form.width} onChange={e => set('width', e.target.value)} placeholder="Width" className={inp} />
                      <input type="number" min="0" step="any" value={form.height} onChange={e => set('height', e.target.value)} placeholder="Height" className={inp} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Lbl text="Size / Capacity" />
                      <div className="flex gap-2">
                        <input type="number" min="0" step="any" value={form.capacity} onChange={e => set('capacity', e.target.value)} placeholder="e.g. 1" className={inp} />
                        <select value={form.capacityUnit} onChange={e => set('capacityUnit', e.target.value)} className="border border-gray-300 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-24">
                          {CAPACITY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                    <Field label="Color">
                      <select value={form.color} onChange={e => set('color', e.target.value)} className={inp}>
                        <option value="">Select…</option>
                        {COLORS_PCH.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                  </div>
                </>
              )}

              {/* CORRUGATED BOXES */}
              {form.category === 'CORRUGATED_BOXES' && (
                <>
                  <div>
                    <Lbl text="Ply" req />
                    <div className="flex gap-3">
                      {PLY_OPTIONS.map(p => (
                        <button key={p} type="button"
                          onClick={() => set('ply', form.ply === String(p) ? '' : String(p))}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${form.ply === String(p) ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                          {p} PLY
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Lbl text="Outer Dimensions — L × W × H (mm OD)" req />
                    <div className="grid grid-cols-3 gap-3">
                      {[['length','Length'],['width','Width'],['height','Height']].map(([k,p]) => (
                        <input key={k} type="number" min="0" step="any" value={form[k]} onChange={e => set(k, e.target.value)} placeholder={p} className={inp} />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Color / Board">
                      <select value={form.color} onChange={e => set('color', e.target.value)} className={inp}>
                        <option value="">Select…</option>
                        {COLORS_CBB.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Laminate">
                      <select value={form.laminate} onChange={e => set('laminate', e.target.value)} className={inp}>
                        <option value="">None</option>
                        {LAMINATES.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Contents Spec">
                      <input value={form.contentsSpec} onChange={e => set('contentsSpec', e.target.value)} placeholder="e.g. 20 × 500ml Round Bottles" className={inp} />
                    </Field>
                    <Field label="Pack Count">
                      <input type="number" min="0" step="1" value={form.packCount} onChange={e => set('packCount', e.target.value)} placeholder="e.g. 20" className={inp} />
                    </Field>
                  </div>
                </>
              )}

              <Field label="Notes / Remarks">
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                  placeholder="Any additional details…" className={`${inp} resize-none`} />
              </Field>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onSave} disabled={saving || !form.category}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
          </button>
          <button onClick={onClose}
            className="flex-1 border border-gray-200 py-2.5 rounded-xl hover:bg-gray-50 text-gray-700 text-sm font-medium">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
