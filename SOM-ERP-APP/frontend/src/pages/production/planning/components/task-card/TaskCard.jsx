import { useEffect, useState } from 'react'
import { PLANT_CONFIG } from '../../data/plantConfig.js'
import { fmtDateLabel } from '../../utils/date.js'
import StatusBadge from '../ui/status-badge/StatusBadge.jsx'
import './TaskCard.css'

export default function TaskCard({ task, onEdit, onStatusUpdate, onBMR }) {
  const cfg   = PLANT_CONFIG[task.plant] || {}
  const color = cfg.color || '#64748b'
  const [elapsed, setElapsed] = useState('')

  // Live timer for Botanical plant
  useEffect(() => {
    if (task.plant !== 'Botanical' || !task.timerStart || task.status === 'Completed') return
    const iv = setInterval(() => {
      const diff = (Date.now() - new Date(task.timerStart)) / 1000
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = Math.floor(diff % 60)
      setElapsed(`⏱ ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }, 1000)
    return () => clearInterval(iv)
  }, [task.timerStart, task.status, task.plant])

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ borderLeft: `5px solid ${color}` }}>
      {/* Title row */}
      <div className="px-4 py-3 flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-[11px] text-gray-400 mb-0.5">{task.taskId}</div>
          <div className="font-bold text-[14px] text-gray-900 leading-snug">{task.productName}</div>
        </div>
        <StatusBadge status={task.status || 'Not Started'} />
      </div>

      {/* Detail grid */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11.5px] text-gray-500">
        <span>DI: <b className="text-gray-800">{task.diNo || '—'}</b></span>
        <span>Batch: <b className="text-gray-800 font-mono text-[11px]">{task.batchCode || '—'}</b></span>
        <span>Qty: <b className="text-gray-800">{task.qty} {task.qtyUom || ''}</b></span>
        <span>Process: <b className="text-gray-800">{task.process || '—'}</b></span>
        <span>Incharge: <b className="text-gray-800">{task.incharge || '—'}</b></span>
        <span>Shift: <b className="text-gray-800">{task.shift || 'G'}</b></span>
        {task.equipment   && <span>Equip: <b className="text-gray-800">{task.equipment}</b></span>}
        {task.carrier     && <span>Carrier: <b className="text-gray-800">{task.carrier}</b></span>}
        {task.specs       && <span>Specs: <b className="text-gray-800">{task.specs}</b></span>}
        {task.location    && <span>Location: <b className="text-gray-800">{task.location}</b></span>}
        {task.primaryPack && <span>Primary: <b className="text-gray-800">{task.primaryPack}</b></span>}
        {task.noUnits     && <span>Units: <b className="text-gray-800">{task.noUnits}</b></span>}
      </div>

      {task.remarks && (
        <div className="mx-4 mb-2 text-[11.5px] text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border-l-2 border-gray-200">
          📝 {task.remarks.slice(0, 80)}
        </div>
      )}

      {elapsed && (
        <div className="mx-4 mb-2 font-mono text-[12px] font-bold text-amber-500">{elapsed}</div>
      )}

      {/* Footer actions */}
      <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
        <span className="text-[11px] text-gray-400">{fmtDateLabel(task.date)}</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => onEdit(task)}
            className="px-2.5 py-1 text-[11px] font-semibold rounded bg-gray-100 hover:bg-gray-200 transition"
          >
            Edit
          </button>
          <button
            onClick={() => onBMR(task)}
            className="tc-bmr-btn px-2.5 py-1 text-[11px] font-semibold rounded text-white transition"
          >
            📋 BMR
          </button>
          <button
            onClick={() => onStatusUpdate(task)}
            className="px-2.5 py-1 text-[11px] font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Status
          </button>
        </div>
      </div>
    </div>
  )
}
