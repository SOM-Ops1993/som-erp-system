import { useState, useEffect, useRef } from 'react'
// Shared with Planning (production/planning) — kept there, not duplicated.
import { sfgAddEntry } from '../../../planning/utils/storage.js'
import { planTasksApi } from '../../../../../api/production.js'
import './BMROverlay.css'

const BMR_STORE = 'erp_bmr_drafts'
function bmrLoad()   { try { return JSON.parse(localStorage.getItem(BMR_STORE)) || {} } catch { return {} } }
function bmrSave(d)  { localStorage.setItem(BMR_STORE, JSON.stringify(d)) }
function lsLoad(k)   { try { return JSON.parse(localStorage.getItem(k)) || [] } catch { return [] } }
function lsSave(k,d) { localStorage.setItem(k, JSON.stringify(d)) }

const PLANT_COLOR = {
  Nano: '#1a4a6b', Botanical: '#2d5e18', Liquid: '#7c3aed', Powder: '#92400e', Granules: '#0f766e',
}

function BField({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      {children}
      {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
    </div>
  )
}
function BInp(props) {
  return <input {...props} className={`px-2.5 py-1.5 border-[1.5px] border-gray-200 rounded-lg text-[13px] font-[inherit] bg-white focus:outline-none focus:border-blue-500 transition ${props.className||''}`} />
}
function BSel(props) {
  return <select {...props} className={`px-2.5 py-1.5 border-[1.5px] border-gray-200 rounded-lg text-[13px] font-[inherit] bg-white focus:outline-none focus:border-blue-500 transition ${props.className||''}`} />
}
function BSection({ title, children }) {
  return (
    <div className="px-7 py-5 border-b border-gray-100">
      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-2 mb-3">{title}</div>
      {children}
    </div>
  )
}
function BGrid({ cols=2, children }) {
  const cls = cols===4 ? 'grid-cols-4' : cols===3 ? 'grid-cols-3' : 'grid-cols-2'
  return <div className={`grid ${cls} gap-3`}>{children}</div>
}
function TickRow({ id, label, fieldKey, checkedDefault=true }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition mb-1.5">
      <input type="checkbox" data-bmr-field={fieldKey} defaultChecked={checkedDefault} id={id} className="w-4 h-4 cursor-pointer accent-green-600" />
      <label htmlFor={id} className="text-[12.5px] font-medium cursor-pointer flex-1">{label}</label>
    </div>
  )
}

function buildProtocolRows(comps, taskId) {
  if (!comps.length) {
    return Array.from({length:20},(_,i) => (
      <tr key={i} className="border-b border-gray-100">
        <td className="px-2 py-1.5 text-center text-xs font-bold text-gray-400 w-10">{i+1}</td>
        <td className="px-2 py-1.5"><BInp type="text" data-bmr-field={`p-rm-${i}`} className="w-full"/></td>
        <td className="px-2 py-1.5"><BInp type="text" data-bmr-field={`p-qty-${i}`} className="w-24 text-center"/></td>
        <td className="px-2 py-1.5 text-center"><input type="checkbox" data-bmr-field={`p-tick-${i}`} className="w-4 h-4 accent-green-600"/></td>
        <td className="px-2 py-1.5"><BInp type="number" data-bmr-field={`p-seq-${i}`} className="w-16 text-center"/></td>
        <td className="px-2 py-1.5"><BInp type="time" data-bmr-field={`p-time-${i}`} className="w-28"/></td>
        <td className="px-2 py-1.5"><BInp type="number" data-bmr-field={`p-temp-${i}`} step="0.1" className="w-20 text-center"/></td>
        <td className="px-2 py-1.5"><BInp type="text" data-bmr-field={`p-rem-${i}`} className="w-full"/></td>
      </tr>
    ))
  }
  const rows = []; let idx = 0
  comps.forEach(c => {
    if (c.isHeader) {
      rows.push(<tr key={`h-${idx}`} className="bg-blue-50"><td colSpan={8} className="px-3 py-1.5 text-[12px] font-bold italic text-blue-700">▸ {c.component}</td></tr>)
    } else {
      const i = idx++
      rows.push(
        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
          <td className="px-2 py-1.5 text-center text-xs font-bold text-gray-400 w-10">{i+1}</td>
          <td className="px-2 py-1.5 font-medium text-[12.5px]">{c.component}</td>
          <td className="px-2 py-1.5 font-mono text-[12px] text-blue-700 text-center">{c.qty||''} {c.uom||''}</td>
          <td className="px-2 py-1.5 text-center"><input type="checkbox" data-bmr-field={`p-tick-${i}`} className="w-4 h-4 accent-green-600"/></td>
          <td className="px-2 py-1.5"><BInp type="number" data-bmr-field={`p-seq-${i}`} className="w-16 text-center"/></td>
          <td className="px-2 py-1.5"><BInp type="time" data-bmr-field={`p-time-${i}`} className="w-28"/></td>
          <td className="px-2 py-1.5"><BInp type="number" data-bmr-field={`p-temp-${i}`} step="0.1" className="w-20 text-center"/></td>
          <td className="px-2 py-1.5"><BInp type="text" data-bmr-field={`p-rem-${i}`} className="w-full"/></td>
        </tr>
      )
    }
  })
  return rows
}

function buildFormulationRows(comps) {
  if (!comps.length) {
    return Array.from({length:15},(_,i) => (
      <tr key={i} className="border-b border-gray-100">
        <td className="px-2 py-1.5 text-center text-xs font-bold text-gray-400 w-10">{i+1}</td>
        <td className="px-2 py-1.5"><BInp type="text" data-bmr-field={`f-rm-${i}`} className="w-full"/></td>
        <td className="px-2 py-1.5"><BInp type="text" data-bmr-field={`f-qty-${i}`} className="w-28"/></td>
        <td className="px-2 py-1.5 text-center"><input type="checkbox" data-bmr-field={`f-tick-${i}`} className="w-4 h-4 accent-green-600"/></td>
        <td className="px-2 py-1.5"><BInp type="number" data-bmr-field={`f-seq-${i}`} className="w-16 text-center"/></td>
        <td className="px-2 py-1.5"><BInp type="time" data-bmr-field={`f-time-${i}`} className="w-28"/></td>
        <td className="px-2 py-1.5"><BInp type="text" data-bmr-field={`f-rem-${i}`} className="w-full"/></td>
      </tr>
    ))
  }
  const rows = []; let idx = 0
  comps.forEach(c => {
    if (c.isHeader) {
      rows.push(<tr key={`h-${idx}`} className="bg-blue-50"><td colSpan={7} className="px-3 py-1.5 text-[12px] font-bold italic text-blue-700">▸ {c.component}</td></tr>)
    } else {
      const i = idx++
      rows.push(
        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
          <td className="px-2 py-1.5 text-center text-xs font-bold text-gray-400 w-10">{i+1}</td>
          <td className="px-2 py-1.5 font-medium text-[12.5px]">{c.component}</td>
          <td className="px-2 py-1.5 font-mono text-[12px] text-blue-700">{c.qty||''} {c.uom||''}</td>
          <td className="px-2 py-1.5 text-center"><input type="checkbox" data-bmr-field={`f-tick-${i}`} className="w-4 h-4 accent-green-600"/></td>
          <td className="px-2 py-1.5"><BInp type="number" data-bmr-field={`f-seq-${i}`} className="w-16 text-center"/></td>
          <td className="px-2 py-1.5"><BInp type="time" data-bmr-field={`f-time-${i}`} className="w-28"/></td>
          <td className="px-2 py-1.5"><BInp type="text" data-bmr-field={`f-rem-${i}`} className="w-full"/></td>
        </tr>
      )
    }
  })
  return rows
}

// ── Nano / Botanical BMR — 5 pages ────────────────────────────────────────────
function NanoBMR({ task, comps }) {
  const [page, setPage] = useState(0)
  const todayVal = new Date().toISOString().slice(0,10)
  const pages = ['1 · Pre-Start','2 · Reactor Cleaning','3 · Batch Process','4 · Formulation Protocol','5 · Close-Out & QC']

  return (
    <div>
      <div className="flex bg-gray-50 border-b border-gray-200 px-7 overflow-x-auto">
        {pages.map((p,i) => (
          <button key={i} onClick={() => setPage(i)}
            className={`py-2.5 px-4 text-[12px] font-semibold border-b-[3px] -mb-px whitespace-nowrap transition
              ${page===i ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-700'}`}>
            {p}
          </button>
        ))}
      </div>

      {page === 0 && (
        <>
          <BSection title="📅 Batch Identity">
            <BGrid cols={4}>
              <BField label="Date"><BInp type="date" data-bmr-field="date" defaultValue={todayVal}/></BField>
              <BField label="Order Qty"><BInp type="text" data-bmr-field="order-qty" defaultValue={`${task.qty||''} ${task.qtyUom||''}`} readOnly className="bg-gray-50"/></BField>
              <BField label="Reactor / Vessel"><BInp type="text" data-bmr-field="reactor" defaultValue={task.equipment||''} readOnly className="bg-gray-50"/></BField>
              <BField label="Shift"><BInp type="text" data-bmr-field="shift" defaultValue={task.shift||'General'} readOnly className="bg-gray-50"/></BField>
            </BGrid>
          </BSection>
          <BSection title="🏭 Plant Start-Up">
            <BGrid>
              <BField label="Plant Lights Switch ON Time"><BInp type="time" data-bmr-field="lights-on-time"/></BField>
              <BField label="Reactor Lights ON Time"><BInp type="time" data-bmr-field="reactor-lights-time"/></BField>
            </BGrid>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Discharge Tank Status</div>
                <div className="flex gap-4 items-center">
                  {['Empty','Not Empty'].map(v => (
                    <label key={v} className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                      <input type="radio" name={`tank-${task.id}`} data-bmr-field="tank-status" value={v} defaultChecked={v==='Empty'}/> {v}
                    </label>
                  ))}
                  <BInp type="time" data-bmr-field="tank-status-time" className="w-28"/>
                </div>
              </div>
              <BField label="Temperature (°C)"><BInp type="number" data-bmr-field="temperature" step="0.1" placeholder="e.g. 28.5"/></BField>
            </div>
          </BSection>
          <BSection title="🧑‍🔧 Health Check">
            <BGrid>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Plant Engineers</div>
                <div className="flex gap-4">
                  {['Good','Unwell'].map(v => (
                    <label key={v} className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                      <input type="radio" name={`eng-h-${task.id}`} data-bmr-field="eng-health" value={v} defaultChecked={v==='Good'}/> {v}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Workers / Helpers</div>
                <div className="flex gap-4">
                  {['Good','Unwell'].map(v => (
                    <label key={v} className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                      <input type="radio" name={`wrk-h-${task.id}`} data-bmr-field="wrk-health" value={v} defaultChecked={v==='Good'}/> {v}
                    </label>
                  ))}
                </div>
              </div>
            </BGrid>
          </BSection>
          <BSection title="📋 Documents & PPE Check">
            <BGrid>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase mb-2">Documents Required</div>
                {['Raw Material Sheet','Procedure Sheet'].map((d,i) => (
                  <TickRow key={d} id={`doc-${i}-${task.id}`} label={d} fieldKey={`doc-${i}`}/>
                ))}
                <div className="mt-2"><BField label="RM Remarks"><BInp type="text" data-bmr-field="rm-remarks" placeholder="Any remarks..." className="w-full"/></BField></div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase mb-2">PPE Check</div>
                {['Protective Eye Glasses','Mask','Helmet','Rubber Gloves','Hand Mitts'].map((p,i) => (
                  <TickRow key={p} id={`ppe-${i}-${task.id}`} label={p} fieldKey={`ppe-${i}`}/>
                ))}
              </div>
            </BGrid>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <TickRow id={`maint-${task.id}`} label="Reactor Checked by Maintenance" fieldKey="maint-check"/>
              <BField label="Tools Used"><BInp type="text" data-bmr-field="tools-used" className="w-full"/></BField>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <BField label="Raw Water Qty (L)"><BInp type="number" data-bmr-field="raw-water-qty" step="0.1"/></BField>
              <BField label="DM Water Qty (L)"><BInp type="number" data-bmr-field="dm-water-qty" step="0.1"/></BField>
            </div>
          </BSection>
        </>
      )}

      {page === 1 && (
        <>
          <BSection title="🧹 Reactor Cleaning">
            <BGrid>
              <BField label="Cleaning Done"><BSel data-bmr-field="reactor-cleaning"><option>YES</option><option>NO</option></BSel></BField>
              <BField label="Previous Batch Product"><BInp type="text" data-bmr-field="prev-product"/></BField>
              <BField label="Previous Batch Date"><BInp type="date" data-bmr-field="prev-date"/></BField>
              <BField label="Previous Batch Quantity"><BInp type="text" data-bmr-field="prev-qty"/></BField>
              <BField label="Reactor Check by Maintenance"><BSel data-bmr-field="reactor-maint-check"><option>YES</option><option>NO</option></BSel></BField>
              <BField label="Maintenance Incharge"><BInp type="text" data-bmr-field="maint-incharge"/></BField>
            </BGrid>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[['Raw Water Cleaning','raw-water-clean'],['DM Water Cleaning','dm-water-clean'],['Steam Cleaning','steam-clean']].map(([l,k]) => (
                <TickRow key={k} id={`${k}-${task.id}`} label={l} fieldKey={k}/>
              ))}
            </div>
          </BSection>
          <BSection title="📦 Raw Material Received">
            <BGrid>
              <BField label="RM Received Date"><BInp type="date" data-bmr-field="rm-recv-date" defaultValue={todayVal}/></BField>
              <BField label="RM Received Time"><BInp type="time" data-bmr-field="rm-recv-time"/></BField>
            </BGrid>
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-[12px] text-blue-700">📎 Attach RM Sheet to this record</div>
          </BSection>
        </>
      )}

      {page === 2 && (
        <>
          <BSection title="🚀 Batch Start">
            <BGrid>
              <BField label="Batch Start Time"><BInp type="time" data-bmr-field="batch-start-time"/></BField>
              <BField label="Start Temperature (°C)"><BInp type="number" data-bmr-field="batch-start-temp" step="0.1"/></BField>
            </BGrid>
          </BSection>
          <BSection title="💧 DM Water Discharge">
            <BGrid cols={3}>
              <BField label="Start Time"><BInp type="time" data-bmr-field="dw-start-time"/></BField>
              <BField label="Start Temp (°C)"><BInp type="number" data-bmr-field="dw-start-temp" step="0.1"/></BField>
              <BField label="Start Meter Reading"><BInp type="text" data-bmr-field="dw-start-meter"/></BField>
              <BField label="End Time"><BInp type="time" data-bmr-field="dw-end-time"/></BField>
              <BField label="End Temp (°C)"><BInp type="number" data-bmr-field="dw-end-temp" step="0.1"/></BField>
              <BField label="End Meter Reading"><BInp type="text" data-bmr-field="dw-end-meter"/></BField>
            </BGrid>
            <div className="mt-3"><TickRow id={`wcc-${task.id}`} label="Checked for Water Contamination" fieldKey="water-contamination-check" checkedDefault={false}/></div>
          </BSection>
          <BSection title="🔥 Heating & ❄️ Cold Process">
            <BGrid>
              <div>
                <div className="text-[11px] font-bold text-gray-500 mb-2">Heating Process</div>
                <div className="grid gap-2">
                  <BField label="Present Temp (°C)"><BInp type="number" data-bmr-field="heat-present-temp" step="0.1"/></BField>
                  <BField label="Steam Start Temp (°C)"><BInp type="number" data-bmr-field="heat-steam-start" step="0.1"/></BField>
                  <BField label="Max Temp Reached (°C)"><BInp type="number" data-bmr-field="heat-max-temp" step="0.1"/></BField>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-gray-500 mb-2">Cold Process</div>
                <div className="grid gap-2">
                  <BField label="Present Temp (°C)"><BInp type="number" data-bmr-field="cold-present-temp" step="0.1"/></BField>
                  <BField label="Min Temp (°C)"><BInp type="number" data-bmr-field="cold-min-temp" step="0.1"/></BField>
                </div>
              </div>
            </BGrid>
          </BSection>
        </>
      )}

      {page === 3 && (
        <BSection title={`⚗️ Formulation Protocol — ${comps.filter(c=>!c.isHeader).length} component(s)`}>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead><tr className="bg-gray-50">
                {['Step','Raw Material','Quantity','Tick ✓','Seq.','Time Added','Temp (°C)','Remarks'].map(h => (
                  <th key={h} className="px-2 py-2 text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>{buildProtocolRows(comps, task.id)}</tbody>
            </table>
          </div>
          <div className="mt-4 border-2 border-dashed border-amber-300 rounded-lg p-4 bg-amber-50">
            <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2">⚠ Deviation Record</div>
            <textarea data-bmr-field="deviation-record" rows={3} placeholder="Any deviation from standard process..."
              className="w-full px-3 py-2 border-[1.5px] border-amber-300 rounded-lg text-[13px] resize-vertical"/>
          </div>
        </BSection>
      )}

      {page === 4 && (
        <>
          <BSection title="🔒 Batch Close-Out">
            <BGrid>
              <BField label="Steam Close Time"><BInp type="time" data-bmr-field="steam-close-time"/></BField>
              <BField label="Steam Close Temp (°C)"><BInp type="number" data-bmr-field="steam-close-temp" step="0.1"/></BField>
              <BField label="Cooling Start Time"><BInp type="time" data-bmr-field="cooling-start-time"/></BField>
              <BField label="Cooling Close Temp (°C)"><BInp type="number" data-bmr-field="cooling-close-temp" step="0.1"/></BField>
              <BField label="Reactor Off Time"><BInp type="time" data-bmr-field="reactor-off-time"/></BField>
              <BField label="Switch-Off Temp (°C)"><BInp type="number" data-bmr-field="reactor-off-temp" step="0.1"/></BField>
              <BField label="No. of Samples Taken"><BInp type="number" data-bmr-field="samples-taken" min="0"/></BField>
              <BField label="Batch Comparison Notes"><BInp type="text" data-bmr-field="batch-comparison"/></BField>
            </BGrid>
          </BSection>
          <BSection title="🧪 QC Form">
            <BGrid>
              <BField label="Samples Sent to QC"><BSel data-bmr-field="qc-samples-sent"><option>YES</option><option>NO</option></BSel></BField>
              <BField label="Samples Sent Date & Time"><BInp type="datetime-local" data-bmr-field="qc-sent-datetime"/></BField>
            </BGrid>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[['Colour','qc-colour'],['Smell','qc-smell'],['Turbidity','qc-turbidity'],['pH','qc-ph'],['Specific Gravity','qc-spgr'],['Viscosity','qc-viscosity']].map(([l,k]) => (
                <BField key={k} label={l}><BInp type="text" data-bmr-field={k}/></BField>
              ))}
              <div className="col-span-3">
                <BField label="Active Ingredients">
                  <textarea data-bmr-field="qc-active-ingredients" rows={2}
                    className="w-full px-3 py-2 border-[1.5px] border-gray-200 rounded-lg text-[13px] resize-vertical focus:outline-none focus:border-blue-500"/>
                </BField>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead><tr className="bg-gray-50">
                  <th className="p-2 border border-gray-200 text-[11px] text-gray-500">Condition</th>
                  {['12 Hours','24 Hours','48 Hours','72 Hours'].map(h => (
                    <th key={h} className="p-2 border border-gray-200 text-[11px] text-gray-500">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {[['At Room Temp (RT)','stab-rt'],['At 4°C','stab-4c']].map(([l,k]) => (
                    <tr key={k}>
                      <td className="p-2 border border-gray-200 font-semibold text-[12.5px]">{l}</td>
                      {[0,1,2,3].map(i => (
                        <td key={i} className="p-1.5 border border-gray-200">
                          <BInp type="text" data-bmr-field={`${k}-${i}`} className="w-full"/>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </BSection>
          <BSection title="✍️ Sign-Offs">
            <BGrid>
              <BField label="Supervisor Name"><BInp type="text" data-bmr-field="sign-supervisor"/></BField>
              <BField label="Checked By"><BInp type="text" data-bmr-field="sign-checked-by"/></BField>
              <BField label="Incharge Name"><BInp type="text" data-bmr-field="sign-incharge" defaultValue={task.incharge||''}/></BField>
              <BField label="Manager"><BInp type="text" data-bmr-field="sign-manager"/></BField>
            </BGrid>
          </BSection>
        </>
      )}
    </div>
  )
}

// ── Powder / Granules / Liquid BMR — 5 pages ─────────────────────────────────
function PowderBMR({ task, comps }) {
  const [page, setPage] = useState(0)
  const todayVal = new Date().toISOString().slice(0,10)
  const pages = ['1 · Batch Header','2 · Formulation','3 · Process Details','4 · Packing','5 · QC Sampling']

  return (
    <div>
      <div className="flex bg-gray-50 border-b border-gray-200 px-7 overflow-x-auto">
        {pages.map((p,i) => (
          <button key={i} onClick={() => setPage(i)}
            className={`py-2.5 px-4 text-[12px] font-semibold border-b-[3px] -mb-px whitespace-nowrap transition
              ${page===i ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-700'}`}>
            {p}
          </button>
        ))}
      </div>

      {page === 0 && (
        <BSection title="📋 Batch Header">
          <BGrid cols={4}>
            <BField label="Date"><BInp type="date" data-bmr-field="date" defaultValue={todayVal}/></BField>
            <BField label="Equipment"><BInp type="text" data-bmr-field="equipment" defaultValue={task.equipment||''}/></BField>
            <BField label="Temperature (°C)"><BInp type="number" data-bmr-field="temperature" step="0.1"/></BField>
            <BField label="Humidity & Weather"><BInp type="text" data-bmr-field="humidity-weather" defaultValue="Clear"/></BField>
            <BField label="CFU Count Ordered"><BInp type="text" data-bmr-field="cfu-ordered" defaultValue={task.specs||''}/></BField>
            <BField label="Equip. Cleaning Date & Time"><BInp type="datetime-local" data-bmr-field="equip-cleaning-dt"/></BField>
            <BField label="Cleaning Status"><BSel data-bmr-field="cleaning-status"><option value="Clean">Clean</option><option value="Not Clean">Not Clean</option></BSel></BField>
            <BField label="Location"><BInp type="text" data-bmr-field="location" defaultValue={task.location||''}/></BField>
          </BGrid>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <BField label="Batch Started By"><BInp type="text" data-bmr-field="batch-started-by" defaultValue={task.incharge||''}/></BField>
            <BField label="Batch Completed By"><BInp type="text" data-bmr-field="batch-completed-by"/></BField>
          </div>
        </BSection>
      )}

      {page === 1 && (
        <BSection title="🧪 Formulation">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <BField label="SFG Used"><BSel data-bmr-field="sfg-used"><option value="NO">NO</option><option value="YES">YES</option></BSel></BField>
            <BField label="SFG Details (DI / DOF / Qty)"><BInp type="text" data-bmr-field="sfg-details"/></BField>
            <BField label="Carrier"><BInp type="text" data-bmr-field="carrier" defaultValue={task.carrier||''}/></BField>
            <BField label="No. of Workers"><BInp type="number" data-bmr-field="no-workers" min="1"/></BField>
            <BField label="M / F / M+F"><BSel data-bmr-field="worker-gender"><option>M</option><option>F</option><option>M+F</option></BSel></BField>
            <BField label="Equipment Used"><BInp type="text" data-bmr-field="equipment-used" defaultValue={task.equipment||''}/></BField>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead><tr className="bg-gray-50">
                {['S.No','Raw Material','Std Qty & UOM','Added ✓','Seq.','Time Added','Remarks'].map(h => (
                  <th key={h} className="px-2 py-2 text-[10.5px] font-bold text-gray-500 uppercase border-b-2 border-gray-200 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>{buildFormulationRows(comps)}</tbody>
            </table>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <BField label="Total Qty (kg)"><BInp type="number" data-bmr-field="total-qty" step="0.001"/></BField>
            <BField label="Sample ID"><BInp type="text" data-bmr-field="sample-id"/></BField>
          </div>
        </BSection>
      )}

      {page === 2 && (
        <BSection title="⏱ Process Details">
          <BGrid>
            <BField label="RM Charging Start"><BInp type="time" data-bmr-field="rm-charge-start"/></BField>
            <BField label="RM Charging End"><BInp type="time" data-bmr-field="rm-charge-end"/></BField>
            <BField label="Blending Start"><BInp type="time" data-bmr-field="blend-start"/></BField>
            <BField label="Blending End"><BInp type="time" data-bmr-field="blend-end"/></BField>
            <BField label="Unloading Start"><BInp type="time" data-bmr-field="unload-start"/></BField>
            <BField label="Unloading End"><BInp type="time" data-bmr-field="unload-end"/></BField>
            <BField label="Weight After Unloading (kg)"><BInp type="number" data-bmr-field="weight-after-unload" step="0.001"/></BField>
            <BField label="Weight After Sieving (kg)"><BInp type="number" data-bmr-field="weight-after-sieve" step="0.001"/></BField>
            <BField label="Sieving"><BSel data-bmr-field="sieving"><option value="NO">NO</option><option value="YES">YES</option></BSel></BField>
            <BField label="Mesh Size"><BInp type="text" data-bmr-field="mesh-size"/></BField>
            <BField label="Sieving Start"><BInp type="time" data-bmr-field="sieve-start"/></BField>
            <BField label="Sieving End"><BInp type="time" data-bmr-field="sieve-end"/></BField>
            <BField label="Incharge"><BInp type="text" data-bmr-field="process-incharge" defaultValue={task.incharge||''}/></BField>
            <BField label="No. of Workers"><BInp type="number" data-bmr-field="process-workers" min="1"/></BField>
          </BGrid>
          <div className="mt-4 border-2 border-dashed border-amber-300 rounded-lg p-4 bg-amber-50">
            <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2">⚠ Deviation Record</div>
            <textarea data-bmr-field="process-deviation" rows={3} placeholder="Any deviation from standard process..."
              className="w-full px-3 py-2 border-[1.5px] border-amber-300 rounded-lg text-[13px] resize-vertical"/>
          </div>
        </BSection>
      )}

      {page === 3 && (
        <BSection title="📦 Packing Details">
          <div className="grid grid-cols-3 gap-3">
            <BField label="Date of Packing"><BInp type="date" data-bmr-field="packing-date"/></BField>
            <BField label="Qty Received (kg)"><BInp type="number" data-bmr-field="packing-recv-qty" step="0.001"/></BField>
            <BField label="No. of Workers"><BInp type="number" data-bmr-field="packing-workers" min="1"/></BField>
            <BField label="Type of Packing"><BInp type="text" data-bmr-field="packing-type"/></BField>
            <BField label="Primary Packing"><BInp type="text" data-bmr-field="primary-packing" defaultValue={task.primaryPack||''}/></BField>
            <BField label="Secondary Packing"><BInp type="text" data-bmr-field="secondary-packing" defaultValue={task.secondaryPack||''}/></BField>
            <BField label="Unit Pack Weight"><BInp type="text" data-bmr-field="unit-pack-weight" defaultValue={task.unitPackQty||''}/></BField>
            <BField label="Total Units Packed"><BInp type="number" data-bmr-field="total-units-packed" defaultValue={task.noUnits||''}/></BField>
            <BField label="Total Qty Packed (kg)"><BInp type="number" data-bmr-field="total-qty-packed" step="0.001"/></BField>
            <BField label="Units per CBB/Bag/Drum"><BInp type="number" data-bmr-field="units-per-pack" defaultValue={task.unitsPerSecPack||''}/></BField>
            <BField label="Total Outer Packages"><BInp type="number" data-bmr-field="total-outer-packs" defaultValue={task.totalSecPacks||''}/></BField>
            <BField label="Labels"><BInp type="text" data-bmr-field="labels" defaultValue={task.labels||''}/></BField>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <BField label="Stretch Film"><BSel data-bmr-field="stretch-film"><option value="NO">NO</option><option value="YES">YES</option></BSel></BField>
            <BField label="Carry Strapping"><BSel data-bmr-field="carry-strapping"><option value="NO">NO</option><option value="YES">YES</option></BSel></BField>
            <BField label="CS Start Time"><BInp type="time" data-bmr-field="cs-start-time"/></BField>
            <BField label="CS End Time"><BInp type="time" data-bmr-field="cs-end-time"/></BField>
            <BField label="Leftover Qty (kg)"><BInp type="number" data-bmr-field="leftover-qty" step="0.001"/></BField>
            <BField label="Leftover Stored At"><BInp type="text" data-bmr-field="leftover-location"/></BField>
          </div>
        </BSection>
      )}

      {page === 4 && (
        <BSection title="🧪 QC Sampling">
          <BGrid>
            <BField label="Sample Collected"><BSel data-bmr-field="sample-collected"><option value="YES">YES</option><option value="NO">NO</option></BSel></BField>
            <BField label="Collected at Which Process"><BInp type="text" data-bmr-field="sample-at-process"/></BField>
            <BField label="Sample ID"><BInp type="text" data-bmr-field="qc-sample-id"/></BField>
            <BField label="Submitted On"><BInp type="date" data-bmr-field="sample-submitted-on"/></BField>
            <BField label="Sent to Inventory On"><BInp type="date" data-bmr-field="sent-to-inventory"/></BField>
            <BField label="Handed Over To"><BInp type="text" data-bmr-field="handed-over-to"/></BField>
            <BField label="SGF Updated"><BSel data-bmr-field="sgf-updated"><option value="NO">NO</option><option value="YES">YES</option></BSel></BField>
            <BField label="Incharge"><BInp type="text" data-bmr-field="qc-incharge" defaultValue={task.incharge||''}/></BField>
          </BGrid>
        </BSection>
      )}
    </div>
  )
}

// ── QC Handoff Modal ──────────────────────────────────────────────────────────
function QCHandoffModal({ task, bmrData, sfgCreated, onClose }) {
  const [remarks, setRemarks] = useState('')
  const finalQty = sfgCreated
    ? sfgCreated.qty
    : (parseFloat(bmrData['total-qty-packed']) || parseFloat(bmrData['total-qty']) || task.qty)
  const storedWhere = sfgCreated
    ? `SFG — ${sfgCreated.location}`
    : (task.process === 'Packing' ? 'Packed & ready for dispatch' : task.location || '—')

  async function confirmSend() {
    const qcQueue = (() => { try { return JSON.parse(localStorage.getItem('erp_qc_queue'))||[] } catch { return [] } })()
    const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2,5)
    qcQueue.push({ id: id(), taskId:task.id, productName:task.productName, batchCode:task.batchCode,
      diNo:task.diNo, plant:task.plant, qty:task.qty, qtyUom:task.qtyUom,
      remarks, sentAt:new Date().toISOString(), qcStatus:'Pending' })
    localStorage.setItem('erp_qc_queue', JSON.stringify(qcQueue))
    try {
      await planTasksApi.update(task.id, { sentToQc: true, sentToQcAt: new Date().toISOString() })
    } catch { /* best-effort */ }
    onClose('sent')
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-5 bg-black/50">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bo-qc-header">
          <div className="text-base font-bold">🧪 Send to QC</div>
          <div className="text-[12.5px] opacity-80 mt-0.5">Batch signed off — confirm before sending to QC</div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[['Product',task.productName],['Batch No',task.batchCode||'—'],['DI Number',task.diNo||'—'],['Plant',task.plant],['Qty',`${finalQty} ${task.qtyUom||'kg'}`],['Stored At',storedWhere]].map(([l,v]) => (
              <div key={l}>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{l}</div>
                <div className="font-semibold text-[13.5px]">{v}</div>
              </div>
            ))}
          </div>
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Remarks for QC (optional)</label>
            <textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] resize-vertical focus:outline-none focus:border-blue-400"/>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => onClose('skip')} className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-semibold hover:bg-gray-50">Skip for now</button>
            <button onClick={confirmSend} className="px-5 py-2 rounded-lg text-[13px] font-bold text-white bo-qc-send-btn">✓ Send to QC</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main BMR Overlay ──────────────────────────────────────────────────────────
// openTasks: array of full task objects
export default function BMROverlay({ openTasks, onClose, onTasksChange }) {
  const [activeId,    setActiveId]    = useState(openTasks[0]?.id || null)
  const [saveStatus,  setSaveStatus]  = useState('All changes auto-saved')
  const [qcHandoff,   setQcHandoff]   = useState(null)
  const panelRef  = useRef(null)
  const debTimer  = useRef(null)

  const openEntries = openTasks.map(t => ({ taskId: t.id, task: t }))

  useEffect(() => {
    if (!activeId && openEntries.length) setActiveId(openEntries[0].taskId)
  }, [openTasks])

  function saveCurrentDraft() {
    if (!activeId || !panelRef.current) return
    const data = {}
    panelRef.current.querySelectorAll('[data-bmr-field]').forEach(el => {
      data[el.dataset.bmrField] = el.type === 'checkbox' ? el.checked : el.value
    })
    const drafts = bmrLoad()
    drafts[activeId] = data
    bmrSave(drafts)
  }

  function showSaved() {
    setSaveStatus('✓ Draft saved')
    clearTimeout(debTimer.current)
    debTimer.current = setTimeout(() => setSaveStatus('All changes auto-saved'), 2000)
  }

  function handleCloseTask(id) {
    saveCurrentDraft()
    const remaining = openTasks.filter(t => t.id !== id)
    if (!remaining.length) { onClose(); return }
    onTasksChange(remaining)
    if (activeId === id) setActiveId(remaining[remaining.length - 1]?.id || null)
  }

  async function handleSubmit(taskId) {
    saveCurrentDraft()
    if (!confirm('Submit BMR? This will mark the task as Completed.')) return
    const task    = openTasks.find(t => t.id === taskId)
    if (!task) return
    const bmrData = bmrLoad()[taskId] || {}

    let sfgCreated = null
    if (task.process === 'Formulation' && task.packAfter === 'NO') {
      const qty = parseFloat(bmrData['weight-after-sieve']) || parseFloat(bmrData['weight-after-unload']) || task.qty
      const loc = prompt(
        `Formulation complete — no packing scheduled.\nEnter SFG storage location:\n(${task.productName} | ${task.batchCode} | ${qty} ${task.qtyUom||'kg'})`,
        task.location || ''
      )
      if (loc === null) { alert('SFG location required. BMR not submitted.'); return }
      sfgAddEntry({ productName:task.productName, batchCode:task.batchCode, plant:task.plant, qty, qtyUom:task.qtyUom||'kg', location:loc.trim()||'—', sourceTaskId:task.id })
      sfgCreated = { qty, location: loc.trim() || '—' }
    }

    if (task.process === 'Packing' && task.sfgSourceId) {
      const sfgList = (() => { try { return JSON.parse(localStorage.getItem('erp_sfg_stock'))||[] } catch { return [] } })()
      const si = sfgList.findIndex(s => s.id === task.sfgSourceId)
      if (si >= 0) {
        const used = parseFloat(bmrData['packing-recv-qty']) || parseFloat(task.qty) || 0
        sfgList[si].qtyRemaining = Math.max(0, sfgList[si].qtyRemaining - used)
        sfgList[si].status = sfgList[si].qtyRemaining <= 0 ? 'Consumed' : 'Partially Used'
        localStorage.setItem('erp_sfg_stock', JSON.stringify(sfgList))
      }
    }

    try {
      await planTasksApi.update(taskId, {
        bmrSubmitted:   true,
        bmrSubmittedAt: new Date().toISOString(),
        status:         'Completed',
      })
    } catch (e) {
      alert('Failed to submit BMR: ' + e.message)
      return
    }

    setQcHandoff({ task, bmrData, sfgCreated })
    const remaining = openTasks.filter(t => t.id !== taskId)
    onTasksChange(remaining)
    if (!remaining.length || activeId === taskId) setActiveId(remaining[0]?.id || null)
  }

  function handleQcClose() {
    setQcHandoff(null)
    if (!openTasks.filter(t => t.id !== qcHandoff?.task?.id).length) onClose()
  }

  const entry     = openEntries.find(e => e.taskId === activeId)
  const task      = entry?.task
  const comps     = (() => {
    try {
      const recipes = JSON.parse(localStorage.getItem('sp3_recipes')||'[]')
      const r = recipes.find(r => r.name?.toLowerCase() === task?.productName?.toLowerCase())
      return r ? (r.components||[]).filter(c => c?.component) : []
    } catch { return [] }
  })()
  const isNanoBot = task && (task.plant === 'Nano' || task.plant === 'Botanical')

  return (
    <>
      <div className="fixed inset-0 z-[300] flex flex-col justify-end bo-overlay">
        {/* Task tabs bar */}
        <div className="bg-[#1e293b] flex items-center overflow-x-auto flex-shrink-0 border-t-2 border-[#334155] bo-tabs-bar">
          <div className="text-[11px] font-bold text-[#94a3b8] px-3 whitespace-nowrap tracking-wider">📋 OPEN BMRs</div>
          <div className="flex flex-1 overflow-x-auto">
            {openEntries.map(e => {
              const isAct = e.taskId === activeId
              return (
                <div key={e.taskId}
                  className={`flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold cursor-pointer border-r border-[#334155] min-w-[160px] flex-shrink-0 transition-colors
                    ${isAct ? 'bg-blue-700 text-white' : 'text-[#94a3b8] hover:bg-[#334155] hover:text-white'}`}
                  onClick={() => { saveCurrentDraft(); setActiveId(e.taskId) }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background: PLANT_COLOR[e.task.plant]||'#64748b'}}/>
                  <span className="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">{e.task.productName}</span>
                  <span className="text-[10px] opacity-70">{e.task.taskId}</span>
                  <button className="opacity-60 hover:opacity-100 text-sm ml-1"
                    onClick={ev => { ev.stopPropagation(); handleCloseTask(e.taskId) }}>✕</button>
                </div>
              )
            })}
          </div>
          <button onClick={() => { saveCurrentDraft(); onClose() }}
            className="text-[#94a3b8] hover:text-white text-lg px-4 flex-shrink-0">✕</button>
        </div>

        {/* BMR content panel */}
        {task && (
          <div className="bg-white flex flex-col bo-content-panel" ref={panelRef}
            onChange={() => { saveCurrentDraft(); showSaved() }}>
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-7 py-4 text-white flex-shrink-0 bo-bmr-header">
              <div>
                <div className="text-[11px] opacity-70 mb-0.5">{task.taskId} — {task.plant} Plant</div>
                <div className="font-bold text-base">{task.productName}</div>
                <div className="text-[12px] opacity-80 mt-0.5">
                  DI: {task.diNo||'—'} | Batch: {task.batchCode||'—'} | Qty: {task.qty} {task.qtyUom||''} | Incharge: {task.incharge||'—'}
                  {task.carrier ? ` | Carrier: ${task.carrier}` : ''}{task.specs ? ` | Specs: ${task.specs}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-[11px] opacity-70">
                  <div>Equipment: {task.equipment||'—'}</div>
                  <div>Shift: {task.shift||'General'}</div>
                </div>
                <button onClick={() => handleSubmit(task.id)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[13px] font-bold transition">
                  ✓ Submit BMR
                </button>
              </div>
            </div>

            {isNanoBot ? <NanoBMR task={task} comps={comps}/> : <PowderBMR task={task} comps={comps}/>}

            {/* Save bar */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-7 py-3 flex items-center justify-between shadow-[0_-4px_16px_rgba(0,0,0,.06)]">
              <span className={`text-[12px] ${saveStatus.startsWith('✓') ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>{saveStatus}</span>
              <div className="flex gap-2.5">
                <button onClick={() => handleCloseTask(task.id)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-medium hover:bg-gray-50 transition">
                  Save &amp; Close
                </button>
                <button onClick={() => handleSubmit(task.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-[13px] font-bold hover:bg-green-700 transition">
                  ✓ Submit BMR
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {qcHandoff && (
        <QCHandoffModal task={qcHandoff.task} bmrData={qcHandoff.bmrData} sfgCreated={qcHandoff.sfgCreated} onClose={handleQcClose}/>
      )}
    </>
  )
}
