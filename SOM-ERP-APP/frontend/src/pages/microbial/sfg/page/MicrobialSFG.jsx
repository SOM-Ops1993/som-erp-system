/**
 * MicrobialSFG — SFG Section (Plant-wise)
 * Tabs: Microbial | Powder | Nano | Botanical | Granules | Others
 * Microbial tab: full container-wise stock view
 *   — grouped by microbe → type → containers → FIFO batches
 */
import { useState, useEffect } from 'react'
import Pagination from '../../../../components/erp/Pagination.jsx'
import { microbialSfgApi } from '../../../../api/microbial.js'
import { sfgApi } from '../../../../api/inventory.js'

function fmtCfu(v) {
  if (!v) return '—'
  const n = Number(v)
  if (n >= 1e11) return `${(n / 1e11).toFixed(2)} × 10¹¹`
  if (n >= 1e10) return `${(n / 1e10).toFixed(2)} × 10¹⁰`
  if (n >= 1e9)  return `${(n / 1e9).toFixed(2)} × 10⁹`
  if (n >= 1e8)  return `${(n / 1e8).toFixed(2)} × 10⁸`
  return n.toExponential(2)
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

const FILL_COLOR = {
  FULL:    { bg: '#dcfce7', c: '#166534' },
  PARTIAL: { bg: '#fef9c3', c: '#854d0e' },
  EMPTY:   { bg: '#fee2e2', c: '#991b1b' },
}

const PLANTS = [
  { key: 'MICROBIAL', label: '🦠 Microbial',  icon: '🦠' },
  { key: 'POWDER',    label: '🧪 Powder',      icon: '🧪' },
  { key: 'NANO',      label: '🔬 Nano',        icon: '🔬' },
  { key: 'BOTANICAL', label: '🌿 Botanical',   icon: '🌿' },
  { key: 'GRANULES',  label: '🌾 Granules',    icon: '🌾' },
]

const S = {
  page:  { padding: '24px', fontFamily: "'Inter',system-ui,sans-serif" },
  h1:    { fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 },
  sub:   { fontSize: '13px', color: '#64748b', marginTop: '4px' },
  card:  { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' },
  badge: (bg, c) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700, background: bg, color: c }),
  th:    { textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', whiteSpace: 'nowrap' },
  td:    { padding: '9px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '12px', color: '#0f172a', verticalAlign: 'top' },
}

function MicrobialTab() {
  const [containers, setContainers] = useState([])
  const [inward, setInward]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [expanded, setExpanded]     = useState({})
  const [searchMicrobe, setSearch]  = useState('')
  const [page, setPage]             = useState(1)
  const [limit, setLimit]            = useState(15)

  useEffect(() => {
    Promise.all([
      microbialSfgApi.listContainers({}),
      microbialSfgApi.listInward({ status: 'ACTIVE' }),
    ]).then(([c, i]) => {
      setContainers(c?.data || []); setInward(i?.data || []); setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const toggle = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }))

  const grouped = {}
  for (const c of containers) {
    const mk = `${c.microbe_code}||${c.microbe_name}`
    if (!grouped[mk]) grouped[mk] = { microbe_code: c.microbe_code, microbe_name: c.microbe_name, types: {} }
    const tk = c.microbe_type
    if (!grouped[mk].types[tk]) grouped[mk].types[tk] = { type_code: c.type_code, containers: [] }
    grouped[mk].types[tk].containers.push(c)
  }

  const batchByContainer = {}
  for (const b of inward) {
    if (!batchByContainer[b.container_id]) batchByContainer[b.container_id] = []
    batchByContainer[b.container_id].push(b)
  }

  const keys = Object.keys(grouped).filter(k => !searchMicrobe || k.toLowerCase().includes(searchMicrobe.toLowerCase()))
  useEffect(() => { setPage(1) }, [searchMicrobe])

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading cold room stock…</div>

  if (keys.length === 0) return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
      <div style={{ fontSize: '42px', marginBottom: '10px' }}>🦠</div>
      <p>No microbial SFG stock found. Start by recording inward entries in <strong>Microbial Inward</strong>.</p>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <input placeholder="Search microbe…" value={searchMicrobe} onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', width: '260px', outline: 'none' }} />
      </div>
      {keys.slice((page - 1) * limit, page * limit).map(mk => {
        const { microbe_code, microbe_name, types } = grouped[mk]
        const allBatches = Object.values(types).flatMap(t => t.containers.flatMap(c => batchByContainer[c.container_id] || []))
        const totalKg    = allBatches.reduce((s, b) => s + Number(b.remaining_qty_kg), 0)
        const isOpen     = expanded[mk] !== false
        return (
          <div key={mk} style={S.card}>
            <div onClick={() => toggle(mk)}
              style={{ padding: '14px 20px', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{microbe_name}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', background: '#e2e8f0', borderRadius: '6px', padding: '2px 8px' }}>{microbe_code}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#166534', background: '#dcfce7', borderRadius: '6px', padding: '2px 10px' }}>
                    {totalKg.toFixed(2)} kg total
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                  {Object.keys(types).length} type(s) · {allBatches.length} active batch(es)
                </div>
              </div>
              <span style={{ fontSize: '14px', color: '#94a3b8' }}>{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
              <div style={{ padding: '16px 20px' }}>
                {Object.entries(types).map(([typeName, typeData]) => {
                  const typeBatches = typeData.containers.flatMap(c => (batchByContainer[c.container_id] || []))
                  const typeKg      = typeBatches.reduce((s, b) => s + Number(b.remaining_qty_kg), 0)
                  const avgCfu      = typeBatches.length > 0
                    ? typeBatches.reduce((s, b) => s + Number(b.inhouse_cfu_per_g) * Number(b.remaining_qty_kg), 0) / (typeKg || 1)
                    : 0
                  return (
                    <div key={typeName} style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 14px', background: '#eff6ff', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '13px' }}>{typeName}</span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{typeKg.toFixed(3)} kg available</span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Avg CFU/g: <strong>{fmtCfu(avgCfu)}</strong></span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>{typeBatches.length} batch(es) · FIFO order ↓</span>
                      </div>
                      {typeData.containers.map(cont => {
                        const fs = FILL_COLOR[cont.fill_status] || FILL_COLOR.PARTIAL
                        const batches = batchByContainer[cont.container_id] || []
                        return (
                          <div key={cont.container_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', background: '#fafafa' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{cont.container_code}</span>
                              <span style={S.badge(fs.bg, fs.c)}>{cont.fill_status}</span>
                              <span style={{ fontSize: '12px', color: '#64748b' }}>{Number(cont.current_qty_kg).toFixed(3)} kg in container</span>
                              {cont.location && <span style={{ fontSize: '12px', color: '#94a3b8' }}>📍 {cont.location}</span>}
                            </div>
                            {batches.length > 0 ? (
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                <thead>
                                  <tr style={{ background: '#f1f5f9' }}>
                                    {['FIFO','Batch Code','Harvest Date','Inhouse CFU/g','Remaining (kg)','Moisture','Shelf Life'].map(h => (
                                      <th key={h} style={{ ...S.th, fontWeight: 600, padding: h === 'FIFO' ? '5px 14px 5px 28px' : '5px 12px' }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {batches.map((b, fi) => (
                                    <tr key={b.inward_id} style={{ background: fi === 0 ? '#fffbeb' : 'transparent' }}>
                                      <td style={{ ...S.td, padding: '6px 12px 6px 28px' }}>
                                        {fi === 0
                                          ? <span style={{ fontSize: '10px', fontWeight: 700, color: '#d97706', background: '#fef3c7', borderRadius: '4px', padding: '1px 6px' }}>NEXT</span>
                                          : <span style={{ color: '#94a3b8' }}>#{fi + 1}</span>}
                                      </td>
                                      <td style={{ ...S.td, padding: '6px 12px', fontFamily: 'monospace' }}>{b.biomass_batch_code}</td>
                                      <td style={{ ...S.td, padding: '6px 12px' }}>{fmtDate(b.date_of_harvest)}</td>
                                      <td style={{ ...S.td, padding: '6px 12px', fontWeight: 700 }}>{fmtCfu(b.inhouse_cfu_per_g)}</td>
                                      <td style={{ ...S.td, padding: '6px 12px', fontWeight: 700, color: '#166534' }}>{Number(b.remaining_qty_kg).toFixed(3)}</td>
                                      <td style={{ ...S.td, padding: '6px 12px' }}>{b.moisture != null ? `${b.moisture}%` : '—'}</td>
                                      <td style={{ ...S.td, padding: '6px 12px' }}>{b.shelf_life_days != null ? `${b.shelf_life_days}d` : '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div style={{ padding: '8px 28px', fontSize: '11px', color: '#94a3b8' }}>No active batches in this container</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      <div style={{ marginTop: '12px' }}>
        <Pagination page={page} total={keys.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
      </div>
    </div>
  )
}

function OtherPlantTab({ plant }) {
  return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
      <div style={{ fontSize: '42px', marginBottom: '12px' }}>{plant.icon}</div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>{plant.label} SFG</div>
      <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 20px', display: 'inline-block', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8' }}>COMING SOON</div>
      <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '320px', margin: '12px auto 0' }}>
        SFG tracking for {plant.label.replace(/[^\w\s]/g,'')} plant will be integrated here.
      </p>
    </div>
  )
}

export default function MicrobialSFG() {
  const [activeTab, setActiveTab] = useState('MICROBIAL')
  return (
    <div style={S.page}>
      <div style={{ marginBottom: '14px' }}>
        <button
          onClick={() => window.history.back()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '7px 14px', borderRadius: '10px',
            background: '#fff', border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            fontSize: '13px', fontWeight: 500, color: '#475569', cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#0f172a' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#475569' }}
        >
          ← Back
        </button>
      </div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={S.h1}>⚗️ SFG — Semi-Finished Goods</h1>
        <p style={S.sub}>Plant-wise SFG stock overview. Select a plant to view availability.</p>
      </div>
      <div style={{ display: 'flex', gap: '0', marginBottom: '24px', borderBottom: '2px solid #e2e8f0', overflowX: 'auto' }}>
        {PLANTS.map(p => (
          <button key={p.key} onClick={() => setActiveTab(p.key)} style={{
            padding: '10px 22px', fontSize: '13px', fontWeight: activeTab === p.key ? 700 : 500,
            color: activeTab === p.key ? '#1d4ed8' : '#64748b',
            background: 'transparent', border: 'none', cursor: 'pointer',
            borderBottom: activeTab === p.key ? '3px solid #1d4ed8' : '3px solid transparent',
            marginBottom: '-2px', transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>
            {p.label}
          </button>
        ))}
      </div>
      {activeTab === 'MICROBIAL' ? <MicrobialTab /> : <OtherPlantTab plant={PLANTS.find(p => p.key === activeTab)} />}
    </div>
  )
}
