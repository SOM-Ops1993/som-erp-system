import { useState, useEffect } from 'react'
import { stockApi } from '../api/client.js'

export default function Stock() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    try { setLoading(true); const r = await stockApi.summary({ search }); setData(r.data || []) }
    catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search])

  const total = data.reduce((a, d) => a + d.totalStock, 0)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time inventory across all raw materials</p>
        </div>
        <button onClick={load} className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm">🔄 Refresh</button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-900">{data.length}</div>
          <div className="text-sm text-blue-700">Total RM Items</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-900">{data.filter(d => d.totalStock > 0).length}</div>
          <div className="text-sm text-green-700">Items In Stock</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-orange-900">{data.filter(d => d.totalStock === 0).length}</div>
          <div className="text-sm text-orange-700">Out of Stock</div>
        </div>
      </div>

      <div className="mb-4">
        <input type="text" placeholder="Search item..." value={search} onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 w-80 outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {loading ? <p className="text-gray-400">Loading stock...</p> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Item Code</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Item Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">UOM</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">In Packs</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Active Packs</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">In Container</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Total Stock</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                  No stock data found. Add RM in RM Master, generate packs in Print Master, then inward them.
                </td></tr>
              ) : data.map(d => (
                <tr key={d.itemCode} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-blue-700">{d.itemCode}</td>
                  <td className="px-4 py-3 font-medium">{d.itemName}</td>
                  <td className="px-4 py-3 text-gray-500">{d.uom}</td>
                  <td className="px-4 py-3 text-right">{d.stockInPacks.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-blue-700">{d.activePacks}</td>
                  <td className="px-4 py-3 text-right text-purple-700">{d.stockInContainer.toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${d.totalStock > 0 ? 'text-green-700' : 'text-red-500'}`}>{d.totalStock.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
