import './RmFilterBar.css'
import { Button } from '../../../../../components/ui'

export default function RmFilterBar({ search, stockFilter, onSearch, onStockFilter, onClear }) {
  const hasFilter = search || stockFilter !== 'all'

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-56">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search by raw material name or code…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
        />
      </div>
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'all',          label: 'All'          },
          { key: 'in_stock',     label: 'In Stock'     },
          { key: 'out_of_stock', label: 'Out of Stock' },
        ].map(f => (
          <button key={f.key} onClick={() => onStockFilter(f.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              stockFilter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {f.label}
          </button>
        ))}
      </div>
      {hasFilter && (
        <Button variant="danger" size="xs" onClick={onClear}>Clear</Button>
      )}
    </div>
  )
}
