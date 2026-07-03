import './RmMaterialDetail.css'
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { stockApi } from '../../../api/inventory.js'
import { BackButton, IconButton } from '../../../components/ui'
import RmDetailFilters   from './components/rm-detail-filters/RmDetailFilters.jsx'
import RmDetailTable     from './components/rm-detail-table/RmDetailTable.jsx'
import { groupPacks, groupStatus } from './components/rmDetailHelpers.js'
import  { RefreshCw } from 'lucide-react'

function fmtQty(n) {
  if (n == null) return '—'
  const v = Number(n)
  if (isNaN(v)) return '—'
  return v % 1 === 0 ? v.toLocaleString('en-IN') : v.toLocaleString('en-IN', { maximumFractionDigits: 3 })
}

export default function RmMaterialDetail() {
  const { itemCode } = useParams()
  const navigate     = useNavigate()

  const [rm,      setRm]      = useState(null)
  const [packs,   setPacks]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  // Filters
  const [search,         setSearch]         = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [statusFilter,   setStatusFilter]   = useState('')
  const [dateFrom,       setDateFrom]       = useState('')
  const [dateTo,         setDateTo]         = useState('')

  // Expand
  const [expanded, setExpanded] = useState(new Set())
  const [page,  setPage]  = useState(1)
  const [limit, setLimit] = useState(15)

  useEffect(() => { load() }, [itemCode])
  useEffect(() => { setPage(1) }, [search, supplierFilter, statusFilter, dateFrom, dateTo])

  const load = async () => {
    setLoading(true); setError('')
    try {
      const r = await stockApi.rmHistory(itemCode)
      setRm(r.data.rm)
      setPacks(r.data.packs || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const allGroups = useMemo(() => groupPacks(packs), [packs])

  const suppliers = useMemo(() =>
    Array.from(new Set(allGroups.map(g => g.supplier).filter(Boolean))).sort()
  , [allGroups])

  const filteredGroups = useMemo(() =>
    allGroups.filter(g => {
      if (search) {
        const q = search.toLowerCase()
        if (!g.lotNo?.toLowerCase().includes(q) && !g.invoiceNo?.toLowerCase().includes(q) && !g.supplier?.toLowerCase().includes(q)) return false
      }
      if (supplierFilter && g.supplier !== supplierFilter) return false
      if (statusFilter && groupStatus(g.bags) !== statusFilter) return false
      if (dateFrom && g.receivedDate && new Date(g.receivedDate) < new Date(dateFrom)) return false
      if (dateTo   && g.receivedDate && new Date(g.receivedDate) > new Date(dateTo + 'T23:59:59')) return false
      return true
    }),
    [allGroups, search, supplierFilter, statusFilter, dateFrom, dateTo]
  )

  const paginatedGroups = filteredGroups.slice((page - 1) * limit, page * limit)
  const hasFilters      = !!(search || supplierFilter || statusFilter || dateFrom || dateTo)
  const totalBags       = filteredGroups.reduce((s, g) => s + g.bags.length, 0)

  const totalQtyReceived = packs.reduce((s, p) => s + (Number(p.packQty) || 0), 0)
  const totalRemaining   = packs.reduce((s, p) => s + (p.remainingQty != null ? Number(p.remainingQty) : 0), 0)
  const totalUsed        = totalQtyReceived - totalRemaining

  const handleFilterChange = (field, value) => {
    if (field === 'search')   setSearch(value)
    if (field === 'supplier') setSupplierFilter(value)
    if (field === 'status')   setStatusFilter(value)
    if (field === 'dateFrom') setDateFrom(value)
    if (field === 'dateTo')   setDateTo(value)
  }
  const clearFilters = () => { setSearch(''); setSupplierFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); setPage(1) }

  const toggle      = (key) => setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  const expandAll   = ()    => setExpanded(new Set(filteredGroups.map(g => g.key)))
  const collapseAll = ()    => setExpanded(new Set())

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-7">
        {/* Header */}
        <div className="flex justify-between items-start mb-7">
          <div>
            <BackButton onClick={() => navigate('/rm-material')} label="Raw Materials" size="sm" />
            {loading ? (
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            ) : (
              <>
                <h1 className="text-xl font-bold text-gray-900">{rm?.itemName ?? itemCode}</h1>
                <p className="text-xs text-gray-400 mt-0.5">{rm?.itemCode} · {rm?.uom} · Complete inward history</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <IconButton icon={RefreshCw} onClick={load} tooltip="Refresh" variant="outline-gray" size="sm" />
            <BackButton />
          </div>
        </div>

        {error && <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">{error}</div>}

        {/* Summary stats */}
        {!loading && packs.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <div className="text-xs font-medium text-gray-400 mb-1.5">Total Received</div>
              <div className="text-2xl font-bold text-gray-900">{fmtQty(totalQtyReceived)}</div>
              <div className="text-xs text-gray-400 mt-0.5">{rm?.uom} · {packs.length} bags</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <div className="text-xs font-medium text-gray-400 mb-1.5">Currently Available</div>
              <div className="text-2xl font-bold text-emerald-600">{fmtQty(totalRemaining)}</div>
              <div className="text-xs text-gray-400 mt-0.5">{rm?.uom} remaining</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <div className="text-xs font-medium text-gray-400 mb-1.5">Total Consumed</div>
              <div className="text-2xl font-bold text-gray-700">{fmtQty(totalUsed)}</div>
              <div className="text-xs text-gray-400 mt-0.5">{rm?.uom} used</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <div className="text-xs font-medium text-gray-400 mb-2">Overall Usage</div>
              <div className="text-2xl font-bold text-gray-900">
                {totalQtyReceived > 0 ? Math.round((totalUsed / totalQtyReceived) * 100) : 0}%
              </div>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-700 rounded-full transition-all"
                  style={{ width: `${totalQtyReceived > 0 ? Math.min(100, (totalUsed / totalQtyReceived) * 100) : 0}%` }} />
              </div>
            </div>
          </div>
        )}

        <RmDetailFilters
          search={search}
          supplierFilter={supplierFilter}
          statusFilter={statusFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          suppliers={suppliers}
          hasFilters={hasFilters}
          onChange={handleFilterChange}
          onClear={clearFilters}
          onRefresh={load}
        />

        <RmDetailTable
          loading={loading}
          filteredGroups={filteredGroups}
          paginatedGroups={paginatedGroups}
          allGroups={allGroups}
          hasFilters={hasFilters}
          expanded={expanded}
          onToggle={toggle}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
          totalBags={totalBags}
          uom={rm?.uom}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={l => { setLimit(l); setPage(1) }}
        />
      </div>
    </div>
  )
}
