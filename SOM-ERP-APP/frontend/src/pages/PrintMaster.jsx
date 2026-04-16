import { useState, useEffect } from 'react'
import { packsApi, rmApi } from '../api/client.js'

const today = () => new Date().toISOString().split('T')[0]

export default function PrintMaster() {
  const [rmList, setRmList] = useState([])
  const [form, setForm] = useState({ itemCode: '', itemName: '', uom: '', numberOfBags: '', packQty: '', supplier: '', invoiceNo: '', receivedDate: today() })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [packs, setPacks] = useState([])
  const [packsLoading, setPacksLoading] = useState(false)
  const [filterCode, setFilterCode] = useState('')
  const [nextLot, setNextLot] = useState('')
  const [rmSearch, setRmSearch] = useState('')
  const [showRmDrop, setShowRmDrop] = useState(false)

  useEffect(() => { loadRm() }, [])

  const loadRm = async () => {
    try { const r = await rmApi.list({}); setRmList(r.data || []) } catch (e) { console.error(e) }
  }

  const filteredRm = rmList.filter(r =>
    !rmSearch || r.itemName.toLowerCase().includes(rmSearch.toLowerCase()) || r.itemCode.toLowerCase().includes(rmSearch.toLowerCase())
  )

  const selectRm = async (rm) => {
    setForm(f => ({ ...f, itemCode: rm.itemCode, itemName: rm.itemName, uom: rm.uom }))
    setRmSearch(rm.itemName)
    setShowRmDrop(false)
    try { const r = await packsApi.nextLot(rm.itemCode); setNextLot(r.data?.lotNo || '') } catch {}
  }

  const loadPacks = async () => {
    try {
      setPacksLoading(true)
      const r = await packsApi.list({ itemCode: filterCode || undefined, limit: 100 })
      setPacks(r.data || [])
    } catch {} finally { setPacksLoading(false) }
  }

  useEffect(() => { loadPacks() }, [filterCode])

  const generate = async (e) => {
    e.preventDefault()
    if (!form.itemCode) { setError('Please select an RM first'); return }
    if (!form.numberOfBags || !form.packQty) { setError('Number of bags and qty per bag are required'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await packsApi.generate({ ...form, numberOfBags: parseInt(form.numberOfBags), packQty: parseFloat(form.packQty) })
      setResult(res.data)
      setForm(f => ({ ...f, itemCode: '', itemName: '', uom: '', numberOfBags: '', packQty: '', supplier: '', invoiceNo: '', receivedDate: today() }))
      setRmSearch(''); setNextLot('')
      loadPacks()
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  const statusColor = (s) => ({
    AWAITING_INWARD: 'bg-yellow-100 text-yellow-800',
    INWARDED: 'bg-blue-100 text-blue-800',
    PARTIALLY_ISSUED: 'bg-orange-100 text-orange-800',
    EXHAUSTED: 'bg-gray-100 text-gray-500'
  }[s] || 'bg-gray-100 text-gray-600')

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Print Master — Generate Pack Labels</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Generate New Packs</h2>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-3 text-sm">{error}</div>}
          {result && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded mb-3 text-sm">
              ✅ Generated {result.packs?.length} packs — Lot: <strong>{result.lotNo}</strong>
              <br />
              <a href={packsApi.batchLabelsUrl(result.packs?.[0]?.itemCode, result.lotNo)} target="_blank"
                className="text-blue-600 underline mt-1 block">🖨️ Print All Labels for Lot {result.lotNo}</a>
            </div>
          )}
          <form onSubmit={generate} className="space-y-3">
            {/* RM Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Item *</label>
              <input value={rmSearch}
                onChange={e => { setRmSearch(e.target.value); setShowRmDrop(true); setForm(f => ({ ...f, itemCode: '', itemName: '' })) }}
                onFocus={() => setShowRmDrop(true)}
                placeholder="Type to search RM..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
              {showRmDrop && filteredRm.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {filteredRm.map(rm => (
                    <button type="button" key={rm.itemCode} onClick={() => selectRm(rm)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm">
                      <span className="font-medium">{rm.itemName}</span>
                      <span className="text-gray-400 ml-2 text-xs">({rm.itemCode})</span>
                    </button>
                  ))}
                </div>
              )}
              {rmList.length === 0 && <p className="text-xs text-orange-600 mt-1">No items found. Add items in Item Master first.</p>}
            </div>

            {form.itemCode && (
              <div className="bg-blue-50 px-3 py-2 rounded-lg text-sm">
                <span className="font-medium text-blue-900">Selected:</span> {form.itemName} ({form.itemCode}) — {form.uom}
                {nextLot && <span className="ml-2 text-blue-600">| Next Lot: <strong>{nextLot}</strong></span>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Bags *</label>
                <input type="number" min="1" value={form.numberOfBags}
                  onChange={e => setForm(f => ({ ...f, numberOfBags: e.target.value }))}
                  placeholder="20"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qty per Bag ({form.uom || 'KG'}) *</label>
                <input type="number" step="0.01" value={form.packQty}
                  onChange={e => setForm(f => ({ ...f, packQty: e.target.value }))}
                  placeholder="25"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                placeholder="Supplier name (optional)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice No</label>
                <input value={form.invoiceNo} onChange={e => setForm(f => ({ ...f, invoiceNo: e.target.value }))}
                  placeholder="INV-2026-001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Received Date</label>
                <input type="date" value={form.receivedDate}
                  onChange={e => setForm(f => ({ ...f, receivedDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold text-lg disabled:opacity-50">
              {loading ? 'Generating...' : '🖨️ Generate Pack IDs'}
            </button>
          </form>
        </div>

        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-3 text-slate-800">How It Works</h2>
          <ol className="space-y-3 text-sm text-slate-700">
            {['Select the item from Item Master', 'Enter number of bags received and qty per bag', 'System auto-generates unique Pack IDs and Lot No', 'Click Print Labels to download PDF for all bags', 'Stick labels on bags, then go to Inward to scan them in'].map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs font-bold">{i+1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            Pack ID format: <strong>LBL-ITEMCODE-YEAR-LOTSEQ-BAGNO</strong><br />
            Example: <strong>CIT-151464-2026-001-001</strong>
          </div>
        </div>
      </div>

      {/* Pack list */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Pack Records</h2>
          <input value={filterCode} onChange={e => setFilterCode(e.target.value)}
            placeholder="Filter by item code..."
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-48" />
        </div>
        {packsLoading ? <p className="text-gray-400 py-4">Loading...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['Pack ID','Item','Lot','Bag','Qty','Supplier','Received','Status','Label'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-gray-700">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {packs.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">No packs found</td></tr>
                ) : packs.map(p => (
                  <tr key={p.packId} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-blue-700">{p.packId}</td>
                    <td className="px-3 py-2 text-xs">{p.itemName}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{p.lotNo}</td>
                    <td className="px-3 py-2 text-center">{String(p.bagNo).padStart(3,'0')}</td>
                    <td className="px-3 py-2">{p.packQty} {p.uom}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{p.supplier || '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{p.receivedDate ? new Date(p.receivedDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(p.status)}`}>{p.status}</span></td>
                    <td className="px-3 py-2">
                      <a href={packsApi.labelUrl(p.packId)} target="_blank" className="text-blue-600 hover:text-blue-800 text-xs font-medium">🖨️ Print</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
