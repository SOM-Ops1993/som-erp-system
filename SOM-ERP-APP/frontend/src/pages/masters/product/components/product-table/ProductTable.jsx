import { Pencil, Trash2 } from 'lucide-react'
import { IconButton } from '../../../../../components/ui'
import Pagination from '../../../../../components/pagination/Pagination.jsx'

export default function ProductTable({ items, page, limit, onEdit, onDelete, onPageChange, onLimitChange }) {
  const paginated = items.slice((page - 1) * limit, page * limit)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-gray-700">Product Code</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-700">Product Name</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-700">Plant</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center py-10 text-gray-400">
                No products yet. Click "Add New Product" to start.
              </td>
            </tr>
          ) : paginated.map(item => (
            <tr key={item.productCode} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-green-700 font-medium">{item.productCode}</td>
              <td className="px-4 py-3">{item.productName}</td>
              <td className="px-4 py-3 text-gray-500">{item.plant || '—'}</td>
              <td className="px-4 py-3 flex gap-1">
                <IconButton icon={Pencil} tooltip="Edit" onClick={() => onEdit(item)} />
                <IconButton icon={Trash2} variant="danger" tooltip="Delete" onClick={() => onDelete(item.productCode)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 pb-3">
        <Pagination page={page} total={items.length} limit={limit} onChange={onPageChange} onLimitChange={onLimitChange} />
      </div>
    </div>
  )
}
