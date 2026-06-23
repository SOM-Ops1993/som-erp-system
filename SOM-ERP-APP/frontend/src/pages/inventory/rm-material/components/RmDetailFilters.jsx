export default function RmDetailFilters({ search, supplierFilter, statusFilter, dateFrom, dateTo, suppliers, hasFilters, onChange, onClear, onRefresh }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={search}
          onChange={e => onChange('search', e.target.value)}
          placeholder="Search lot, invoice, supplier…"
          className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
        />
        <select value={supplierFilter} onChange={e => onChange('supplier', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 min-w-36 bg-white">
          <option value="">All Suppliers</option>
          {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={statusFilter} onChange={e => onChange('status', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 min-w-36 bg-white">
          <option value="">All Statuses</option>
          <option value="INWARDED">Inwarded</option>
          <option value="PARTIALLY_ISSUED">Partially Used</option>
          <option value="EXHAUSTED">Exhausted</option>
          <option value="AWAITING_INWARD">Awaiting Inward</option>
        </select>
        <div className="flex items-center gap-1.5">
          <input type="date" value={dateFrom} onChange={e => onChange('dateFrom', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          <span className="text-gray-400 text-xs">to</span>
          <input type="date" value={dateTo} onChange={e => onChange('dateTo', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        {hasFilters && (
          <button onClick={onClear} className="text-sm text-red-500 hover:text-red-700 px-3 py-2 border border-red-200 rounded-lg hover:bg-red-50">
            × Clear
          </button>
        )}
        <button onClick={onRefresh} className="text-sm border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50">
          ↻ Refresh
        </button>
      </div>
    </div>
  )
}
