import { fmt } from './utils.js'
import { Skel, SLabel } from './shared.jsx'

export default function GateSection({ gate, loading, label }) {
  const total    = gate.inwardTotal    || 0
  const approved = gate.inwardApproved || 0
  const pending  = gate.inwardPending  || 0
  const pct      = total > 0 ? Math.round((approved / total) * 100) : 0

  return (
    <div>
      <SLabel>Gate · {label}</SLabel>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-gray-100">

          {/* Inward */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-xs">↓</div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gate Inward</span>
            </div>
            {loading ? (
              <div className="space-y-3"><Skel h={7} w={14} /><Skel h={1.5} full /><Skel h={1.5} full /></div>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold text-gray-900 leading-none">{fmt(total)}</span>
                  <span className="text-xs text-gray-400">entries</span>
                </div>
                <div className="space-y-1.5 mt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Approved</span>
                    <span className="font-semibold text-emerald-600">{fmt(approved)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Pending</span>
                    <span className="font-semibold text-amber-500">{fmt(pending)}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Outward */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-orange-50 flex items-center justify-center text-orange-500 font-bold text-xs">↑</div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gate Outward</span>
            </div>
            {loading ? <Skel h={7} w={14} /> : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900 leading-none">{fmt(gate.outwardTotal)}</span>
                  <span className="text-xs text-gray-400">movements</span>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
