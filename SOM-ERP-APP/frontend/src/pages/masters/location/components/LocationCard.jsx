import { bulkApi } from '../../../../api/inventory.js'

const STATUS_COLOR = {
  ACTIVE:    'bg-green-100 text-green-800',
  EXHAUSTED: 'bg-gray-100 text-gray-500',
}

const totalActive = (loc) =>
  (loc.lotEntries || []).filter(e => e.status === 'ACTIVE').reduce((s, e) => s + e.remainingQty, 0)

export default function LocationCard({ loc, isOpen, onToggle, onDelete }) {
  const activeQty  = totalActive(loc)
  const activeLots = (loc.lotEntries || []).filter(e => e.status === 'ACTIVE')

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${isOpen ? 'border-green-400 ring-1 ring-green-200' : 'border-gray-200'}`}>
      {/* Card header row */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="bg-green-100 text-green-700 rounded-lg px-3 py-1.5 font-mono font-bold text-sm flex-shrink-0">
            {loc.locationId}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900">{loc.locationName}</div>
            <div className="text-sm text-gray-500">
              {loc.itemName} <span className="font-mono text-xs text-blue-600">[{loc.itemCode}]</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">{activeQty.toFixed(2)}</div>
            <div className="text-xs text-gray-400">{loc.uom} in stock</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-700">{activeLots.length}</div>
            <div className="text-xs text-gray-400">active lots</div>
          </div>
          <a
            href={bulkApi.locationLabelUrl(loc.locationId)}
            target="_blank"
            onClick={e => e.stopPropagation()}
            className="border border-green-300 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-50"
          >
            🖨️ Print QR
          </a>
          <button
            onClick={e => { e.stopPropagation(); onDelete(loc.locationId) }}
            className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50"
          >
            Del
          </button>
          <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded lot entries */}
      {isOpen && (
        <div className="border-t border-gray-100 px-5 py-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
            Lot Entries at this Location
          </h3>
          {(loc.lotEntries || []).length === 0 ? (
            <p className="text-sm text-gray-400 italic">No lots yet. Do a Bulk Inward to receive stock here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Lot No</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Supplier</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Invoice</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Received</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Rcvd Qty</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Remaining</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(loc.lotEntries || []).map(entry => (
                    <tr key={entry.id} className={`border-t border-gray-50 ${entry.status === 'EXHAUSTED' ? 'opacity-50' : ''}`}>
                      <td className="px-3 py-2 font-mono text-xs text-blue-700 font-semibold">{entry.lotNo}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{entry.supplier || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{entry.invoiceNo || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {entry.receivedDate ? new Date(entry.receivedDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-sm">{entry.receivedQty} {loc.uom}</td>
                      <td className={`px-3 py-2 text-right text-sm font-semibold ${entry.remainingQty > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                        {entry.remainingQty} {loc.uom}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[entry.status] || 'bg-gray-100 text-gray-600'}`}>
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-xs text-gray-500 font-semibold">Total Active Stock</td>
                    <td className="px-3 py-2 text-right text-sm font-bold text-green-700">{activeQty.toFixed(2)} {loc.uom}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
