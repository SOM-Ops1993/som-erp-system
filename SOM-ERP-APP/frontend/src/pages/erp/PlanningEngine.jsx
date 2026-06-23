/**
 * Production Planning Engine — 8-step analysis, plan creation, submit/publish, batch job tracking
 */
import { useState, useEffect, useCallback } from 'react'
import Pagination from '../../components/erp/Pagination.jsx'
import { planningApi } from '../../api/planning.js'
import { erpReasonCodesApi } from '../../api/masters.js'
import { salesApi } from '../../api/sales.js'
import { useAuth } from '../../components/erp/AuthContext.jsx'

const inputStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }
const labelStyle = { display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }
const btnPrimary = (disabled) => ({ padding: '9px 18px', background: disabled ? '#94a3b8' : '#1e3a5f', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer' })

const statusBadge = (status) => {
  const cfg = {
    draft: { bg: '#f1f5f9', tx: '#475569' }, submitted: { bg: '#dbeafe', tx: '#1e40af' },
    published: { bg: '#dcfce7', tx: '#166534' }, cancelled: { bg: '#fee2e2', tx: '#991b1b' },
    pending: { bg: '#fef3c7', tx: '#92400e' }, in_progress: { bg: '#ede9fe', tx: '#6b21a8' },
    completed: { bg: '#dcfce7', tx: '#166534' }, qc_passed: { bg: '#dcfce7', tx: '#166534' },
    qc_failed: { bg: '#fee2e2', tx: '#991b1b' }, delayed: { bg: '#fef3c7', tx: '#92400e' },
    scrapped: { bg: '#fee2e2', tx: '#991b1b' },
  }
  const c = cfg[status] || { bg: '#f1f5f9', tx: '#475569' }
  return <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: c.bg, color: c.tx }}>{status?.replace(/_/g, ' ') || '—'}</span>
}

const rmColor = (s) => ({ green: '#16a34a', amber: '#d97706', red: '#dc2626' }[s] || '#94a3b8')

// ─── Analysis Result Panel ────────────────────────────────────────────────────
function AnalysisPanel({ result, diNumber, onPlanCreated }) {
  const [planForm, setPlanForm] = useState({ show: false, planned_start_date: '', planned_end_date: '', notes: '' })
  const [saving, setSaving] = useState(false)

  if (!result) return null

  const a = result

  const createPlan = async () => {
    if (!planForm.planned_start_date) { alert('Planned start date required'); return }
    setSaving(true)
    try {
      await planningApi.createPlan({
        di_number: diNumber,
        planned_start_date: planForm.planned_start_date,
        planned_end_date: planForm.planned_end_date,
        notes: planForm.notes,
      })
      onPlanCreated()
    } catch (e) { alert(e.response?.data?.error || e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginTop: '20px' }}>
      <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Analysis — {diNumber}</h3>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'FG Stock', val: `${a.fg_stock?.available_qty ?? 0} ${a.fg_stock?.uom ?? ''}`, sub: a.fg_stock?.stock_status === 'sufficient' ? '✓ Sufficient' : '⚠ Short', ok: a.fg_stock?.stock_status === 'sufficient' },
          { label: 'Batches Required', val: a.batch_calculation?.batches_required ?? '—', sub: `${a.batch_calculation?.batch_size_kg ?? 0} kg/batch` },
          { label: 'RM Readiness', val: `${a.rm_availability?.filter(r => r.status === 'green').length ?? 0}/${a.rm_availability?.length ?? 0} items`, sub: 'Green', ok: a.rm_availability?.every(r => r.status === 'green') },
          { label: 'Est. Duration', val: a.time_estimate?.total_days ? `${a.time_estimate.total_days}d` : '—', sub: a.time_estimate?.confidence || '' },
        ].map(c => (
          <div key={c.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>{c.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: c.ok === false ? '#dc2626' : c.ok === true ? '#16a34a' : '#1e293b' }}>{c.val}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* RM Availability Grid */}
      {a.rm_availability?.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '10px' }}>RAW MATERIAL AVAILABILITY</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
            {a.rm_availability.map((rm, i) => (
              <div key={i} style={{ background: '#f8fafc', border: `1px solid ${rmColor(rm.status)}33`, borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700 }}>{rm.item_name || rm.item_code}</div>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: rmColor(rm.status), marginTop: '3px' }} />
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Required: <strong>{rm.required_qty} {rm.uom}</strong> | Available: <strong style={{ color: rmColor(rm.status) }}>{rm.available_qty} {rm.uom}</strong>
                </div>
                {rm.status === 'red' && <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '3px' }}>⚠ Shortfall: {rm.shortfall} {rm.uom}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Equipment */}
      {a.equipment_availability?.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '10px' }}>EQUIPMENT STATUS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {a.equipment_availability.map((eq, i) => (
              <div key={i} style={{ padding: '8px 14px', background: eq.available ? '#f0fdf4' : '#fef2f2', border: `1px solid ${eq.available ? '#bbf7d0' : '#fecaca'}`, borderRadius: '8px', fontSize: '12px' }}>
                <span style={{ fontWeight: 600 }}>{eq.equipment_name}</span>
                <span style={{ color: eq.available ? '#16a34a' : '#dc2626', marginLeft: '8px' }}>{eq.available ? '✓ Available' : '✕ Busy'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Microbial CFU */}
      {a.microbial_status && (
        <div style={{ marginBottom: '20px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '14px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af', marginBottom: '6px' }}>MICROBIAL CFU STATUS</div>
          <div style={{ fontSize: '13px', color: '#1e40af' }}>
            Available: <strong>{a.microbial_status.available_cfu_total?.toExponential(2) ?? '—'} CFU/mL</strong> |
            Required: <strong>{a.microbial_status.required_cfu?.toExponential(2) ?? '—'} CFU/mL</strong> |
            Status: <strong>{a.microbial_status.status === 'ok' ? '✓ Sufficient' : '⚠ Insufficient'}</strong>
          </div>
        </div>
      )}

      {/* Create Plan Button */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
        {!planForm.show ? (
          <button onClick={() => setPlanForm(f => ({ ...f, show: true }))} style={btnPrimary(false)}>
            Create Production Plan →
          </button>
        ) : (
          <div>
            <h4 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700 }}>Create Plan for {diNumber}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div><label style={labelStyle}>PLANNED START DATE *</label><input type="date" value={planForm.planned_start_date} onChange={e => setPlanForm(f => ({ ...f, planned_start_date: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>PLANNED END DATE</label><input type="date" value={planForm.planned_end_date} onChange={e => setPlanForm(f => ({ ...f, planned_end_date: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>NOTES</label><input value={planForm.notes} onChange={e => setPlanForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" style={inputStyle} /></div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button onClick={createPlan} disabled={saving} style={btnPrimary(saving)}>{saving ? 'Creating…' : 'Create Draft Plan'}</button>
              <button onClick={() => setPlanForm(f => ({ ...f, show: false }))} style={{ padding: '9px 14px', background: '#f1f5f9', color: '#1e293b', border: 'none', borderRadius: '7px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Plan Detail ──────────────────────────────────────────────────────────────
function PlanDetail({ plan, onClose, onRefresh }) {
  const { hasRole } = useAuth()
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)
  const [qcForm, setQcForm] = useState({ show: false, jobId: null, result: 'pass', notes: '', cfu_count: '' })
  const [delayForm, setDelayForm] = useState({ show: false, jobId: null, reason: '', notes: '' })
  const [reasons, setReasons] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    planningApi.getPlan(plan.id).then(r => setDetail(r.data)).finally(() => setLoading(false))
    erpReasonCodesApi.list({ category: 'batch_delay' }).then(r => setReasons(r.data || []))
  }, [plan.id])

  const submit = async () => {
    try { await planningApi.submitPlan(plan.id); onRefresh() }
    catch (e) { alert(e.response?.data?.error || e.message) }
  }
  const publish = async () => {
    try { await planningApi.publishPlan(plan.id); onRefresh() }
    catch (e) { alert(e.response?.data?.error || e.message) }
  }
  const startJob = async (jobId) => {
    try { await planningApi.startJob(jobId); onRefresh() }
    catch (e) { alert(e.response?.data?.error || e.message) }
  }

  const submitQc = async () => {
    setSaving(true)
    try {
      await planningApi.recordQC(qcForm.jobId, { result: qcForm.result, notes: qcForm.notes, cfu_count: qcForm.cfu_count })
      setQcForm({ show: false, jobId: null, result: 'pass', notes: '', cfu_count: '' })
      const r = await planningApi.getPlan(plan.id)
      setDetail(r.data)
    } catch (e) { alert(e.response?.data?.error || e.message) }
    finally { setSaving(false) }
  }

  const submitDelay = async () => {
    setSaving(true)
    try {
      await planningApi.delayJob(delayForm.jobId, { reason_code: delayForm.reason, notes: delayForm.notes })
      setDelayForm({ show: false, jobId: null, reason: '', notes: '' })
      const r = await planningApi.getPlan(plan.id)
      setDetail(r.data)
    } catch (e) { alert(e.response?.data?.error || e.message) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: '560px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#94a3b8' }}>Loading…</div>
      </div>
    </div>
  )

  const d = detail || plan
  const canSubmit = hasRole(['planner', 'admin']) && d.status === 'draft'
  const canPublish = hasRole(['planning_manager', 'admin']) && d.status === 'submitted'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: '560px', background: '#fff', height: '100%', overflowY: 'auto', padding: '28px', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>Plan #{d.id?.slice?.(0, 8)}…</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>DI: {d.di_number}</div>
            <div style={{ marginTop: '6px' }}>{statusBadge(d.status)}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', fontSize: '13px' }}>
          <div><div style={labelStyle}>PRODUCT</div><div style={{ fontWeight: 600 }}>{d.product_name}</div></div>
          <div><div style={labelStyle}>PLANT</div><div>{d.plant_name}</div></div>
          <div><div style={labelStyle}>PLANNED START</div><div>{d.planned_start_date ? new Date(d.planned_start_date).toLocaleDateString('en-IN') : '—'}</div></div>
          <div><div style={labelStyle}>PLANNED END</div><div>{d.planned_end_date ? new Date(d.planned_end_date).toLocaleDateString('en-IN') : '—'}</div></div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {canSubmit && <button onClick={submit} style={{ padding: '9px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Submit for Review</button>}
          {canPublish && <button onClick={publish} style={{ padding: '9px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Publish Plan</button>}
        </div>

        {/* Batch Jobs */}
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>BATCH JOBS</div>
        {d.jobs?.length === 0 && <div style={{ color: '#94a3b8', fontSize: '13px' }}>No jobs yet</div>}
        {d.jobs?.map((job, i) => (
          <div key={job.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>Batch {job.batch_number} {job.lot_number && <span style={{ fontFamily: 'monospace', fontWeight: 400, fontSize: '11px', color: '#64748b' }}>({job.lot_number})</span>}</div>
              {statusBadge(job.status)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
              {job.batch_size_kg} kg | {job.planned_start ? new Date(job.planned_start).toLocaleDateString('en-IN') : '?'} → {job.planned_end ? new Date(job.planned_end).toLocaleDateString('en-IN') : '?'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {job.status === 'pending' && hasRole(['plant_supervisor', 'admin']) && (
                <button onClick={() => startJob(job.id)} style={{ padding: '6px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>▶ Start</button>
              )}
              {job.status === 'in_progress' && hasRole(['qc_person', 'admin']) && (
                <button onClick={() => setQcForm({ show: true, jobId: job.id, result: 'pass', notes: '', cfu_count: '' })} style={{ padding: '6px 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>QC Result</button>
              )}
              {['pending', 'in_progress'].includes(job.status) && hasRole(['plant_supervisor', 'admin']) && (
                <button onClick={() => setDelayForm({ show: true, jobId: job.id, reason: '', notes: '' })} style={{ padding: '6px 12px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Log Delay</button>
              )}
            </div>
          </div>
        ))}

        {/* QC Form */}
        {qcForm.show && (
          <div style={{ background: '#f3e8ff', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '16px', marginTop: '16px' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#6b21a8' }}>Record QC Result</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>RESULT</label>
                <select value={qcForm.result} onChange={e => setQcForm(f => ({ ...f, result: e.target.value }))} style={inputStyle}>
                  <option value="pass">Pass</option>
                  <option value="fail">Fail</option>
                  <option value="conditional">Conditional Pass</option>
                </select>
              </div>
              <div><label style={labelStyle}>CFU COUNT (if applicable)</label><input type="number" value={qcForm.cfu_count} onChange={e => setQcForm(f => ({ ...f, cfu_count: e.target.value }))} placeholder="e.g. 1.5e8" style={inputStyle} /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>NOTES</label><input value={qcForm.notes} onChange={e => setQcForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} /></div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button onClick={submitQc} disabled={saving} style={btnPrimary(saving)}>{saving ? 'Saving…' : 'Save QC'}</button>
              <button onClick={() => setQcForm({ show: false, jobId: null, result: 'pass', notes: '', cfu_count: '' })} style={{ padding: '9px 14px', background: '#f1f5f9', color: '#1e293b', border: 'none', borderRadius: '7px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Delay Form */}
        {delayForm.show && (
          <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '10px', padding: '16px', marginTop: '16px' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#92400e' }}>Log Batch Delay</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>REASON CODE *</label>
                <select value={delayForm.reason} onChange={e => setDelayForm(f => ({ ...f, reason: e.target.value }))} style={inputStyle}>
                  <option value="">Select reason…</option>
                  {reasons.map(r => <option key={r.code} value={r.code}>{r.code} — {r.label}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>NOTES</label><input value={delayForm.notes} onChange={e => setDelayForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} /></div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button onClick={submitDelay} disabled={saving} style={btnPrimary(saving)}>{saving ? 'Saving…' : 'Log Delay'}</button>
              <button onClick={() => setDelayForm({ show: false, jobId: null, reason: '', notes: '' })} style={{ padding: '9px 14px', background: '#f1f5f9', color: '#1e293b', border: 'none', borderRadius: '7px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PlanningEngine() {
  const { hasRole } = useAuth()
  const [tab, setTab] = useState(0) // 0=Plans, 1=Analyse, 2=Time-Motion
  const [plans, setPlans] = useState([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(15)
  const paginatedPlans = plans.slice((page - 1) * limit, page * limit)
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [plannerQueue, setPlannerQueue] = useState([])

  // Analysis state
  const [diInput, setDiInput] = useState('')
  const [analysing, setAnalysing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [analysisError, setAnalysisError] = useState('')

  // Time-Motion
  const [tmData, setTmData] = useState([])
  const [tmForm, setTmForm] = useState({ show: false, job_id: '', step_name: '', planned_min: '', actual_min: '', operator_count: '', notes: '' })
  const [tmSaving, setTmSaving] = useState(false)

  const loadPlans = useCallback(() => {
    setLoading(true)
    planningApi.listPlans().then(r => setPlans(r.data || [])).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadPlans()
    salesApi.plannerQueue().then(r => setPlannerQueue(r.data || []))
  }, [loadPlans])

  useEffect(() => {
    if (tab === 2) {
      planningApi.timeMotion().then(r => setTmData(r.data || []))
    }
  }, [tab])

  const runAnalysis = async () => {
    if (!diInput) { setAnalysisError('Enter a DI number'); return }
    setAnalysing(true); setAnalysisError(''); setAnalysisResult(null)
    try {
      const r = await planningApi.analyse({ di_number: diInput })
      setAnalysisResult(r.data)
    } catch (e) { setAnalysisError(e.response?.data?.error || e.message) }
    finally { setAnalysing(false) }
  }

  const submitTm = async () => {
    if (!tmForm.job_id || !tmForm.step_name) { alert('Job ID and step name required'); return }
    setTmSaving(true)
    try {
      await planningApi.logTimeMotion(tmForm)
      setTmForm({ show: false, job_id: '', step_name: '', planned_min: '', actual_min: '', operator_count: '', notes: '' })
      const r = await planningApi.timeMotion()
      setTmData(r.data || [])
    } catch (e) { alert(e.response?.data?.error || e.message) }
    finally { setTmSaving(false) }
  }

  return (
    <div style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>Production Planning</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>8-step analysis, plan creation, batch jobs and time-motion data</p>
      </div>

      {/* Planner Queue Banner */}
      {plannerQueue.length > 0 && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '20px' }}>📋</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e40af' }}>Planner Queue — {plannerQueue.length} confirmed order{plannerQueue.length > 1 ? 's' : ''} awaiting planning</div>
            <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '2px' }}>
              {plannerQueue.slice(0, 3).map(o => o.di_number).join(', ')}{plannerQueue.length > 3 ? ` +${plannerQueue.length - 3} more` : ''}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '10px', padding: '4px', marginBottom: '24px', width: 'fit-content' }}>
        {['Production Plans', 'Run Analysis', 'Time-Motion'].map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            padding: '8px 18px', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            background: tab === i ? '#fff' : 'transparent', color: tab === i ? '#1e293b' : '#64748b',
            boxShadow: tab === i ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>{t}</button>
        ))}
      </div>

      {/* Plans Tab */}
      {tab === 0 && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {loading ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: '60px' }}>Loading…</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['DI Number', 'Product', 'Plant', 'Batches', 'Planned Start', 'Status', 'Created By', ''].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plans.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '60px' }}>No plans yet. Use Run Analysis to create one.</td></tr>
                ) : paginatedPlans.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    onClick={() => setSelectedPlan(p)}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', fontWeight: 700 }}>{p.di_number}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{p.product_name}</td>
                    <td style={{ padding: '12px 16px' }}>{p.plant_name || '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>{p.total_batches}</td>
                    <td style={{ padding: '12px 16px' }}>{p.planned_start_date ? new Date(p.planned_start_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td style={{ padding: '12px 16px' }}>{statusBadge(p.status)}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{p.created_by_name}</td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>›</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && (
            <div style={{ padding: '8px 16px' }}>
              <Pagination page={page} total={plans.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
            </div>
          )}
        </div>
      )}

      {/* Analysis Tab */}
      {tab === 1 && (
        <div>
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>8-Step Production Analysis</h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
              Runs full analysis: FG stock check → RM consolidation → RM availability (green/amber/red) → Microbial CFU check → Equipment availability → Batch calculation → Time-motion estimate → Results.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input value={diInput} onChange={e => setDiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && runAnalysis()} placeholder="Enter DI / Order Number to analyse…" style={{ ...inputStyle, flex: 1 }} />
              <button onClick={runAnalysis} disabled={analysing || !diInput} style={btnPrimary(analysing || !diInput)}>
                {analysing ? '⟳ Analysing…' : 'Run Analysis'}
              </button>
            </div>
            {analysisError && <div style={{ marginTop: '12px', padding: '8px 12px', background: '#fef2f2', borderRadius: '6px', color: '#dc2626', fontSize: '12px' }}>{analysisError}</div>}
          </div>

          {analysisResult && (
            <AnalysisPanel
              result={analysisResult}
              diNumber={diInput}
              onPlanCreated={() => { loadPlans(); setTab(0) }}
            />
          )}
        </div>
      )}

      {/* Time-Motion Tab */}
      {tab === 2 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Time-Motion Data</h3>
            {hasRole(['plant_supervisor', 'admin']) && (
              <button onClick={() => setTmForm(f => ({ ...f, show: !f.show }))} style={btnPrimary(false)}>
                {tmForm.show ? 'Cancel' : '+ Log Time-Motion'}
              </button>
            )}
          </div>

          {tmForm.show && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div><label style={labelStyle}>JOB ID *</label><input value={tmForm.job_id} onChange={e => setTmForm(f => ({ ...f, job_id: e.target.value }))} placeholder="Batch job ID" style={inputStyle} /></div>
                <div><label style={labelStyle}>STEP NAME *</label><input value={tmForm.step_name} onChange={e => setTmForm(f => ({ ...f, step_name: e.target.value }))} placeholder="e.g. Fermentation, Filling" style={inputStyle} /></div>
                <div><label style={labelStyle}>PLANNED MIN</label><input type="number" value={tmForm.planned_min} onChange={e => setTmForm(f => ({ ...f, planned_min: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>ACTUAL MIN</label><input type="number" value={tmForm.actual_min} onChange={e => setTmForm(f => ({ ...f, actual_min: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>OPERATOR COUNT</label><input type="number" value={tmForm.operator_count} onChange={e => setTmForm(f => ({ ...f, operator_count: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>NOTES</label><input value={tmForm.notes} onChange={e => setTmForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} /></div>
              </div>
              <div style={{ marginTop: '14px' }}>
                <button onClick={submitTm} disabled={tmSaving} style={btnPrimary(tmSaving)}>{tmSaving ? 'Saving…' : 'Log Entry'}</button>
              </div>
            </div>
          )}

          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Step', 'Product', 'Planned (min)', 'Actual (min)', 'Efficiency', 'Operators', 'Confidence', 'Date'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tmData.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>No time-motion data yet</td></tr>
                ) : tmData.map((r, i) => {
                  const eff = r.planned_min && r.actual_min ? ((r.planned_min / r.actual_min) * 100).toFixed(0) : null
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 500 }}>{r.step_name}</td>
                      <td style={{ padding: '10px 14px' }}>{r.product_name || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>{r.planned_min ?? '—'}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{r.actual_min ?? '—'}</td>
                      <td style={{ padding: '10px 14px', color: eff ? (eff >= 90 ? '#16a34a' : eff >= 70 ? '#d97706' : '#dc2626') : '#94a3b8', fontWeight: 600 }}>
                        {eff ? `${eff}%` : '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>{r.operator_count ?? '—'}</td>
                      <td style={{ padding: '10px 14px' }}>{r.confidence_level || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>{r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedPlan && (
        <PlanDetail
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onRefresh={() => { loadPlans(); setSelectedPlan(null) }}
        />
      )}
    </div>
  )
}
