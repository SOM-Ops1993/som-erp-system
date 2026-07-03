import { useState } from 'react'
import { PLANT_CONFIG } from '../../data/plantConfig.js'
import StatusBadge from '../ui/status-badge/StatusBadge.jsx'
import { Button, IconButton } from '../../../../../components/ui'
import { X, Check } from 'lucide-react'
import { planTasksApi } from '../../../../../api/production.js'
import './StatusDrawer.css'

export default function StatusDrawer({ task, onSave, onClose }) {
  const cfg = PLANT_CONFIG[task.plant] || {}
  const [status,  setStatus]  = useState(task.status  || 'Not Started')
  const [remarks, setRemarks] = useState(task.remarks || '')
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  async function handleSave() {
    setSaving(true)
    setErr('')
    try {
      const updates = { status, remarks }

      // Botanical live timer
      if (task.plant === 'Botanical') {
        const prev = task.status
        if (prev === 'Not Started' && status !== 'Not Started' && !task.timerStart)
          updates.timerStart = new Date().toISOString()
        if (status === 'Completed' && !task.timerEnd)
          updates.timerEnd = new Date().toISOString()
      }

      await planTasksApi.update(task.id, updates)
      onSave()
      onClose()
    } catch (e) {
      setErr(e.response?.data?.error || e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-sm bg-white flex flex-col h-full shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
          <span className="font-bold text-[14px]">Update Status</span>
          <IconButton icon={X} tooltip="Close" onClick={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-[13px]">
            <div className="text-[11px] text-gray-400 mb-1">
              Task: <span className="font-mono font-bold text-gray-700">{task.taskId}</span>
            </div>
            <div className="font-bold text-gray-900">{task.productName}</div>
            <div className="text-gray-500 mt-0.5">{task.process} — {task.qty} {task.qtyUom || ''}</div>
            <div className="mt-2">Current: <StatusBadge status={task.status || 'Not Started'} /></div>
          </div>

          {err && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{err}</div>}

          <div className="mb-4">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">New Status *</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400">
              {(cfg.statuses || []).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Remarks / Notes</label>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] resize-vertical focus:outline-none focus:border-blue-400"/>
          </div>
        </div>

        <div className="px-5 py-4 border-t flex gap-2.5 justify-end sticky bottom-0 bg-white">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="success" icon={Check} onClick={handleSave} loading={saving}>
            {saving ? 'Saving…' : 'Update'}
          </Button>
        </div>
      </div>
    </div>
  )
}
