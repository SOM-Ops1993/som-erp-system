import { useState, useEffect, useMemo } from 'react'
import { stockApi } from '../../../api/inventory.js'
import BackButton    from '../../../components/erp/BackButton.jsx'
import RmStatsBar    from './components/RmStatsBar.jsx'
import RmFilterBar   from './components/RmFilterBar.jsx'
import RmTable       from './components/RmTable.jsx'

export default function RmMaterial() {
  const [items,       setItems]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [search,      setSearch]      = useState('')
  const [stockFilter, setStockFilter] = useState('all')
  const [page,        setPage]        = useState(1)
  const [limit,       setLimit]       = useState(15)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true); setError('')
    try {
      const r = await stockApi.summary()
      setItems(r.data || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const filtered = useMemo(() =>
    items.filter(it => {
      if (search) {
        const q = search.toLowerCase()
        if (!it.itemName?.toLowerCase().includes(q) && !it.itemCode?.toLowerCase().includes(q)) return false
      }
      if (stockFilter === 'in_stock'     && it.totalStock <= 0) return false
      if (stockFilter === 'out_of_stock' && it.totalStock  > 0) return false
      return true
    }),
    [items, search, stockFilter]
  )

  const paginated = filtered.slice((page - 1) * limit, page * limit)

  const handleSearch = (v) => { setSearch(v); setPage(1) }
  const handleFilter = (f) => { setStockFilter(f); setPage(1) }
  const handleClear  = ()  => { setSearch(''); setStockFilter('all'); setPage(1) }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-7">
        <div className="flex justify-between items-start mb-7">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Raw Materials</h1>
            <p className="text-xs text-gray-400 mt-0.5">Stock overview · {items.length} items registered</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition text-lg"
              title="Refresh">↻</button>
            <BackButton />
          </div>
        </div>

        {!loading && <RmStatsBar items={items} />}

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">{error}</div>
        )}

        <RmFilterBar
          search={search}
          stockFilter={stockFilter}
          onSearch={handleSearch}
          onStockFilter={handleFilter}
          onClear={handleClear}
        />

        <RmTable
          loading={loading}
          items={items}
          filtered={filtered}
          paginated={paginated}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={l => { setLimit(l); setPage(1) }}
        />
      </div>
    </div>
  )
}
