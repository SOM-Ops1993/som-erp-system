import { Pencil, Trash2 } from 'lucide-react'
import { IconButton } from '../../../../../components/ui'
import './RmTable.css'
import Pagination from '../../../../../components/pagination/Pagination.jsx'

const TRACKING_BADGE = {
  PACK: 'bg-blue-100 text-blue-700',
  BULK: 'bg-green-100 text-green-700',
}

export default function RmTable({ items, visibleItems, page, limit, search, filterType, onSearch, onFilterType, onEdit, onDelete, onPageChange, onLimitChange }) {
  const paginated = visibleItems.slice((page - 1) * limit, page * limit)

  return (
    <>
      {/* Filter bar */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or code..."
          value={search}
          onChange={e => onSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 w-72 focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <div className="flex border border-gray-300 rounded-lg overflow-hidden">
          {['ALL', 'PACK', 'BULK'].map(t => (
            <button key={t} onClick={() => onFilterType(t)}
              className={`px-4 py-2 text-sm font-medium transition ${filterType === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Item Code</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Item Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">UOM</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Tracking Type</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Added On</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  No items found. Click "Add New Item" to start.
                </td>
              </tr>
            ) : paginated.map(item => (
              <tr key={item.itemCode} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-blue-700 font-medium">{item.itemCode}</td>
                <td className="px-4 py-3">{item.itemName}</td>
                <td className="px-4 py-3">
                  <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700">{item.uom}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TRACKING_BADGE[item.trackingType || 'PACK']}`}>
                    {item.trackingType || 'PACK'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(item.createdAt).toLocaleDateString('en-IN')}
                </td>
                <td className="px-4 py-3 flex gap-1">
                  <IconButton icon={Pencil} tooltip="Edit" onClick={() => onEdit(item)} />
                  <IconButton icon={Trash2} variant="danger" tooltip="Delete" onClick={() => onDelete(item.itemCode)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-4 py-2.5 bg-gray-50 border-t text-xs text-gray-400">
          {items.length} total items
          · {items.filter(i => (i.trackingType || 'PACK') === 'PACK').length} PACK
          · {items.filter(i => i.trackingType === 'BULK').length} BULK
        </div>
        <div className="px-4 pb-3">
          <Pagination page={page} total={visibleItems.length} limit={limit} onChange={onPageChange} onLimitChange={onLimitChange} />
        </div>
      </div>
    </>
  )
}
