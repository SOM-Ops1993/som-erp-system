import { fmt } from '../utils.js'
import { Skel, SLabel } from '../shared/shared.jsx'
import './SalesSection.css'

const ROWS = (so) => [
  { label: 'Total Orders',     value: so.total,           color: 'text-gray-900',    pill: null },
  { label: 'Pending Items',    value: so.pendingItems,    color: 'text-amber-600',   pill: { text: 'Pending',   cls: 'bg-amber-50 text-amber-600 border-amber-200'      } },
  { label: 'Dispatched Items', value: so.dispatchedItems, color: 'text-emerald-700', pill: { text: 'Fulfilled', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' } },
]

const ACCENT = {
  'text-gray-900':    'bg-gray-300',
  'text-amber-600':   'bg-amber-400',
  'text-emerald-700': 'bg-emerald-500',
}

export default function SalesSection({ so, dis, loading, label }) {
  const rows = ROWS(so)

  return (
    <div>
      <SLabel>Sales & Dispatch · {label}</SLabel>
      <div className="grid grid-cols-3 gap-3">

        {/* Row list card */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-100">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Sales Orders</span>
          </div>
          {rows.map((r, i) => (
            <div key={r.label}
              className={`flex items-center gap-3 px-4 py-2.5 ${i < rows.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <div className={`w-0.5 h-7 rounded-full flex-shrink-0 ${ACCENT[r.color]}`} />
              <span className="flex-1 text-xs text-gray-600 font-medium">{r.label}</span>
              {r.pill && (
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${r.pill.cls}`}>
                  {r.pill.text}
                </span>
              )}
              {loading
                ? <Skel h={5} w={8} />
                : <span className={`text-base font-bold ${r.color}`}>{fmt(r.value)}</span>
              }
            </div>
          ))}
        </div>

        {/* Dispatch number card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Dispatches</p>
            <p className="text-xs text-gray-400 mt-0.5">shipments created</p>
          </div>
          {loading
            ? <Skel h={10} w={16} />
            : <div className="text-4xl font-bold text-teal-600 leading-none py-2">{fmt(dis.total)}</div>
          }
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 bg-teal-50 rounded-lg flex items-center justify-center text-sm">🚚</div>
            <span className="text-xs text-gray-400">total dispatched</span>
          </div>
        </div>

      </div>
    </div>
  )
}
