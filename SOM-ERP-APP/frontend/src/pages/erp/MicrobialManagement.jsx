/**
 * MicrobialManagement — Cold Room IMS
 * 4 tabs: Dashboard | Cold Room Stock | Inward | Issue Calculator
 *
 * Unit mapping (backend → UI):
 *   volume_litres    → Qty (kg)
 *   mfg_cfu_per_ml   → CFU/g
 *   volume_dispatched_l → Qty Issued (kg)
 *   mfg_date         → Date of Harvest
 *   location_position → Batch / Container Code
 */
import { useState, useEffect, useCallback } from 'react'
import Pagination from '../../components/pagination/Pagination.jsx'
import { microbialApi } from '../../api/microbial.js'
import { erpStrainsApi } from '../../api/masters.js'
import { useAuth } from '../../components/auth/AuthContext.jsx'
import { Button } from '../../components/ui'
import { RefreshCw } from 'lucide-react'

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtCfu(val) {
  if (val == null) return '—'
  if (val >= 1e11) return `${(val / 1e11).toFixed(2)}×10¹¹`
  if (val >= 1e10) return `${(val / 1e10).toFixed(2)}×10¹⁰`
  if (val >= 1e9)  return `${(val / 1e9).toFixed(2)}×10⁹`
  if (val >= 1e8)  return `${(val / 1e8).toFixed(2)}×10⁸`
  return Number(val).toExponential(2)
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

function fmtQty(v) {
  if (v == null) return '—'
  return Number(v).toFixed(3) + ' kg'
}

const STATUS = {
  healthy:   { bg: '#dcfce7', color: '#166534', dot: '#16a34a', label: 'Healthy' },
  watch:     { bg: '#fef9c3', color: '#854d0e', dot: '#ca8a04', label: 'Watch' },
  at_risk:   { bg: '#fee2e2', color: '#991b1b', dot: '#dc2626', label: 'At Risk' },
  exhausted: { bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8', label: 'Exhausted' },
}

function StatusBadge({ s }) {
  const st = STATUS[s] || STATUS.watch
  return (
    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: st.bg, color: st.color }}>
      {st.label}
    </span>
  )
}

function Card({ label, value, sub, accent }) {
  return (
    <div style={{ background: '#fff', borderRadius: '10px', padding: '16px 20px', borderLeft: `4px solid ${accent || '#3b82f6'}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

const INPUT = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }
const LABEL = { display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 700, marginBottom: '4px', letterSpacing: '0.06em' }
// ── Tab 1: Dashboard ──────────────────────────────────────────────────────────
function DashboardTab({ containers, transactions, loading }) {
  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading dashboard…</div>

  const active = containers.filter(c => c.status !== 'exhausted')
  const totalQty = active.reduce((s, c) => s + Number(c.volume_litres || 0), 0)
  const expiring30 = active.filter(c => c.days_to_expiry != null && c.days_to_expiry <= 30 && c.days_to_expiry >= 0)
  const atRisk = active.filter(c => c.computed_status === 'at_risk' || c.status === 'at_risk')
  const healthy = active.filter(c => (c.computed_status || c.status) === 'healthy')

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
        <Card label="TOTAL STOCK" value={`${totalQty.toFixed(1)} kg`} sub={`${active.length} active batches`} accent="#3b82f6" />
        <Card label="HEALTHY BATCHES" value={healthy.length} sub="CFU ratio ≥ 50%" accent="#16a34a" />
        <Card label="EXPIRING ≤ 30 DAYS" value={expiring30.length} sub={`${expiring30.reduce((s,c)=>s+Number(c.volume_litres||0),0).toFixed(1)} kg at risk`} accent="#f59e0b" />
        <Card label="AT RISK / CRITICAL" value={atRisk.length} sub="CFU < 30% or exp < 10d" accent="#dc2626" />
      </div>

      {/* Expiry Alerts */}
      {expiring30.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#92400e' }}>Batches Expiring in Next 30 Days</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Microbe', 'Batch / Position', 'Location', 'Qty (kg)', 'CFU/g (current)', 'Expiry', 'Days Left', 'Status'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', fontSize: '11px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expiring30.sort((a, b) => a.days_to_expiry - b.days_to_expiry).map(c => (
                <tr key={c.container_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>{c.strain_name}</td>
                  <td style={{ padding: '8px 12px', color: '#475569', fontFamily: 'monospace', fontSize: '11px' }}>{c.location_position || '—'}</td>
                  <td style={{ padding: '8px 12px', color: '#475569' }}>{c.location_room || '—'}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>{Number(c.volume_litres).toFixed(3)}</td>
                  <td style={{ padding: '8px 12px', color: '#475569' }}>{fmtCfu(c.current_cfu_per_ml)}</td>
                  <td style={{ padding: '8px 12px', color: '#475569' }}>{fmtDate(c.expiry_date)}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 700, color: c.days_to_expiry <= 10 ? '#dc2626' : '#d97706' }}>{c.days_to_expiry}d</td>
                  <td style={{ padding: '8px 12px' }}><StatusBadge s={c.computed_status || c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Transactions */}
      <div style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>Recent Issuances</span>
        </div>
        {!transactions.length ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No transactions yet</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Date', 'Microbe', 'Container / Batch', 'Qty Issued (kg)', 'CFU/g at Dispatch', 'Issued To', 'Receipt'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', fontSize: '11px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 15).map(t => (
                <tr key={t.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px', color: '#475569' }}>{fmtDate(t.dispatch_date)}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>{t.strain_name || '—'}</td>
                  <td style={{ padding: '8px 12px', color: '#475569', fontFamily: 'monospace', fontSize: '11px' }}>{t.container_id?.slice(0, 8)}…</td>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{Number(t.volume_dispatched_l || 0).toFixed(3)}</td>
                  <td style={{ padding: '8px 12px', color: '#475569' }}>{fmtCfu(t.cfu_per_ml_at_dispatch)}</td>
                  <td style={{ padding: '8px 12px', color: '#475569' }}>{t.receiver_name || '—'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    {t.receipt_confirmed
                      ? <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '11px' }}>✓ Confirmed</span>
                      : <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '11px' }}>Pending</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Tab 2: Cold Room Stock ────────────────────────────────────────────────────
function StockTab({ containers, strains, loading, onRefresh }) {
  const [filterStrain, setFilterStrain] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(15)
  const { hasRole } = useAuth()

  const filtered = containers.filter(c =>
    (!filterStrain || c.strain_id === filterStrain) &&
    (!filterStatus || (c.computed_status || c.status) === filterStatus)
  )
  const paginatedFiltered = filtered.slice((page - 1) * limit, page * limit)
  useEffect(() => { setPage(1) }, [filterStrain, filterStatus])

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading stock…</div>

  return (
    <div style={{ padding: '20px' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <select value={filterStrain} onChange={e => setFilterStrain(e.target.value)}
          style={{ ...INPUT, width: '200px' }}>
          <option value="">All Microbes</option>
          {strains.map(s => <option key={s.strain_id} value={s.strain_id}>{s.strain_name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ ...INPUT, width: '160px' }}>
          <option value="">All Statuses</option>
          <option value="healthy">Healthy</option>
          <option value="watch">Watch</option>
          <option value="at_risk">At Risk</option>
          <option value="exhausted">Exhausted</option>
        </select>
        <Button variant="outline-gray" icon={RefreshCw} onClick={onRefresh} className="ml-auto">Refresh</Button>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{filtered.length} batches</span>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              {['Microbe Name', 'Container / Batch Code', 'Location', 'Date of Harvest', 'Expiry Date', 'Days Left', 'Qty (kg)', 'CFU/g (harvest)', 'CFU/g (current)', 'CFU %', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '11px', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={11} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>No batches found</td></tr>
            )}
            {paginatedFiltered.map(c => {
              const st = STATUS[c.computed_status || c.status] || STATUS.watch
              const cfuRatio = c.cfu_ratio_pct ?? 0
              const isExp = expanded === c.container_id
              return (
                <>
                  <tr
                    key={c.container_id}
                    onClick={() => setExpanded(isExp ? null : c.container_id)}
                    style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer', background: isExp ? '#f0f9ff' : 'transparent', transition: 'background 0.1s' }}
                  >
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: '#1e293b' }}>{c.strain_name}</td>
                    <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: '11px', color: '#475569' }}>{c.location_position || '—'}</td>
                    <td style={{ padding: '9px 12px', color: '#475569' }}>{[c.location_room, c.location_position].filter(Boolean).join(' / ') || '—'}</td>
                    <td style={{ padding: '9px 12px', color: '#475569' }}>{fmtDate(c.mfg_date)}</td>
                    <td style={{ padding: '9px 12px', color: '#475569' }}>{fmtDate(c.expiry_date)}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: c.days_to_expiry <= 10 ? '#dc2626' : c.days_to_expiry <= 30 ? '#d97706' : '#475569' }}>
                      {c.days_to_expiry != null ? `${c.days_to_expiry}d` : '—'}
                    </td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#1e293b' }}>{Number(c.volume_litres).toFixed(3)}</td>
                    <td style={{ padding: '9px 12px', color: '#475569' }}>{fmtCfu(c.mfg_cfu_per_ml)}</td>
                    <td style={{ padding: '9px 12px', color: '#1e293b', fontWeight: 600 }}>{fmtCfu(c.current_cfu_per_ml)}</td>
                    <td style={{ padding: '9px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '48px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(cfuRatio, 100)}%`, background: cfuRatio >= 50 ? '#16a34a' : cfuRatio >= 30 ? '#f59e0b' : '#dc2626', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{cfuRatio.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '9px 12px' }}><StatusBadge s={c.computed_status || c.status} /></td>
                  </tr>
                  {isExp && (
                    <tr key={`${c.container_id}-detail`} style={{ background: '#f8fafc' }}>
                      <td colSpan={11} style={{ padding: '12px 20px', borderTop: '1px dashed #e2e8f0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', fontSize: '12px' }}>
                          <div><span style={{ color: '#94a3b8', fontWeight: 600 }}>Container ID:</span><br /><span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{c.container_id}</span></div>
                          <div><span style={{ color: '#94a3b8', fontWeight: 600 }}>Storage Temp:</span><br />{c.storage_temp_c != null ? `${c.storage_temp_c}°C` : '—'}</div>
                          <div><span style={{ color: '#94a3b8', fontWeight: 600 }}>Optimal Temp:</span><br />{c.optimal_temp_c != null ? `${c.optimal_temp_c}°C` : '—'}</div>
                          <div><span style={{ color: '#94a3b8', fontWeight: 600 }}>Notes / Batch:</span><br />{c.notes || '—'}</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '8px 4px' }}>
        <Pagination page={page} total={filtered.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
      </div>
    </div>
  )
}

// ── Tab 3: Inward ─────────────────────────────────────────────────────────────
function InwardTab({ strains, onRefresh }) {
  const { hasRole } = useAuth()
  const [form, setForm] = useState({
    strain_id: '', volume_litres: '', mfg_cfu_per_ml: '',
    mfg_date: '', expiry_date: '', location_room: '',
    location_position: '', storage_temp_c: '-4', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [recent, setRecent] = useState([])

  const loadRecent = useCallback(() => {
    microbialApi.containers({}).then(r => {
      const sorted = (r.data || []).sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
      setRecent(sorted.slice(0, 15))
    }).catch(() => {})
  }, [])

  useEffect(() => { loadRecent() }, [loadRecent])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.strain_id || !form.volume_litres || !form.mfg_cfu_per_ml || !form.mfg_date || !form.expiry_date) {
      setError('Microbe, Qty, CFU/g, Harvest Date and Expiry Date are required.'); return
    }
    setSaving(true); setError(''); setSuccess('')
    try {
      await microbialApi.createContainer({
        strain_id: form.strain_id,
        volume_litres: Number(form.volume_litres),
        mfg_cfu_per_ml: Number(form.mfg_cfu_per_ml),
        mfg_date: form.mfg_date,
        expiry_date: form.expiry_date,
        location_room: form.location_room || null,
        location_position: form.location_position || null,
        storage_temp_c: form.storage_temp_c ? Number(form.storage_temp_c) : null,
        notes: form.notes || null,
      })
      setSuccess('Batch recorded successfully.')
      setForm({ strain_id: '', volume_litres: '', mfg_cfu_per_ml: '', mfg_date: '', expiry_date: '', location_room: '', location_position: '', storage_temp_c: '-4', notes: '' })
      loadRecent()
      onRefresh()
    } catch (e) {
      setError(e.message || 'Failed to save batch.')
    } finally {
      setSaving(false)
    }
  }

  const canInward = hasRole('store_person', 'store_manager', 'admin')

  return (
    <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '420px 1fr', gap: '20px', alignItems: 'start' }}>
      {/* Form */}
      <div style={{ background: '#fff', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
          📥 Record New Inward Batch
        </div>

        {!canInward && (
          <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '7px', color: '#dc2626', fontSize: '12px', marginBottom: '12px' }}>
            ⛔ Store person / manager access required to record inward.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={LABEL}>MICROBE NAME *</label>
              <select value={form.strain_id} onChange={e => set('strain_id', e.target.value)} style={INPUT} disabled={!canInward}>
                <option value="">Select microbe…</option>
                {strains.map(s => <option key={s.strain_id} value={s.strain_id}>{s.strain_name}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={LABEL}>TOTAL QTY (kg) *</label>
                <input type="number" step="0.001" min="0" value={form.volume_litres} onChange={e => set('volume_litres', e.target.value)} placeholder="e.g. 5.000" style={INPUT} disabled={!canInward} />
              </div>
              <div>
                <label style={LABEL}>INHOUSE CFU/g *</label>
                <input type="number" step="any" min="0" value={form.mfg_cfu_per_ml} onChange={e => set('mfg_cfu_per_ml', e.target.value)} placeholder="e.g. 6e10" style={INPUT} disabled={!canInward} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={LABEL}>DATE OF HARVEST *</label>
                <input type="date" value={form.mfg_date} onChange={e => set('mfg_date', e.target.value)} style={INPUT} disabled={!canInward} />
              </div>
              <div>
                <label style={LABEL}>EXPIRY DATE *</label>
                <input type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} style={INPUT} disabled={!canInward} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={LABEL}>COLD ROOM / LOCATION</label>
                <input value={form.location_room} onChange={e => set('location_room', e.target.value)} placeholder="e.g. Cold Room A" style={INPUT} disabled={!canInward} />
              </div>
              <div>
                <label style={LABEL}>CONTAINER CODE / BATCH</label>
                <input value={form.location_position} onChange={e => set('location_position', e.target.value)} placeholder="e.g. LBP-FSP-01" style={INPUT} disabled={!canInward} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={LABEL}>STORAGE TEMP (°C)</label>
                <input type="number" step="0.1" value={form.storage_temp_c} onChange={e => set('storage_temp_c', e.target.value)} style={INPUT} disabled={!canInward} />
              </div>
              <div>
                <label style={LABEL}>NOTES / RECEIVED FROM</label>
                <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Batch code, source…" style={INPUT} disabled={!canInward} />
              </div>
            </div>

            {error && <div style={{ padding: '10px 12px', background: '#fef2f2', borderRadius: '7px', fontSize: '12px', color: '#dc2626' }}>{error}</div>}
            {success && <div style={{ padding: '10px 12px', background: '#dcfce7', borderRadius: '7px', fontSize: '12px', color: '#166534' }}>{success}</div>}

            <Button type="submit" variant="primary" loading={saving} disabled={!canInward} fullWidth>
              {saving ? 'Saving…' : '+ Add to Cold Room'}
            </Button>
          </div>
        </form>
      </div>

      {/* Recent Inward */}
      <div style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
          Recent Batches
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Microbe', 'Container Code', 'Harvest Date', 'Qty (kg)', 'CFU/g', 'Expiry', 'Status'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '11px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No batches yet</td></tr>
            )}
            {recent.map(c => (
              <tr key={c.container_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>{c.strain_name}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px', color: '#475569' }}>{c.location_position || '—'}</td>
                <td style={{ padding: '8px 12px', color: '#475569' }}>{fmtDate(c.mfg_date)}</td>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{Number(c.volume_litres).toFixed(3)}</td>
                <td style={{ padding: '8px 12px', color: '#475569' }}>{fmtCfu(c.mfg_cfu_per_ml)}</td>
                <td style={{ padding: '8px 12px', color: '#475569' }}>{fmtDate(c.expiry_date)}</td>
                <td style={{ padding: '8px 12px' }}><StatusBadge s={c.computed_status || c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Tab 4: Issue Calculator ───────────────────────────────────────────────────
function IssueCalculatorTab({ strains, onRefresh }) {
  const { hasRole } = useAuth()

  // Step 1 inputs
  const [inputs, setInputs] = useState({ strain_id: '', order_qty: '', ordered_cfu: '', mf: '1.1', di_no: '', customer: '', issued_to: '', section: '' })
  const set = (k, v) => setInputs(f => ({ ...f, [k]: v }))

  // Step 2 results
  const [allocation, setAllocation] = useState(null)
  const [containers, setContainers] = useState([])
  const [calcError, setCalcError] = useState('')

  // Step 3 issue state
  const [issuing, setIssuing] = useState(false)
  const [issueResult, setIssueResult] = useState(null)
  const [issueError, setIssueError] = useState('')

  const calculate = async () => {
    setCalcError(''); setAllocation(null); setIssueResult(null)
    const { strain_id, order_qty, ordered_cfu, mf } = inputs
    if (!strain_id || !order_qty || !ordered_cfu) {
      setCalcError('Please fill Microbe, Order Qty and Ordered CFU/g.'); return
    }

    // Load FIFO containers for this strain (sorted by mfg_date ASC = oldest first)
    let ctrs = []
    try {
      const res = await microbialApi.containers({ strain_id })
      ctrs = (res.data || [])
        .filter(c => c.status !== 'exhausted' && c.volume_litres > 0)
        .sort((a, b) => new Date(a.mfg_date) - new Date(b.mfg_date)) // FIFO: oldest harvest first
    } catch (e) {
      setCalcError('Could not load containers: ' + e.message); return
    }
    setContainers(ctrs)

    if (!ctrs.length) { setCalcError('No active containers found for this microbe.'); return }

    // Allocate FIFO
    const orderQtyNum = Number(order_qty)
    const orderedCfuNum = Number(ordered_cfu)
    const mfNum = Number(mf) || 1.0

    let remaining = orderQtyNum  // total biomass qty to fill
    const plan = []

    for (const c of ctrs) {
      if (remaining <= 0) break
      const inhouseCfu = c.current_cfu_per_ml || c.mfg_cfu_per_ml
      if (!inhouseCfu) continue
      // How much biomass (kg) from this container can fulfil remaining demand?
      // Biomass Qty = Order Qty × Ordered CFU/g ÷ Inhouse CFU/g × MF
      // For this allocation step: qty_needed_from_this = remaining × orderedCfuNum / inhouseCfu × mfNum
      const totalBiomassNeeded = orderQtyNum * orderedCfuNum / inhouseCfu * mfNum
      // Fraction of this container needed
      const available = Number(c.volume_litres)
      // Simpler: allocate pro-rata of total biomass needed
      if (plan.length === 0) {
        // recalculate total biomass based on first container's CFU
        remaining = totalBiomassNeeded
      }
      const take = Math.min(available, remaining)
      plan.push({
        container_id: c.container_id,
        strain_name: c.strain_name,
        batch_code: c.location_position || c.container_id.slice(0, 8),
        location: [c.location_room, c.location_position].filter(Boolean).join(' / '),
        harvest_date: c.mfg_date,
        expiry_date: c.expiry_date,
        days_to_expiry: c.days_to_expiry,
        inhouse_cfu: inhouseCfu,
        available_qty: available,
        qty_to_issue: take,
        status: c.computed_status || c.status,
      })
      remaining -= take
    }

    const totalBiomass = plan.reduce((s, p) => s + p.qty_to_issue, 0)
    const sufficient = remaining <= 0.0001

    setAllocation({
      order_qty: orderQtyNum,
      ordered_cfu: orderedCfuNum,
      mf: mfNum,
      total_biomass_needed: plan[0] ? orderQtyNum * orderedCfuNum / plan[0].inhouse_cfu * mfNum : 0,
      total_biomass_available: totalBiomass,
      sufficient,
      shortfall: Math.max(0, remaining),
      plan,
    })
  }

  const handleIssue = async () => {
    if (!allocation?.plan?.length) return
    const { di_no, customer, issued_to, section } = inputs
    if (!issued_to) { setIssueError('Please enter "Issued To" name.'); return }

    setIssuing(true); setIssueError(''); setIssueResult(null)
    try {
      const results = []
      for (const p of allocation.plan) {
        if (p.qty_to_issue <= 0) continue
        const tx = await microbialApi.createTx({
          container_id: p.container_id,
          volume_dispatched_l: p.qty_to_issue,
          cfu_per_ml_at_dispatch: p.inhouse_cfu,
          receiver_name: [issued_to, section].filter(Boolean).join(' — '),
          dispatch_notes: [di_no && `DI: ${di_no}`, customer && `Customer: ${customer}`, section && `Section: ${section}`].filter(Boolean).join(' | '),
        })
        results.push(tx)
      }
      setIssueResult({ count: results.length, plan: allocation.plan })
      setAllocation(null)
      setInputs(f => ({ ...f, di_no: '', customer: '', issued_to: '', section: '' }))
      onRefresh()
    } catch (e) {
      setIssueError(e.message || 'Issue failed.')
    } finally {
      setIssuing(false)
    }
  }

  const canIssue = hasRole('store_person', 'store_manager', 'admin')

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Step 1 */}
      <div style={{ background: '#fff', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '16px' }}>
          🧮 Step 1 — Enter Order Requirements
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={LABEL}>MICROBE NAME *</label>
            <select value={inputs.strain_id} onChange={e => set('strain_id', e.target.value)} style={INPUT}>
              <option value="">Select…</option>
              {strains.map(s => <option key={s.strain_id} value={s.strain_id}>{s.strain_name}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL}>ORDER QTY (kg) *</label>
            <input type="number" step="0.001" min="0" value={inputs.order_qty} onChange={e => set('order_qty', e.target.value)} placeholder="e.g. 1000" style={INPUT} />
          </div>
          <div>
            <label style={LABEL}>ORDERED CFU/g *</label>
            <input type="number" step="any" value={inputs.ordered_cfu} onChange={e => set('ordered_cfu', e.target.value)} placeholder="e.g. 2e8" style={INPUT} />
          </div>
          <div>
            <label style={LABEL}>MF (MULTIPLIER)</label>
            <input type="number" step="0.01" min="1" max="2" value={inputs.mf} onChange={e => set('mf', e.target.value)} style={INPUT} />
          </div>
          <div>
            <Button variant="primary" onClick={calculate} fullWidth>
              Calculate FIFO →
            </Button>
          </div>
        </div>
        {calcError && <div style={{ marginTop: '12px', padding: '10px 12px', background: '#fef2f2', borderRadius: '7px', fontSize: '12px', color: '#dc2626' }}>{calcError}</div>}
      </div>

      {/* Formula reference */}
      <div style={{ background: '#f0f9ff', borderRadius: '8px', padding: '12px 16px', border: '1px solid #bae6fd', fontSize: '12px', color: '#0369a1' }}>
        <strong>Formula:</strong> Biomass Qty (kg) = Order Qty × Ordered CFU/g ÷ Inhouse CFU/g × MF &nbsp;|&nbsp; <strong>FIFO:</strong> Oldest harvest date issued first
      </div>

      {/* Step 2: Allocation Plan */}
      {allocation && (
        <div style={{ background: '#fff', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '16px' }}>
            📋 Step 2 — FIFO Allocation Plan
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '16px' }}>
            <Card label="ORDER QTY" value={`${allocation.order_qty.toFixed(1)} kg`} sub={`@ ${fmtCfu(allocation.ordered_cfu)} CFU/g`} accent="#3b82f6" />
            <Card label="BIOMASS NEEDED" value={`${allocation.total_biomass_needed.toFixed(3)} kg`} sub={`MF = ${allocation.mf}`} accent="#7c3aed" />
            <Card label="BIOMASS AVAILABLE" value={`${allocation.total_biomass_available.toFixed(3)} kg`} sub={allocation.sufficient ? '✓ Sufficient' : '⚠ Shortfall'} accent={allocation.sufficient ? '#16a34a' : '#dc2626'} />
            <Card label="STATUS" value={allocation.sufficient ? 'OK ✓' : 'SHORT ⚠'} sub={allocation.sufficient ? 'All containers cover demand' : `Shortfall: ${allocation.shortfall.toFixed(3)} kg`} accent={allocation.sufficient ? '#16a34a' : '#dc2626'} />
          </div>

          {/* Container allocation table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '16px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['#', 'Container / Batch Code', 'Location', 'Harvest Date', 'Expiry', 'Days Left', 'Inhouse CFU/g', 'Available (kg)', 'Issue Qty (kg)', 'Status'].map((h, i) => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '11px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allocation.plan.map((p, i) => (
                <tr key={p.container_id} style={{ borderTop: '1px solid #f1f5f9', background: i === 0 ? '#f0fdf4' : 'transparent' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#94a3b8' }}>{i + 1}</td>
                  <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '11px', fontWeight: 600, color: '#1e293b' }}>{p.batch_code}</td>
                  <td style={{ padding: '8px 10px', color: '#475569' }}>{p.location || '—'}</td>
                  <td style={{ padding: '8px 10px', color: '#475569' }}>{fmtDate(p.harvest_date)}</td>
                  <td style={{ padding: '8px 10px', color: '#475569' }}>{fmtDate(p.expiry_date)}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: p.days_to_expiry <= 10 ? '#dc2626' : p.days_to_expiry <= 30 ? '#d97706' : '#475569' }}>
                    {p.days_to_expiry != null ? `${p.days_to_expiry}d` : '—'}
                  </td>
                  <td style={{ padding: '8px 10px', color: '#475569' }}>{fmtCfu(p.inhouse_cfu)}</td>
                  <td style={{ padding: '8px 10px', color: '#475569' }}>{p.available_qty.toFixed(3)}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 800, color: '#1e3a5f', fontSize: '13px' }}>{p.qty_to_issue.toFixed(3)}</td>
                  <td style={{ padding: '8px 10px' }}><StatusBadge s={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Step 3: Issue Form */}
          {canIssue && (
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b', marginBottom: '12px' }}>
                ✅ Step 3 — Confirm & Issue
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={LABEL}>DI NUMBER</label>
                  <input value={inputs.di_no} onChange={e => set('di_no', e.target.value)} placeholder="e.g. DI-2026-001" style={INPUT} />
                </div>
                <div>
                  <label style={LABEL}>CUSTOMER NAME</label>
                  <input value={inputs.customer} onChange={e => set('customer', e.target.value)} placeholder="Customer / Internal" style={INPUT} />
                </div>
                <div>
                  <label style={LABEL}>ISSUED TO *</label>
                  <input value={inputs.issued_to} onChange={e => set('issued_to', e.target.value)} placeholder="Person name" style={INPUT} />
                </div>
                <div>
                  <label style={LABEL}>SECTION / PRODUCT</label>
                  <input value={inputs.section} onChange={e => set('section', e.target.value)} placeholder="e.g. Mixing Section" style={INPUT} />
                </div>
              </div>
              {issueError && <div style={{ marginBottom: '12px', padding: '10px 12px', background: '#fef2f2', borderRadius: '7px', fontSize: '12px', color: '#dc2626' }}>{issueError}</div>}
              <Button variant="success" onClick={handleIssue} loading={issuing}>
                {issuing ? 'Issuing…' : `🚀 Issue ${allocation.plan.length} Container${allocation.plan.length > 1 ? 's' : ''} (${allocation.total_biomass_available.toFixed(3)} kg)`}
              </Button>
            </div>
          )}
          {!canIssue && (
            <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '7px', color: '#dc2626', fontSize: '12px' }}>
              ⛔ Store person / manager access required to issue.
            </div>
          )}
        </div>
      )}

      {/* Issue success */}
      {issueResult && (
        <div style={{ background: '#dcfce7', borderRadius: '10px', padding: '20px', border: '1px solid #bbf7d0' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#166534', marginBottom: '8px' }}>✅ Issue Successful</div>
          <div style={{ fontSize: '13px', color: '#15803d' }}>
            Issued {issueResult.count} container batch{issueResult.count > 1 ? 'es' : ''} to cold room incharge.
            Notifications have been triggered. Check the Notification Bell for delivery confirmation.
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
            <Button variant="primary" onClick={() => { setIssueResult(null); setInputs(f => ({ ...f, strain_id: '', order_qty: '', ordered_cfu: '' })) }}>
              + New Issue
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MicrobialManagement() {
  const [tab, setTab] = useState(0)
  const [containers, setContainers] = useState([])
  const [strains, setStrains] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [cRes, sRes, tRes] = await Promise.all([
        microbialApi.containers({}),
        erpStrainsApi.list(),
        microbialApi.transactions({ limit: 20 }),
      ])
      setContainers(cRes.data || [])
      setStrains(sRes.data || [])
      setTransactions(tRes.data || [])
    } catch (e) {
      console.error('Microbial load error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const TABS = ['📊 Dashboard', '🧊 Cold Room Stock', '📥 Inward', '🧮 Issue Calculator']

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", minHeight: '100%', background: '#f1f5f9' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: '2px', paddingTop: '4px' }}>
          {TABS.map((t, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              style={{
                padding: '12px 18px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: tab === i ? 700 : 500,
                color: tab === i ? '#1e3a5f' : '#94a3b8',
                borderBottom: tab === i ? '2px solid #3b82f6' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 0 && <DashboardTab containers={containers} transactions={transactions} loading={loading} />}
      {tab === 1 && <StockTab containers={containers} strains={strains} loading={loading} onRefresh={loadAll} />}
      {tab === 2 && <InwardTab strains={strains} onRefresh={loadAll} />}
      {tab === 3 && <IssueCalculatorTab strains={strains} onRefresh={loadAll} />}
    </div>
  )
}
