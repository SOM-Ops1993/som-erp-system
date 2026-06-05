/**
 * Section Dashboard — Production floor view
 * Shows today + tomorrow's planned batches for a given section.
 * Each plan shows BOM status + BMR status.
 * Click a plan → opens BMR Entry screen.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { planningApi, bmrApi, bomSendApi } from '../../api/client'

const SECTIONS = ['POWDER','NANO','BOTANICAL','LIQUID','GRANULES']

const SECTION_COLOR = {
  POWDER:    { dark:'#4C1D95', light:'#F5F3FF', text:'#4C1D95', icon:'🧪' },
  NANO:      { dark:'#1E3A5F', light:'#EFF6FF', text:'#1E3A5F', icon:'🔬' },
  BOTANICAL: { dark:'#064E3B', light:'#ECFDF5', text:'#064E3B', icon:'🌿' },
  LIQUID:    { dark:'#0C4A6E', light:'#E0F2FE', text:'#0C4A6E', icon:'💧' },
  GRANULES:  { dark:'#7C2D12', light:'#FEF3C7', text:'#7C2D12', icon:'🌾' },
}

const BMR_STATUS = {
  NOT_STARTED: { label:'Not Started',   cls:'bg-gray-100 text-gray-500' },
  IN_PROGRESS: { label:'In Progress',   cls:'bg-blue-100 text-blue-700' },
  COMPLETED:   { label:'Completed',     cls:'bg-green-100 text-green-700' },
  VERIFIED:    { label:'✓ Verified',    cls:'bg-emerald-100 text-emerald-700' },
}
const BOM_STATUS = {
  PENDING:          { label:'BOM Pending',      cls:'bg-yellow-100 text-yellow-700' },
  PICKED:           { label:'Partial Issued',   cls:'bg-orange-100 text-orange-700' },
  ISSUED:           { label:'BOM Issued',       cls:'bg-blue-100 text-blue-700' },
  ISSUED_TO_SECTION:{ label:'✓ Issued to Section', cls:'bg-green-100 text-green-700' },
  ACKNOWLEDGED:     { label:'✓ Acknowledged',   cls:'bg-emerald-100 text-emerald-700' },
  CANCELLED:        { label:'Cancelled',         cls:'bg-gray-100 text-gray-400' },
}

function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
}
function fmtDay(dateStr) {
  const d = new Date(dateStr)
  const today    = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1)
  const target   = new Date(d);    target.setHours(0,0,0,0)
  if (target.getTime() === today.getTime())    return 'TODAY'
  if (target.getTime() === tomorrow.getTime()) return 'TOMORROW'
  return fmt(d)
}
function startOfDay(d) { const x=new Date(d); x.setHours(0,0,0,0); return x }

export default function SectionDashboard() {
  const navigate = useNavigate()
  const [section,    setSection]    = useState('POWDER')
  const [plans,      setPlans]      = useState([])
  const [bmrMap,     setBmrMap]     = useState({})  // planId → bmr
  const [bomMap,     setBomMap]     = useState({})  // planId → bom
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState({ incharge:'', status:'ALL', bmrStatus:'ALL' })
  const [notifications, setNotifs]  = useState([])
  const [unread,     setUnread]     = useState(0)
  const [creatingBmr, setCreatingBmr] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch plans for this section — next 7 days + today
      const from = new Date(); from.setDate(from.getDate()-1)
      const to   = new Date(); to.setDate(to.getDate()+7)
      const [plansRes, bmrsRes] = await Promise.all([
        planningApi.listPlans({
          section,
          from: from.toISOString().split('T')[0],
          to:   to.toISOString().split('T')[0],
          limit: 50,
        }),
        bmrApi.list({ section }),
      ])

      const planList = plansRes.data || plansRes || []
      const bmrList  = bmrsRes.data || []

      // Build bmrMap keyed by planId
      const bm = {}
      for (const b of bmrList) bm[b.planId] = b
      setBmrMap(bm)

      // Fetch BOM sends for these plans to show BOM status
      const bomRes = await bomSendApi.list({ section })
      const bl = bomRes.data || []
      const bomByPlan = {}
      for (const b of bl) {
        // Use the most recent FORMULATION BOM per plan
        if (b.bomType === 'FORMULATION') {
          if (!bomByPlan[b.planId] || new Date(b.sentAt) > new Date(bomByPlan[b.planId].sentAt)) {
            bomByPlan[b.planId] = b
          }
        }
      }
      setBomMap(bomByPlan)
      setPlans(planList)
    } catch (e) {
      console.error('Section dashboard load error:', e.message)
    } finally {
      setLoading(false)
    }
  }, [section])

  const loadNotifs = useCallback(async () => {
    try {
      const res = await bmrApi.notifications({ section, unreadOnly: 'true' })
      const list = res.data || []
      setNotifs(list)
      setUnread(list.filter(n => !n.read).length)
    } catch {}
  }, [section])

  useEffect(() => { load(); loadNotifs() }, [load, loadNotifs])

  async function handleStartBmr(plan) {
    setCreatingBmr(plan.id)
    try {
      const res = await bmrApi.create({ planId: plan.id })
      const bmr = res.data
      navigate(`/erp/bmr/${bmr.id}`)
    } catch (e) {
      alert('Could not create BMR: ' + e.message)
    } finally {
      setCreatingBmr(null)
    }
  }

  function handleOpenBmr(planId) {
    const bmr = bmrMap[planId]
    if (bmr) navigate(`/erp/bmr/${bmr.id}`)
  }

  // Derive BOM status label for a plan
  function bomStatusKey(plan) {
    const bom = bomMap[plan.id]
    if (!bom) return 'PENDING'
    if (bom.acknowledgedAt)    return 'ACKNOWLEDGED'
    if (bom.issuedToSectionAt) return 'ISSUED_TO_SECTION'
    if (bom.status === 'ISSUED') return 'ISSUED'
    if (bom.status === 'PICKED') return 'PICKED'
    if (bom.status === 'CANCELLED') return 'CANCELLED'
    return 'PENDING'
  }

  // Filter plans
  const filtered = plans.filter(p => {
    if (filter.incharge && !p.batchIncharge?.toLowerCase().includes(filter.incharge.toLowerCase())) return false
    if (filter.status !== 'ALL' && p.status !== filter.status) return false
    const bmr = bmrMap[p.id]
    const bmrS = bmr?.bmrStatus || 'NOT_STARTED'
    if (filter.bmrStatus !== 'ALL' && bmrS !== filter.bmrStatus) return false
    return true
  })

  // Group by date
  const grouped = {}
  for (const p of filtered) {
    const d = p.plannedDate ? new Date(p.plannedDate).toISOString().split('T')[0] : 'undated'
    if (!grouped[d]) grouped[d] = []
    grouped[d].push(p)
  }
  const sortedDates = Object.keys(grouped).sort()

  const sc = SECTION_COLOR[section] || SECTION_COLOR.POWDER

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-3 flex items-center justify-between gap-4">
          <h1 className="text-lg font-bold text-gray-900">Production Section Dashboard</h1>

          {/* Section tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {SECTIONS.map(s => {
              const sc2 = SECTION_COLOR[s]
              return (
                <button key={s} onClick={() => setSection(s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={section === s
                    ? { background: sc2.dark, color: '#fff' }
                    : { color: '#64748b' }
                  }>
                  {sc2.icon} {s}
                </button>
              )
            })}
          </div>

          {/* Notification badge */}
          <button onClick={() => {}} className="relative text-gray-500 hover:text-gray-700">
            🔔
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unread}
              </span>
            )}
          </button>
          <button onClick={load} className="text-sm text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-50 transition">
            ↻ Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 pb-3 flex flex-wrap gap-3 items-center">
          <input
            value={filter.incharge}
            onChange={e => setFilter(f => ({ ...f, incharge: e.target.value }))}
            placeholder="Filter by incharge..."
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none w-44"
          />
          <select value={filter.bmrStatus} onChange={e => setFilter(f => ({ ...f, bmrStatus: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            <option value="ALL">All BMR Status</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="VERIFIED">Verified</option>
          </select>
          <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            <option value="ALL">All Plan Status</option>
            <option value="PLANNED">Planned</option>
            <option value="RM_READY">RM Ready</option>
            <option value="ISSUED">Issued</option>
            <option value="IN_PROCESS">In Process</option>
            <option value="AWAITING_QC">Awaiting QC</option>
          </select>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} plan{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── Unacknowledged BOM alerts ─────────────────────────────────────────── */}
      {plans.filter(p => bomMap[p.id]?.issuedToSectionAt && !bomMap[p.id]?.acknowledgedAt).length > 0 && (
        <div className="mx-6 mt-4 bg-amber-50 border border-amber-300 rounded-xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">📦</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">BOM Issued — Pending Acknowledgment</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {plans.filter(p => bomMap[p.id]?.issuedToSectionAt && !bomMap[p.id]?.acknowledgedAt)
                .map(p => p.productName).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* ── Plan groups ───────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 space-y-6">
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-3xl animate-spin inline-block">⚙</div>
            <p className="text-sm mt-2">Loading plans...</p>
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-semibold text-gray-500">No plans found for {section} section</p>
            <p className="text-xs mt-1 text-gray-400">Plans appear here once created in Production Planning</p>
          </div>
        ) : sortedDates.map(date => {
          const dayLabel = date === 'undated' ? 'No Date Set' : fmtDay(date)
          const isToday    = dayLabel === 'TODAY'
          const isTomorrow = dayLabel === 'TOMORROW'

          return (
            <div key={date}>
              {/* Date group header */}
              <div className={`flex items-center gap-3 mb-3`}>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isToday    ? 'bg-green-500 text-white' :
                  isTomorrow ? 'bg-blue-500 text-white' :
                               'bg-gray-200 text-gray-600'
                }`}>
                  {dayLabel}
                </div>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{grouped[date].length} batch{grouped[date].length !== 1 ? 'es' : ''}</span>
              </div>

              {/* Plan cards */}
              <div className="grid grid-cols-1 gap-3">
                {grouped[date].map(plan => {
                  const bmr      = bmrMap[plan.id]
                  const bmrS     = bmr?.bmrStatus || 'NOT_STARTED'
                  const bomKey   = bomStatusKey(plan)
                  const bom      = bomMap[plan.id]
                  const needsAck = bom?.issuedToSectionAt && !bom?.acknowledgedAt
                  const bmrInfo  = BMR_STATUS[bmrS] || BMR_STATUS.NOT_STARTED
                  const bomInfo  = BOM_STATUS[bomKey] || BOM_STATUS.PENDING

                  return (
                    <div key={plan.id}
                      className={`bg-white rounded-xl border-2 overflow-hidden transition-shadow hover:shadow-md ${
                        needsAck ? 'border-amber-400' :
                        bmrS === 'VERIFIED'    ? 'border-emerald-300' :
                        bmrS === 'IN_PROGRESS' ? 'border-blue-300' :
                        'border-gray-200'
                      }`}>

                      {/* Card header strip */}
                      <div className="px-5 py-3 flex items-center gap-3"
                        style={{ borderLeft: `5px solid ${sc.dark}`, background: sc.light }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900 text-base">{plan.productName}</span>
                            {plan.batchCode && (
                              <span className="text-xs font-mono bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-600">
                                {plan.batchCode}
                              </span>
                            )}
                            {plan.diNo && (
                              <span className="text-xs font-mono text-gray-500">DI: {plan.diNo}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                            <span>Qty: <strong className="text-gray-800">{plan.totalQty} {plan.uom}</strong></span>
                            {plan.noOfCycles > 1 && <span>Cycles: <strong className="text-gray-800">{plan.noOfCycles}</strong></span>}
                            {plan.equipment && <span>Equip: <strong className="text-gray-800">{plan.equipment}</strong></span>}
                            {plan.batchIncharge && <span>Incharge: <strong className="text-gray-800">{plan.batchIncharge}</strong></span>}
                            {plan.shift && <span>Shift: <strong className="text-gray-800">{plan.shift}</strong></span>}
                          </div>
                        </div>

                        {/* Status badges */}
                        <div className="flex flex-col gap-1.5 items-end shrink-0">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${bomInfo.cls}`}>
                            {bomInfo.label}
                          </span>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${bmrInfo.cls}`}>
                            BMR: {bmrInfo.label}
                          </span>
                        </div>
                      </div>

                      {/* Acknowledge pending alert */}
                      {needsAck && (
                        <div className="mx-4 my-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 flex items-center justify-between gap-3">
                          <p className="text-xs text-amber-800 font-semibold">
                            📦 Stores has issued all materials — please acknowledge receipt
                          </p>
                          <button
                            onClick={async () => {
                              await bomSendApi.acknowledge(bom.id, { acknowledgedBy: 'Section Incharge' })
                              load()
                            }}
                            className="text-xs font-bold bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition whitespace-nowrap">
                            ✓ Acknowledge
                          </button>
                        </div>
                      )}

                      {/* Card actions */}
                      <div className="px-5 py-3 flex items-center justify-between border-t border-gray-100 bg-gray-50/50">
                        <div className="text-xs text-gray-400">
                          Plan: <span className="font-mono text-gray-600">{plan.planId}</span>
                          {plan.specs && <span className="ml-2">· {plan.specs}</span>}
                        </div>
                        <div className="flex gap-2">
                          {bmr ? (
                            <button
                              onClick={() => handleOpenBmr(plan.id)}
                              className="text-sm font-bold px-4 py-2 rounded-lg text-white transition"
                              style={{ background: sc.dark }}>
                              {bmrS === 'VERIFIED' ? '✓ View BMR' : bmrS === 'COMPLETED' ? 'Review BMR' : '📝 Open BMR'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStartBmr(plan)}
                              disabled={creatingBmr === plan.id}
                              className="text-sm font-bold px-4 py-2 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition">
                              {creatingBmr === plan.id ? '⏳ Creating...' : '▶ Start BMR'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
