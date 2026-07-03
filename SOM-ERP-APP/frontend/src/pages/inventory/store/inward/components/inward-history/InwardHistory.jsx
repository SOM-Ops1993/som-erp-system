import { useState, useEffect, useMemo } from 'react'
import { packsApi, inwardApi } from '../../../../../../api/inventory.js'
import Pagination from '../../../../../../components/pagination/Pagination.jsx'
import { Button } from '../../../../../../components/ui'
import { RefreshCw } from 'lucide-react'
import './InwardHistory.css'

function groupPacks(packs) {
  const map = new Map()
  for (const p of packs) {
    const key = `${p.itemCode}||${p.lotNo}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        itemCode:     p.itemCode,
        itemName:     p.itemName,
        lotNo:        p.lotNo,
        invoiceNo:    p.invoiceNo,
        supplier:     p.supplier,
        receivedDate: p.receivedDate,
        uom:          p.uom,
        bags:         [],
      })
    }
    map.get(key).bags.push(p)
  }
  for (const g of map.values()) {
    g.bags.sort((a, b) => (a.bagNo || 0) - (b.bagNo || 0))
  }
  // Sort groups by receivedDate descending (most recent first)
  return Array.from(map.values()).sort((a, b) => {
    if (!a.receivedDate && !b.receivedDate) return 0
    if (!a.receivedDate) return 1
    if (!b.receivedDate) return -1
    return new Date(b.receivedDate) - new Date(a.receivedDate)
  })
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function InwardHistory() {
  const [packs, setPacks]           = useState([])
  const [loading, setLoading]       = useState(false)
  const [expandedKeys, setExpandedKeys] = useState(new Set())

  // Filters
  const [searchText, setSearchText]       = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [dateFrom, setDateFrom]           = useState('')
  const [dateTo, setDateTo]               = useState('')
  const [page, setPage]                   = useState(1)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [packsRes, inwardRes] = await Promise.all([
        packsApi.list({ limit: 1000 }),
        inwardApi.history({ limit: 10000 }),
      ])
      // Build packId → warehouse map from inward records
      const warehouseMap = {}
      for (const r of (inwardRes.data || [])) {
        warehouseMap[r.packId] = r.warehouse
      }
      const rawPacks = (packsRes.data || []).filter(p => p.status !== 'AWAITING_INWARD')
      setPacks(rawPacks.map(p => ({ ...p, warehouse: warehouseMap[p.packId] || '' })))
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  const allGroups = useMemo(() => groupPacks(packs), [packs])

  // Unique suppliers for dropdown
  const suppliers = useMemo(() =>
    Array.from(new Set(allGroups.map(g => g.supplier).filter(Boolean))).sort()
  , [allGroups])

  // Apply filters
  const filteredGroups = useMemo(() => {
    return allGroups.filter(g => {
      if (searchText) {
        const q = searchText.toLowerCase()
        if (
          !g.itemName?.toLowerCase().includes(q) &&
          !g.itemCode?.toLowerCase().includes(q) &&
          !g.lotNo?.toLowerCase().includes(q) &&
          !g.invoiceNo?.toLowerCase().includes(q)
        ) return false
      }
      if (supplierFilter && g.supplier !== supplierFilter) return false
      if (dateFrom && g.receivedDate && new Date(g.receivedDate) < new Date(dateFrom)) return false
      if (dateTo  && g.receivedDate && new Date(g.receivedDate) > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
  }, [allGroups, searchText, supplierFilter, dateFrom, dateTo])

  const toggle      = (key) => setExpandedKeys(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  const expandAll   = () => setExpandedKeys(new Set(filteredGroups.map(g => g.key)))
  const collapseAll = () => setExpandedKeys(new Set())

  const hasFilters = searchText || supplierFilter || dateFrom || dateTo
  const clearFilters = () => { setSearchText(''); setSupplierFilter(''); setDateFrom(''); setDateTo(''); setPage(1) }

  useEffect(() => { setPage(1) }, [searchText, supplierFilter, dateFrom, dateTo])

  const totalBags = filteredGroups.reduce((s, g) => s + g.bags.length, 0)
  const [limit, setLimit] = useState(15)
  const paginatedGroups = filteredGroups.slice((page - 1) * limit, page * limit)

  return (
    <div className="p-6">
      {/*  Filters   */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Search item, code, lot, invoice?"
            className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Supplier filter */}
          <select
            value={supplierFilter}
            onChange={e => setSupplierFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 min-w-36"
          >
            <option value="">All Suppliers</option>
            {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {hasFilters && (
            <Button variant="danger" size="sm" onClick={clearFilters}>Clear</Button>
          )}

          <Button variant="outline-gray" size="sm" icon={RefreshCw} onClick={load}>Refresh</Button>
        </div>
      </div>

      {/*  Table    */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Table toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-gray-900">Inward History</h2>
            {!loading && (
              <span className="text-xs text-gray-400">
                {filteredGroups.length} invoices · {totalBags} bags
                {hasFilters && allGroups.length !== filteredGroups.length && (
                  <span className="text-indigo-500 ml-1">(filtered from {allGroups.length})</span>
                )}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="xs" onClick={expandAll}>Expand all</Button>
            <Button variant="outline-gray" size="xs" onClick={collapseAll}>Collapse all</Button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-14">Loading inward history?</p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-700 text-white text-xs">
                <tr>
                  <th className="w-8 px-3 py-2.5" />
                  <th className="text-left px-3 py-2.5 font-semibold">Item</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Lot / Invoice</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Supplier</th>
                  <th className="text-center px-3 py-2.5 font-semibold">Bags</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Total Qty</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Received</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Warehouse(s)</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Print All QRs</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-14 text-gray-400">
                      {hasFilters ? 'No records match your filters.' : 'No inward records found.'}
                    </td>
                  </tr>
                ) : (
                  paginatedGroups.map(g => {
                    const isOpen        = expandedKeys.has(g.key)
                    const totalQty      = g.bags.reduce((s, b) => s + (b.packQty || 0), 0)
                    const groupWarehouses = [...new Set(g.bags.map(b => b.warehouse).filter(Boolean))]

                    return (
                      <>
                        {/*  Main group row  */}
                        <tr key={g.key}
                          onClick={() => toggle(g.key)}
                          className={`border-t border-gray-200 cursor-pointer select-none transition-colors ${
                            isOpen ? 'bg-blue-50 hover:bg-blue-100/60' : 'hover:bg-gray-50'
                          }`}>
                          {/* Toggle */}
                          <td className="px-3 py-3 text-center text-gray-400 text-xs">
                            {isOpen ? '-' : '-'}
                          </td>

                          {/* Item */}
                          <td className="px-3 py-3">
                            <div className="font-semibold text-gray-900">{g.itemName}</div>
                            <div className="text-xs text-gray-400 font-mono mt-0.5">{g.itemCode}</div>
                          </td>

                          {/* Lot / Invoice */}
                          <td className="px-3 py-3">
                            <div className="font-mono text-xs font-semibold text-gray-700">{g.lotNo || '—'}</div>
                            {g.invoiceNo && (
                              <div className="text-xs text-gray-400 mt-0.5">Inv: {g.invoiceNo}</div>
                            )}
                          </td>

                          {/* Supplier */}
                          <td className="px-3 py-3 text-sm text-gray-600">{g.supplier || '—'}</td>

                          {/* Bags */}
                          <td className="px-3 py-3 text-center">
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                              {g.bags.length}
                            </span>
                          </td>

                          {/* Total Qty */}
                          <td className="px-3 py-3 font-semibold text-gray-800">
                            {totalQty % 1 === 0 ? totalQty : totalQty.toFixed(3)}{' '}
                            <span className="text-gray-400 font-normal text-xs">{g.uom}</span>
                          </td>

                          {/* Received */}
                          <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {fmtDate(g.receivedDate)}
                          </td>

                          {/* Warehouse(s) summary */}
                          <td className="px-3 py-3">
                            {groupWarehouses.length === 0 ? (
                              <span className="text-gray-300 text-xs">—</span>
                            ) : groupWarehouses.length === 1 ? (
                              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                {groupWarehouses[0]}
                              </span>
                            ) : (
                              <span className="text-xs text-indigo-600 font-medium" title={groupWarehouses.join(', ')}>
                                {groupWarehouses.length} locations
                              </span>
                            )}
                          </td>

                          {/* Print all QRs */}
                          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                            <a
                              href={packsApi.batchLabelsUrl(g.itemCode, g.lotNo)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition whitespace-nowrap"
                            >Print All ({g.bags.length})
                            </a>
                          </td>
                        </tr>

                        {/* "?"? Bag sub-rows "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"? */}
                        {isOpen && g.bags.map(b => (
                          <tr key={b.packId} className="bg-blue-50/30 border-t border-blue-100/60">
                            <td colSpan={9} className="px-0 py-0">
                              <div className="flex items-center pl-8 pr-3 py-2 gap-0">
                                <div className="w-px h-8 bg-blue-300 mr-4 shrink-0" />
                                <span className="text-xs text-gray-400 w-16 shrink-0">
                                  Bag{' '}
                                  <span className="font-mono font-bold text-gray-700">
                                    #{String(b.bagNo).padStart(3, '0')}
                                  </span>
                                </span>
                                <span className="font-mono text-xs text-blue-700 font-semibold flex-1 min-w-0 truncate mx-4">
                                  {b.packId}
                                </span>
                                <span className="text-xs text-gray-700 w-20 shrink-0">
                                  {b.packQty} {b.uom}
                                </span>
                                {b.warehouse ? (
                                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded w-36 text-center shrink-0 truncate">
                                  {b.warehouse}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-300 w-36 text-center shrink-0">—</span>
                                )}
                                <a
                                  href={packsApi.labelUrl(b.packId)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium ml-4 shrink-0 whitespace-nowrap"
                                >
                                 Label
                                </a>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-3">
            <Pagination page={page} total={filteredGroups.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
          </div>
          </>
        )}
      </div>
    </div>
  )
}
