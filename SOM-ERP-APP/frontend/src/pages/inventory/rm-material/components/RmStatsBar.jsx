export default function RmStatsBar({ items }) {
  const inStockCount    = items.filter(i => i.totalStock  > 0).length
  const outOfStockCount = items.filter(i => i.totalStock <= 0).length

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="text-xs font-medium text-gray-400 mb-1.5">Total Items</div>
        <div className="text-3xl font-bold text-gray-900">{items.length}</div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="text-xs font-medium text-gray-400 mb-1.5">In Stock</div>
        <div className="text-3xl font-bold text-emerald-600">{inStockCount}</div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="text-xs font-medium text-gray-400 mb-1.5">Out of Stock</div>
        <div className="text-3xl font-bold text-red-500">{outOfStockCount}</div>
      </div>
    </div>
  )
}
