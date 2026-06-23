const STATUS_BADGE = {
  OPEN:          'bg-blue-100 text-blue-800',
  PARTIAL:       'bg-orange-100 text-orange-800',
  COMPLETE:      'bg-green-100 text-green-800',
  CLOSED:        'bg-gray-100 text-gray-600',
  PENDING_STOCK: 'bg-red-100 text-red-700',
}

export default function IndentCard({ indent, selected, setSelected }) {
  const isSelected = selected?.indentId === indent.indentId

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${indent.status === 'PENDING_STOCK' ? 'border-red-300' : 'border-gray-200'}`}>
      <div
        className="flex items-start justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition"
        onClick={() => setSelected(isSelected ? null : indent)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-gray-900">{indent.indentId}</span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_BADGE[indent.status] || 'bg-gray-100 text-gray-600'}`}>
              {indent.status}
            </span>
          </div>
          <div className="text-sm text-gray-700 mt-1 font-medium">{indent.productName}</div>
          <div className="flex gap-4 mt-1.5 text-xs text-gray-400 flex-wrap">
            <span>Batch: <strong className="text-gray-600">{indent.batchNo}</strong></span>
            <span>Size: <strong className="text-gray-600">{indent.batchSize}</strong></span>
            {indent.diNo && <span>DI: <strong className="text-gray-600">{indent.diNo}</strong></span>}
            {indent.plant && <span>Plant: <strong className="text-gray-600">{indent.plant}</strong></span>}
            {indent.equipment && <span>Equip: <strong className="text-gray-600">{indent.equipment}</strong></span>}
          </div>
        </div>
        <div className="text-xs text-gray-400 ml-4 shrink-0 text-right">
          <div>{new Date(indent.createdAt).toLocaleDateString('en-IN')}</div>
          <div className="mt-1">{isSelected ? '▲ Hide' : '▼ Details'}</div>
        </div>
      </div>

      {isSelected && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
          {indent.items && indent.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-200">
                    <th className="text-left py-2 pr-4">RM Item</th>
                    <th className="text-left py-2 pr-4">Code</th>
                    <th className="text-right py-2 pr-4">Required Qty</th>
                    <th className="text-center py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {indent.items.map((item, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-4 font-medium text-gray-700">{item.rmName}</td>
                      <td className="py-2 pr-4 font-mono text-blue-600">{item.rmCode}</td>
                      <td className="py-2 pr-4 text-right">{Number(item.requiredQty).toFixed(3)}</td>
                      <td className="py-2 text-center">
                        {item.issued
                          ? <span className="text-green-600 font-bold">✓ Issued</span>
                          : <span className="text-orange-500">Pending</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-400">No item details available.</p>
          )}
        </div>
      )}
    </div>
  )
}
