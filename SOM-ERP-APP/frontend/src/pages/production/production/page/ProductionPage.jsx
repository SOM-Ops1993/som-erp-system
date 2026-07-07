import { useState, useEffect, useCallback } from 'react'
// Task scheduling data/utils/drawers are shared with Planning (production/planning) —
// kept there rather than duplicated, since both pages operate on the same task data.
import { PLANT_CONFIG, PLANT_KEYS, TAB_TO_PLANT, PLANT_BADGE, statusBadgeCls } from '../../planning/data/plantConfig.js'
import { todayISO, addDays, fmtDateLabel } from '../../planning/utils/date.js'
import AddTaskDrawer from '../../planning/components/add-task-drawer/AddTaskDrawer.jsx'
import StatusDrawer from '../../planning/components/status-drawer/StatusDrawer.jsx'
import SFGStockModal from '../../planning/components/sfg-stock-modal/SFGStockModal.jsx'
import Toast from '../../planning/components/ui/toast/Toast.jsx'
import TaskCard from '../components/task-card/TaskCard.jsx'
import BMROverlay from '../components/bmr-overlay/BMROverlay.jsx'
import { Button } from '../../../../components/ui'
import { Download } from 'lucide-react'
import { planTasksApi } from '../../../../api/production.js'
import './ProductionPage.css'

function useToast() {
  const [toast, setToast] = useState(null)
  function show(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }
  return { toast, show }
}

function StatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold whitespace-nowrap ${statusBadgeCls(status)}`}>
      {status || '—'}
    </span>
  )
}

function PlantBadge({ plant }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold whitespace-nowrap ${PLANT_BADGE[plant] || 'bg-gray-100 text-gray-600'}`}>
      {plant}
    </span>
  )
}

// ── Plant Tab ─────────────────────────────────────────────────────────────────
function PlantTab({ plant, tasks, onEdit, onStatusUpdate, onBMR }) {
  const cfg = PLANT_CONFIG[plant]
  const [date,         setDate]         = useState(todayISO())
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = tasks.filter(t => {
    if (t.plant !== plant || t.date !== date || !t.sent) return false
    const q = search.toLowerCase()
    if (q && !t.productName.toLowerCase().includes(q) && !(t.taskId || '').toLowerCase().includes(q)) return false
    if (statusFilter && t.status !== statusFilter) return false
    return true
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="px-4 py-1.5 rounded-full text-[12px] font-bold text-white" style={{ background: cfg.color }}>
            {cfg.label}
          </span>
          <span className="text-[13px] text-gray-400">{fmtDateLabel(date)}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline-gray" size="sm" onClick={() => setDate(addDays(todayISO(), -1))}>← Yesterday</Button>
          <Button variant="primary" size="sm" onClick={() => setDate(todayISO())}>Today</Button>
          <Button variant="outline-gray" size="sm" onClick={() => setDate(addDays(todayISO(), 1))}>Tomorrow →</Button>
        </div>
      </div>

      <div className="flex gap-2.5 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search product, task ID..."
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400 bg-white">
          <option value="">All Statuses</option>
          {(cfg.statuses || []).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <div className="text-4xl mb-2">🏭</div>
          <div className="font-medium text-gray-500">No tasks for this plant on this date</div>
          <div className="text-[12px] mt-1">Ensure the schedule has been sent from the Planning page</div>
        </div>
      ) : (
        <div className="prodp-task-grid grid gap-3.5">
          {filtered.map(t => (
            <TaskCard key={t.id} task={t} onEdit={onEdit} onStatusUpdate={onStatusUpdate} onBMR={onBMR} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab({ tasks }) {
  const [search,   setSearch]   = useState('')
  const [plant,    setPlant]    = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate,   setToDate]   = useState('')

  const filtered = tasks.filter(t => {
    const q  = search.toLowerCase()
    const mq = !q || t.productName.toLowerCase().includes(q) || (t.taskId || '').toLowerCase().includes(q) || (t.diNo || '').toLowerCase().includes(q)
    const mp = !plant    || t.plant    === plant
    const mf = !fromDate || t.date    >= fromDate
    const mt = !toDate   || t.date    <= toDate
    return mq && mp && mf && mt
  }).sort((a, b) => b.date.localeCompare(a.date))

  function exportCSV() {
    if (!filtered.length) { alert('Nothing to export'); return }
    const hdrs = ['Task ID', 'Date', 'Plant', 'Product', 'DI No', 'Batch Code', 'Qty', 'Process', 'Incharge', 'Shift', 'Equipment', 'Carrier', 'Specs', 'Status', 'Remarks', 'Timer Start', 'Timer End']
    const rows = filtered.map(t => [
      t.taskId, t.date, t.plant, t.productName, t.diNo || '', t.batchCode || '',
      t.qty, t.process, t.incharge, t.shift || '', t.equipment || '', t.carrier || '', t.specs || '',
      t.status, t.remarks || '', t.timerStart || '', t.timerEnd || ''
    ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
    const csv = [hdrs.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `production_history_${todayISO()}.csv`
    a.click()
  }

  function durStr(t) {
    if (!t.timerStart || !t.timerEnd) return '—'
    const s = (new Date(t.timerEnd) - new Date(t.timerStart)) / 1000
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  }

  return (
    <div className="p-6">
      <div className="flex gap-2.5 mb-4 flex-wrap items-center">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search product, task ID, DI number..."
          className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400 prodp-history-search" />
        <select value={plant} onChange={e => setPlant(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] bg-white focus:outline-none focus:border-blue-400">
          <option value="">All Plants</option>
          {PLANT_KEYS.map(p => <option key={p}>{p}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400" />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400" />
        <Button variant="secondary" icon={Download} size="sm" onClick={exportCSV}>Export CSV</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 font-bold text-[13px] text-white bg-[#374151]">
          📋 Production History — {filtered.length} record(s)
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-3xl mb-2">📋</div>
            <div className="font-medium text-gray-500">No tasks match the current filters</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-gray-50">
                  {['Task ID', 'Date', 'Plant', 'Product', 'DI No', 'Batch Code', 'Qty', 'Process', 'Incharge', 'Status', 'Duration', 'Remarks'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider text-left border-b-2 border-gray-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const rowBg = t.status === 'Completed' ? 'bg-green-50/40' : t.status === 'On Hold' ? 'bg-yellow-50/40' : i % 2 ? 'bg-gray-50/30' : ''
                  return (
                    <tr key={t.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${rowBg}`}>
                      <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-indigo-700">{t.taskId}</td>
                      <td className="px-3 py-2.5 text-[11.5px] text-gray-600">{t.date}</td>
                      <td className="px-3 py-2.5"><PlantBadge plant={t.plant} /></td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800">{t.productName}</td>
                      <td className="px-3 py-2.5 text-[11.5px] text-gray-500">{t.diNo || '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-gray-600">{t.batchCode || '—'}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-700">{t.qty} <span className="text-[10px] text-gray-400 font-normal">{t.qtyUom || ''}</span></td>
                      <td className="px-3 py-2.5 text-gray-600">{t.process || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-600">{t.incharge || '—'}</td>
                      <td className="px-3 py-2.5"><StatusBadge status={t.status || '—'} /></td>
                      <td className="px-3 py-2.5 text-[11.5px] text-gray-500">{durStr(t)}</td>
                      <td className="px-3 py-2.5 max-w-[150px] text-[11.5px] text-gray-400 truncate">{(t.remarks || '').slice(0, 50)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'nano',      label: 'Nano Plant',     dot: '#1a4a6b' },
  { id: 'botanical', label: 'Botanical',      dot: '#2d5e18' },
  { id: 'liquid',    label: 'Liquid Filling', dot: '#7c3aed' },
  { id: 'powder',    label: 'Powder',         dot: '#92400e' },
  { id: 'granules',  label: 'Granules',       dot: '#0f766e' },
  { id: 'history',   label: '📋 History' },
]

export default function ProductionPage() {
  const [activeTab,    setActiveTab]    = useState('nano')
  const [tasks,        setTasks]        = useState([])
  const [loading,      setLoading]      = useState(false)
  const [drawer,       setDrawer]       = useState(null)
  const [statusTarget, setStatusTarget] = useState(null)
  const [bmrTasks,     setBmrTasks]     = useState([])   // array of full task objects
  const [sfgOpen,      setSfgOpen]      = useState(false)
  const { toast, show: toastShow } = useToast()

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const r = await planTasksApi.list()
      setTasks(r.data || [])
    } catch (e) {
      toastShow('Failed to load tasks: ' + e.message, 'err')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTasks() }, [])

  function openBMR(task) {
    setBmrTasks(prev => prev.find(t => t.id === task.id) ? prev : [...prev, task])
  }

  const today = todayISO()
  const activeTodayCount = tasks.filter(t => t.date === today && t.sent && t.status !== 'Completed').length

  return (
    <div className="prodp-root flex flex-col overflow-hidden bg-[#f0f4f8]">
      {/* Top bar */}
      <div className="prodp-topbar bg-[#0f1923] text-white px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-[15px]">🏭 SOM Phyto Pharma</span>
          <span className="text-[12px] opacity-60 font-normal">Production Operations</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setSfgOpen(true)}
            className="border border-white/30 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition text-white">
            SFG Stock
          </button>
          {activeTodayCount > 0 && (
            <span className="bg-white/15 text-[11px] px-2.5 py-1 rounded">{activeTodayCount} active today</span>
          )}
          {loading && <span className="text-[11px] opacity-60">Loading…</span>}
          <span className="text-[12px] opacity-70">
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b-2 border-gray-200 flex px-6 overflow-x-auto flex-shrink-0">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-5 py-3.5 text-[13px] font-semibold border-b-[3px] -mb-0.5 whitespace-nowrap transition
              ${activeTab === tab.id ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-700'}`}>
            {tab.dot && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tab.dot }} />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {['nano', 'botanical', 'liquid', 'powder', 'granules'].includes(activeTab) && (
          <PlantTab
            plant={TAB_TO_PLANT[activeTab]}
            tasks={tasks}
            onEdit={t => setDrawer({ task: t })}
            onStatusUpdate={t => setStatusTarget(t)}
            onBMR={openBMR}
          />
        )}
        {activeTab === 'history' && <HistoryTab tasks={tasks} />}
      </div>

      {drawer && (
        <AddTaskDrawer
          task={drawer.task}
          defaultDate={todayISO()}
          onSave={() => toastShow('Task updated', 'ok')}
          onClose={() => { setDrawer(null); loadTasks() }}
        />
      )}

      {statusTarget && (
        <StatusDrawer
          task={statusTarget}
          onSave={() => { loadTasks(); toastShow('Status updated', 'ok') }}
          onClose={() => setStatusTarget(null)}
        />
      )}

      {bmrTasks.length > 0 && (
        <BMROverlay
          openTasks={bmrTasks}
          onClose={() => { setBmrTasks([]); loadTasks() }}
          onTasksChange={tasks => { setBmrTasks(tasks); loadTasks() }}
        />
      )}

      {sfgOpen && <SFGStockModal onClose={() => setSfgOpen(false)} />}

      <Toast toast={toast} />
    </div>
  )
}
