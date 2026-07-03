import { useState, useEffect, useCallback } from 'react'
import { PLANT_CONFIG, PLANT_KEYS, PLANT_BADGE, statusBadgeCls } from '../data/plantConfig.js'
import { todayISO, addDays, fmtDateLabel } from '../utils/date.js'
import AddTaskDrawer from '../components/add-task-drawer/AddTaskDrawer.jsx'
import StatusDrawer from '../components/status-drawer/StatusDrawer.jsx'
import SFGStockModal from '../components/sfg-stock-modal/SFGStockModal.jsx'
import Toast from '../components/ui/toast/Toast.jsx'
import BomIssuance from '../bom-issuance/components/BomIssuance.jsx'
import { Button, IconButton } from '../../../../components/ui'
import { Plus, Send, Pencil, Trash2 } from 'lucide-react'
import { planTasksApi } from '../../../../api/production.js'
import './PlanningPage.css'

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

// ── Dashboard Tab ─────────────────────────────────────────────────────────────
function DashboardTab({ tasks, onStatusUpdate }) {
  const today = todayISO()
  const todayTasks = tasks.filter(t => t.date === today && t.sent && t.status !== 'Completed')

  return (
    <div className="p-6">
      <div className="grid grid-cols-5 gap-3.5 mb-6">
        {PLANT_KEYS.map(plant => {
          const cfg   = PLANT_CONFIG[plant]
          const count = todayTasks.filter(t => t.plant === plant).length
          return (
            <div key={plant} className="bg-white rounded-xl p-4 shadow-sm" style={{ borderTop: `4px solid ${cfg.color}` }}>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{plant}</div>
              <div className="text-[22px] font-bold text-gray-900">{count}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">active tasks today</div>
            </div>
          )
        })}
      </div>

      {todayTasks.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <div className="text-4xl mb-3">📅</div>
          <div className="font-semibold text-gray-500">No active tasks for today</div>
          <div className="text-[12px] mt-1">Go to Planning tab → create tasks → Send Schedule</div>
        </div>
      ) : (
        <div className="pp-task-grid grid gap-3.5">
          {todayTasks.map(t => (
            <div key={t.id} className="bg-white rounded-xl shadow-sm overflow-hidden"
              style={{ borderLeft: `5px solid ${PLANT_CONFIG[t.plant]?.color || '#64748b'}` }}>
              <div className="px-4 py-3 flex items-start justify-between">
                <div>
                  <div className="font-mono text-[11px] text-gray-400 mb-0.5">{t.taskId}</div>
                  <div className="font-bold text-[14px]">{t.productName}</div>
                </div>
                <StatusBadge status={t.status || 'Not Started'} />
              </div>
              <div className="px-4 pb-3 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11.5px] text-gray-500">
                <span>Plant: <b className="text-gray-800">{t.plant}</b></span>
                <span>Qty: <b className="text-gray-800">{t.qty} {t.qtyUom || ''}</b></span>
                <span>Process: <b className="text-gray-800">{t.process}</b></span>
                <span>Incharge: <b className="text-gray-800">{t.incharge}</b></span>
              </div>
              <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
                <PlantBadge plant={t.plant} />
                <Button variant="primary" size="xs" onClick={() => onStatusUpdate(t)}>
                  Update Status
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Planning Tab ──────────────────────────────────────────────────────────────
function PlanningTab({ tasks, onRefresh, onAdd, onEdit, onDelete, toastShow }) {
  const [planDate,   setPlanDate]   = useState(todayISO())
  const [dateOffset, setDateOffset] = useState(0)
  const [sending,    setSending]    = useState(false)

  function setOffset(n) {
    setDateOffset(n)
    setPlanDate(addDays(todayISO(), n))
  }

  const filtered = tasks.filter(t => t.date === planDate)

  async function sendSchedule() {
    const unsent = filtered.filter(t => !t.sent)
    if (!unsent.length) { toastShow('No unsent tasks for this date', 'err'); return }
    setSending(true)
    try {
      await planTasksApi.sendSchedule(planDate)
      onRefresh()
      toastShow(`✓ Schedule sent — ${unsent.length} task(s) pushed to plant pages`, 'ok')
    } catch (e) {
      toastShow(e.message, 'err')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-6">
      <div className="pp-schedule-banner rounded-xl p-4 mb-5 flex items-center justify-between text-white">
        <div>
          <div className="font-bold text-[14px] mb-0.5">📅 Production Schedule</div>
          <div className="text-[13px] opacity-80">
            Plan tasks for any date, then <b className="opacity-100">Send Schedule</b> to push to plant dashboards.
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <input type="date" value={planDate} onChange={e => { setPlanDate(e.target.value); setDateOffset(null) }}
            className="px-3 py-2 rounded-lg text-[13px] text-gray-800 border-0 focus:outline-none" />
          <Button variant="warning" icon={Plus} size="sm" onClick={() => onAdd(planDate)}>Add Task</Button>
          <Button variant="success" icon={Send} size="sm" onClick={sendSchedule} loading={sending}>Send Schedule</Button>
        </div>
      </div>

      <div className="flex items-center gap-2.5 mb-4">
        {[[-1, 'Yesterday'], [0, 'Today'], [1, 'Tomorrow'], [2, 'Day After']].map(([n, label]) => (
          <button key={n} onClick={() => setOffset(n)}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold border-[1.5px] transition
              ${dateOffset === n ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-500 bg-white'}`}>
            {label}
          </button>
        ))}
        <span className="text-[12px] text-gray-400 ml-2">{fmtDateLabel(planDate)}</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 font-bold text-[13px] text-white flex items-center justify-between bg-[#374151]">
          <span>📋 Tasks for {fmtDateLabel(planDate)}</span>
          <span className="text-[12px] opacity-70">{filtered.length} task(s)</span>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-3xl mb-2">📋</div>
            <div className="font-medium text-gray-500">No tasks for this date</div>
            <div className="text-[12px] mt-1">Click "+ Add Task" to plan</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-gray-50">
                  {['Task ID', 'Plant', 'Product', 'DI No', 'Batch Code', 'Qty', 'Process', 'Incharge', 'Shift', 'Status', 'Sent', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider text-left border-b-2 border-gray-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr key={t.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                    <td className="px-3 py-2.5 font-mono text-[11.5px] font-bold text-indigo-700">{t.taskId}</td>
                    <td className="px-3 py-2.5"><PlantBadge plant={t.plant} /></td>
                    <td className="px-3 py-2.5 font-semibold text-gray-800 max-w-[140px] truncate">{t.productName}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-[11.5px]">{t.diNo || '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-gray-600 max-w-[150px] truncate">{t.batchCode || '—'}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-700">{t.qty} <span className="text-[10px] text-gray-400 font-normal">{t.qtyUom || ''}</span></td>
                    <td className="px-3 py-2.5 text-gray-600">{t.process || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{t.incharge || '—'}</td>
                    <td className="px-3 py-2.5"><span className="bg-gray-100 text-gray-600 text-[10.5px] font-semibold px-2 py-0.5 rounded-full">{t.shift || 'G'}</span></td>
                    <td className="px-3 py-2.5"><StatusBadge status={t.status || 'Not Started'} /></td>
                    <td className="px-3 py-2.5">
                      {t.sent
                        ? <span className="text-[10.5px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">✓ Sent</span>
                        : <span className="text-[10.5px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">Draft</span>
                      }
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1.5">
                        <Button variant="secondary" size="xs" icon={Pencil} onClick={() => onEdit(t)}>Edit</Button>
                        <Button variant="danger" size="xs" icon={Trash2} onClick={() => onDelete(t)}>Del</Button>
                      </div>
                    </td>
                  </tr>
                ))}
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
  { id: 'dashboard',    label: '📊 Dashboard' },
  { id: 'planning',     label: '📅 Planning' },
  { id: 'bom-issuance', label: '📝 BOM Issuance' },
]

export default function PlanningPage() {
  const [activeTab,    setActiveTab]    = useState('dashboard')
  const [tasks,        setTasks]        = useState([])
  const [loading,      setLoading]      = useState(false)
  const [drawer,       setDrawer]       = useState(null)   // null | { defaultDate? } | { task }
  const [statusTarget, setStatusTarget] = useState(null)
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

  async function deleteTask(t) {
    if (!confirm('Delete this task?')) return
    try {
      await planTasksApi.delete(t.id)
      loadTasks()
      toastShow('Task deleted', 'ok')
    } catch (e) {
      toastShow(e.message, 'err')
    }
  }

  const today = todayISO()
  const activeTodayCount = tasks.filter(t => t.date === today && t.sent && t.status !== 'Completed').length

  return (
    <div className="pp-root flex flex-col overflow-hidden bg-[#f0f4f8]">
      {/* Top bar */}
      <div className="pp-topbar bg-[#0f1923] text-white px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-[15px]">🏭 SOM Phyto Pharma</span>
          <span className="text-[12px] opacity-60 font-normal">Production Planning ERP</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setSfgOpen(true)}
            className="border border-white/30 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition text-white">
            SFG Stock
          </button>
          {activeTodayCount > 0 && (
            <span className="bg-white/15 text-[11px] px-2.5 py-1 rounded">{activeTodayCount} active today</span>
          )}
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
            {tab.label}
          </button>
        ))}
        {loading && <span className="ml-auto self-center text-[11px] text-gray-400 pr-4">Loading…</span>}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'dashboard' && (
          <div className="flex-1 overflow-y-auto">
            <DashboardTab tasks={tasks} onStatusUpdate={t => setStatusTarget(t)} />
          </div>
        )}
        {activeTab === 'planning' && (
          <div className="flex-1 overflow-y-auto">
            <PlanningTab
              tasks={tasks}
              onRefresh={loadTasks}
              onAdd={(defaultDate) => setDrawer({ defaultDate })}
              onEdit={t => setDrawer({ task: t })}
              onDelete={deleteTask}
              toastShow={toastShow}
            />
          </div>
        )}
        {activeTab === 'bom-issuance' && (
          <BomIssuance />
        )}
      </div>

      {drawer && (
        <AddTaskDrawer
          task={drawer.task || null}
          defaultDate={drawer.defaultDate || todayISO()}
          onSave={() => toastShow(drawer.task ? 'Task updated' : 'Task added', 'ok')}
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

      {sfgOpen && <SFGStockModal onClose={() => setSfgOpen(false)} />}

      <Toast toast={toast} />
    </div>
  )
}
