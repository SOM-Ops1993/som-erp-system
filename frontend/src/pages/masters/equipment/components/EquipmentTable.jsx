import Pagination from '../../../../components/erp/Pagination.jsx'

export default function EquipmentTable({ items, page, limit, onEdit, onDelete, onPageChange, onLimitChange }) {
  const paginated = items.slice((page - 1) * limit, page * limit)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-gray-700">Equipment Name</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-700">Plant</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={3} className="text-center py-10 text-gray-400">
                No equipment added yet. Click "Add Equipment" to start.
              </td>
            </tr>
          ) : paginated.map(item => (
            <tr key={item.equipId} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{item.equipName}</td>
              <td className="px-4 py-3 text-gray-500">{item.plant || '—'}</td>
              <td className="px-4 py-3 flex gap-2">
                <button onClick={() => onEdit(item)} className="text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50">Edit</button>
                <button onClick={() => onDelete(item.equipId, item.equipName)} className="text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50">Delete</button>
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
