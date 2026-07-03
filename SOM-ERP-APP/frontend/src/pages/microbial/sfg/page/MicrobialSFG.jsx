/**
 * MicrobialSFG — SFG Section (Plant-wise)
 * Tabs: Microbial | Powder | Nano | Botanical | Granules | Others
 * Microbial tab: full container-wise stock view
 *   — grouped by microbe → type → containers → FIFO batches
 */
import { useState, useEffect } from 'react'
import Pagination from '../../../../components/pagination/Pagination.jsx'
import { microbialSfgApi } from '../../../../api/microbial.js'
import { BackButton } from '../../../../components/ui'
import './MicrobialSFG.css'

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

const PLANTS = [
  { key: 'MICROBIAL', label: '🦠 Microbial',  icon: '🦠' },
  { key: 'POWDER',    label: '🧪 Powder',      icon: '🧪' },
  { key: 'NANO',      label: '🔬 Nano',        icon: '🔬' },
  { key: 'BOTANICAL', label: '🌿 Botanical',   icon: '🌿' },
  { key: 'GRANULES',  label: '🌾 Granules',    icon: '🌾' },
]

function fillBadgeCls(fill) {
  if (fill === 'FULL')    return 'msfg-badge msfg-badge--fill-full'
  if (fill === 'PARTIAL') return 'msfg-badge msfg-badge--fill-partial'
  return 'msfg-badge msfg-badge--fill-empty'
}

function MicrobialTab() {
  const [containers, setContainers] = useState([])
  const [inward, setInward]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [expanded, setExpanded]     = useState({})
  const [searchMicrobe, setSearch]  = useState('')
  const [page, setPage]             = useState(1)
  const [limit, setLimit]           = useState(15)

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

  if (loading) return <div className="msfg-loading">Loading cold room stock…</div>

  if (keys.length === 0) return (
    <div className="msfg-empty">
      <div className="msfg-empty-icon">🦠</div>
      <p>No microbial SFG stock found. Start by recording inward entries in <strong>Microbial Inward</strong>.</p>
    </div>
  )

  return (
    <div>
      <div className="msfg-search-wrap">
        <input placeholder="Search microbe…" value={searchMicrobe} onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="msfg-search" />
      </div>
      {keys.slice((page - 1) * limit, page * limit).map(mk => {
        const { microbe_code, microbe_name, types } = grouped[mk]
        const allBatches = Object.values(types).flatMap(t => t.containers.flatMap(c => batchByContainer[c.container_id] || []))
        const totalKg    = allBatches.reduce((s, b) => s + Number(b.remaining_qty_kg), 0)
        const isOpen     = expanded[mk] !== false
        return (
          <div key={mk} className="msfg-card">
            <div onClick={() => toggle(mk)} className="msfg-group-header">
              <div className="msfg-group-info">
                <div className="msfg-group-title-row">
                  <span className="msfg-group-name">{microbe_name}</span>
                  <span className="msfg-group-code">{microbe_code}</span>
                  <span className="msfg-group-total">
                    {totalKg.toFixed(2)} kg total
                  </span>
                </div>
                <div className="msfg-group-meta">
                  {Object.keys(types).length} type(s) · {allBatches.length} active batch(es)
                </div>
              </div>
              <span className="msfg-toggle-icon">{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
              <div className="msfg-group-body">
                {Object.entries(types).map(([typeName, typeData]) => {
                  const typeBatches = typeData.containers.flatMap(c => (batchByContainer[c.container_id] || []))
                  const typeKg      = typeBatches.reduce((s, b) => s + Number(b.remaining_qty_kg), 0)
                  const avgCfu      = typeBatches.length > 0
                    ? typeBatches.reduce((s, b) => s + Number(b.inhouse_cfu_per_g) * Number(b.remaining_qty_kg), 0) / (typeKg || 1)
                    : 0
                  return (
                    <div key={typeName} className="msfg-type-section">
                      <div className="msfg-type-header">
                        <span className="msfg-type-name">{typeName}</span>
                        <span className="msfg-type-meta">{typeKg.toFixed(3)} kg available</span>
                        <span className="msfg-type-meta">Avg CFU/g: <strong>{fmtCfu(avgCfu)}</strong></span>
                        <span className="msfg-type-fifo-hint">{typeBatches.length} batch(es) · FIFO order ↓</span>
                      </div>
                      {typeData.containers.map(cont => {
                        const batches = batchByContainer[cont.container_id] || []
                        return (
                          <div key={cont.container_id} className="msfg-container-row">
                            <div className="msfg-container-header">
                              <span className="msfg-container-code">{cont.container_code}</span>
                              <span className={fillBadgeCls(cont.fill_status)}>{cont.fill_status}</span>
                              <span className="msfg-container-qty">{Number(cont.current_qty_kg).toFixed(3)} kg in container</span>
                              {cont.location && <span className="msfg-container-loc">📍 {cont.location}</span>}
                            </div>
                            {batches.length > 0 ? (
                              <table className="msfg-fifo-table">
                                <thead>
                                  <tr className="msfg-fifo-thead-row">
                                    {['FIFO','Batch Code','Harvest Date','Inhouse CFU/g','Remaining (kg)','Moisture','Shelf Life'].map(h => (
                                      <th key={h} className={`msfg-fifo-th ${h === 'FIFO' ? 'msfg-fifo-th--indent' : 'msfg-fifo-th--compact'}`}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {batches.map((b, fi) => (
                                    <tr key={b.inward_id} className={fi === 0 ? 'msfg-fifo-tr--next' : 'msfg-fifo-tr--rest'}>
                                      <td className="msfg-fifo-td msfg-fifo-td--indent">
                                        {fi === 0
                                          ? <span className="msfg-fifo-next-badge">NEXT</span>
                                          : <span className="msfg-fifo-rest-no">#{fi + 1}</span>}
                                      </td>
                                      <td className="msfg-fifo-td msfg-fifo-td--compact msfg-fifo-td--mono">{b.biomass_batch_code}</td>
                                      <td className="msfg-fifo-td msfg-fifo-td--compact">{fmtDate(b.date_of_harvest)}</td>
                                      <td className="msfg-fifo-td msfg-fifo-td--compact msfg-fifo-td--bold">{fmtCfu(b.inhouse_cfu_per_g)}</td>
                                      <td className="msfg-fifo-td msfg-fifo-td--compact msfg-fifo-td--green">{Number(b.remaining_qty_kg).toFixed(3)}</td>
                                      <td className="msfg-fifo-td msfg-fifo-td--compact">{b.moisture != null ? `${b.moisture}%` : '—'}</td>
                                      <td className="msfg-fifo-td msfg-fifo-td--compact">{b.shelf_life_days != null ? `${b.shelf_life_days}d` : '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div className="msfg-no-batches">No active batches in this container</div>
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
      <div className="msfg-pagination">
        <Pagination page={page} total={keys.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
      </div>
    </div>
  )
}

function OtherPlantTab({ plant }) {
  return (
    <div className="msfg-coming-soon">
      <div className="msfg-coming-soon-icon">{plant.icon}</div>
      <div className="msfg-coming-soon-title">{plant.label} SFG</div>
      <div className="msfg-coming-soon-badge">COMING SOON</div>
      <p className="msfg-coming-soon-desc">
        SFG tracking for {plant.label.replace(/[^\w\s]/g,'')} plant will be integrated here.
      </p>
    </div>
  )
}

export default function MicrobialSFG() {
  const [activeTab, setActiveTab] = useState('MICROBIAL')
  return (
    <div className="msfg-page">
      <div className="msfg-back">
        <BackButton />
      </div>
      <div className="msfg-header">
        <h1 className="msfg-h1">⚗️ SFG — Semi-Finished Goods</h1>
        <p className="msfg-sub">Plant-wise SFG stock overview. Select a plant to view availability.</p>
      </div>
      <div className="msfg-tab-bar">
        {PLANTS.map(p => (
          <button key={p.key} onClick={() => setActiveTab(p.key)}
            className={`msfg-tab-btn${activeTab === p.key ? ' msfg-tab-btn--active' : ''}`}>
            {p.label}
          </button>
        ))}
      </div>
      {activeTab === 'MICROBIAL' ? <MicrobialTab /> : <OtherPlantTab plant={PLANTS.find(p => p.key === activeTab)} />}
    </div>
  )
}
