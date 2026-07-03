import { fmt } from '../utils.js'
import { Skel, SLabel } from '../shared/shared.jsx'
import './RawMaterialsSection.css'

function StatCard({ dot, label, value, sub, subColor = 'text-gray-400', loading }) {
  const dc = { indigo: 'bg-indigo-500', green: 'bg-emerald-500', red: 'bg-red-400' }
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dc[dot] ?? 'bg-gray-400'}`} />
        <span className="text-xs font-medium text-gray-400 tracking-wide">{label}</span>
      </div>
      {loading ? <Skel h={7} w={16} /> : (
        <>
          <span className="text-2xl font-bold text-gray-900 leading-none">{value}</span>
          {sub && <span className={`text-xs ${subColor}`}>{sub}</span>}
        </>
      )}
    </div>
  )
}

export default function RawMaterialsSection({ rm, loading }) {
  return (
    <div>
      <SLabel>Raw Materials · Current Snapshot</SLabel>
      <div className="grid grid-cols-3 gap-3">
        <StatCard dot="indigo" label="Total RM Items"
          value={fmt(rm.totalItems)} sub="registered in system" loading={loading} />
        <StatCard dot="green" label="Items in Stock"
          value={fmt(rm.inStock)} sub="have available quantity" subColor="text-emerald-600" loading={loading} />
        <StatCard dot="red" label="Out of Stock"
          value={fmt(rm.outOfStock)} sub="need replenishment" subColor="text-red-500" loading={loading} />
      </div>
    </div>
  )
}
