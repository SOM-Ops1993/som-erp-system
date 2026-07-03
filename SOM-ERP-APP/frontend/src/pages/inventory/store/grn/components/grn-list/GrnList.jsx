import './GrnList.css'

export default function GrnList({ list, loading, search, selected, onSearch, onSelect, fmtDate }) {
  return (
    <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b bg-gray-50 sticky top-0 z-10">
        <h2 className="font-bold text-gray-900 text-sm mb-2">Goods Received Notes</h2>
        <input
          type="text"
          placeholder="Search by item, invoice, supplier…"
          value={search}
          onChange={e => onSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
      ) : list.length === 0 ? (
        <div className="p-6 text-center text-gray-400 text-sm">
          No GRNs yet. Add Invoice No to packs in Print Master first.
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {list.map(grn => (
            <button
              key={grn.grnKey}
              onClick={() => onSelect(grn)}
              className={`w-full text-left px-5 py-3.5 transition hover:bg-indigo-50
                ${selected?.grnKey === grn.grnKey ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{grn.invoiceNo}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{grn.supplier}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                  {grn.totalPacks} bags
                </span>
              </div>
              <div className="flex gap-3 text-xs text-gray-400 mt-1.5">
                <span>{grn.uniqueItems} item{grn.uniqueItems !== 1 ? 's' : ''}</span>
                <span>·</span>
                <span>{grn.receivedDate ? fmtDate(grn.receivedDate) : fmtDate(grn.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
