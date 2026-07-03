import { Download, Wrench } from 'lucide-react'
import { Button } from '../../../../../components/ui'
import './ProductSidebar.css'

export default function ProductSidebar({ productList, loading, selectedProduct, prodSearch, onSearchChange, onSelectProduct, onImport, onReconcile }) {
  const filtered = productList.filter(p =>
    !prodSearch ||
    p.productName.toLowerCase().includes(prodSearch.toLowerCase()) ||
    p.productCode.toLowerCase().includes(prodSearch.toLowerCase())
  )

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Products</h2>
        <input
          value={prodSearch}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search product..."
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-xs text-gray-400 px-4 py-3">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-gray-400 px-4 py-3">No products. Add in Product Master.</p>
        ) : filtered.map(p => (
          <button
            key={p.productCode}
            onClick={() => onSelectProduct(p)}
            className={`w-full text-left px-4 py-2.5 border-b border-gray-50 hover:bg-blue-50 transition ${
              selectedProduct?.productCode === p.productCode ? 'bg-blue-600 text-white hover:bg-blue-600' : ''
            }`}
          >
            <div className={`text-sm font-semibold truncate ${selectedProduct?.productCode === p.productCode ? 'text-white' : 'text-gray-800'}`}>
              {p.productName}
            </div>
            <div className={`text-xs font-mono ${selectedProduct?.productCode === p.productCode ? 'text-blue-200' : 'text-gray-400'}`}>
              {p.productCode}
            </div>
          </button>
        ))}
      </div>

      <div className="px-3 py-3 border-t border-gray-100 space-y-2">
        <Button variant="purple" icon={Download} onClick={onImport} fullWidth size="sm">Import from Excel</Button>
        <Button variant="warning" icon={Wrench} onClick={onReconcile} fullWidth size="sm">Fix RM Mapping</Button>
        <p className="text-xs text-gray-400 text-center leading-tight">
          Reconcile recipe RMs that don't match RM Master
        </p>
      </div>
    </aside>
  )
}
