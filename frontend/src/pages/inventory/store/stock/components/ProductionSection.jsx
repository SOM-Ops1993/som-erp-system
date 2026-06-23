import { fmt } from './utils.js'
import { Skel, SLabel } from './shared.jsx'

export default function ProductionSection({ prod, loading, label }) {
  const total     = prod.totalIndents || 0
  const openPct   = total > 0 ? (prod.openIndents   / total) * 100 : 0
  const closedPct = total > 0 ? (prod.closedIndents / total) * 100 : 0

  return (
    <div>
      <SLabel>Production · {label}</SLabel>
      <div className="grid grid-cols-2 gap-3">

        {/* Indents — horizontal progress bars */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Indents (Work Orders)</p>
          {loading ? (
            <div className="space-y-2"><Skel h={7} w={14} /><Skel h={1.5} full /><Skel h={1.5} full /></div>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold text-gray-900">{fmt(total)}</span>
                <span className="text-xs text-gray-400">total</span>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Open</span>
                    <span className="font-semibold text-amber-600">{fmt(prod.openIndents)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full transition-all duration-700"
                      style={{ width: `${openPct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Closed</span>
                    <span className="font-semibold text-gray-500">{fmt(prod.closedIndents)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-400 rounded-full transition-all duration-700"
                      style={{ width: `${closedPct}%` }} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Batches — big number + status pills */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Production Batches</p>
          {loading ? (
            <div className="space-y-3">
              <Skel h={7} w={14} />
              <div className="flex gap-2"><Skel h={6} w={20} /><Skel h={6} w={20} /></div>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold text-gray-900">{fmt(prod.totalBatches)}</span>
                <span className="text-xs text-gray-400">total</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="text-xs font-bold text-blue-800">{fmt(prod.inProgressBatches)}</span>
                  <span className="text-xs text-blue-500">In Progress</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-emerald-800">{fmt(prod.completedBatches)}</span>
                  <span className="text-xs text-emerald-600">Completed</span>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
