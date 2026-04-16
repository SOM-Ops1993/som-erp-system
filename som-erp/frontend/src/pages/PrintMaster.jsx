import { useState, useEffect } from 'react'
import { packsApi, rmApi } from '../api/client'
import { QrCode, Printer, Package, ChevronDown, Info } from 'lucide-react'

export default function PrintMaster() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({
    itemCode: '', numBags: '', packQty: '', uom: 'Kg',
    supplier: '', invoiceNo: '', supplierBatch: '', receivedDate: '', remarks: '',
  })
  const [nextLot, setNextLot] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => { rmApi.list().then((r) => setItems(r.data || [])) }, [])

  const handleItemChange = async (itemCode) => {
    setForm((f) => ({ ...f, itemCode }))
    setNextLot(null)
    setResult(null)
    if (itemCode) {
      try {
        const r = await packsApi.nextLot(itemCode)
        setNextLot(r.nextLotNo)
        const item = items.find((i) => i.itemCode === itemCode)
        if (item) setForm((f) => ({ ...f, uom: item.uom }))
      } catch {}
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const res = await packsApi.generate(form)
      setResult(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedItem = items.find((i) => i.itemCode === form.itemCode)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <QrCode size={24} className="text-primary" />
        <h1 className="text-xl font-bold text-primary">Print Master — Generate Pack QR Labels</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {/* Item selection */}
        <div>
          <label className="label">Raw Material *</label>
          <select
            className="input"
            value={form.itemCode}
            onChange={(e) => handleItemChange(e.target.value)}
            required
          >
            <option value="">— Select Item —</option>
            {items.map((i) => (
              <option key={i.itemCode} value={i.itemCode}>
                {i.itemName} [{i.itemCode}]
              </option>
            ))}
          </select>
        </div>

        {/* Auto-generated lot info */}
        {nextLot && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-sm">
            <Info size={15} className="text-blue-500 shrink-0" />
            <span className="text-blue-700">
              System will auto-assign <strong>Lot No: {nextLot}</strong> to this batch
            </span>
          </div>
        )}

        {/* Number of bags + qty */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Number of Bags *</label>
            <input
              type="number" min="1" max="999" className="input"
              placeholder="e.g. 20"
              value={form.numBags}
              onChange={(e) => setForm((f) => ({ ...f, numBags: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Qty per Bag * ({form.uom})</label>
            <input
              type="number" step="0.001" min="0.001" className="input"
              placeholder="e.g. 25"
              value={form.packQty}
              onChange={(e) => setForm((f) => ({ ...f, packQty: e.target.value }))}
              required
            />
          </div>
        </div>

        {/* Supplier details */}
        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Supplier Information (recommended for traceability)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Supplier Name</label>
              <input type="text" className="input" placeholder="e.g. DBS Chemicals"
                value={form.supplier}
                onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} />
            </div>
            <div>
              <label className="label">Invoice No.</label>
              <input type="text" className="input" placeholder="e.g. INV-2026-001"
                value={form.invoiceNo}
                onChange={(e) => setForm((f) => ({ ...f, invoiceNo: e.target.value }))} />
            </div>
            <div>
              <label className="label">Supplier Batch Code</label>
              <input type="text" className="input" placeholder="e.g. 1225010602"
                value={form.supplierBatch}
                onChange={(e) => setForm((f) => ({ ...f, supplierBatch: e.target.value }))} />
            </div>
            <div>
              <label className="label">Received Date</label>
              <input type="date" className="input"
                value={form.receivedDate}
                onChange={(e) => setForm((f) => ({ ...f, receivedDate: e.target.value }))} />
            </div>
          </div>
          <div className="mt-3">
            <label className="label">Remarks</label>
            <input type="text" className="input" placeholder="Optional remarks"
              value={form.remarks}
              onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            ❌ {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Generating…' : `Generate ${form.numBags || '?'} Pack Labels`}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className="card mt-4 border-green-200 bg-green-50">
          <div className="flex items-center gap-2 mb-3">
            <Package size={18} className="text-green-600" />
            <span className="font-bold text-green-700">
              ✅ {result.totalPacks} Packs Generated — Lot {result.lotNo}
            </span>
          </div>
          <div className="text-sm text-gray-600 space-y-1 mb-4">
            <p>First Pack: <code className="bg-white px-1.5 py-0.5 rounded text-xs font-mono">{result.firstPackId}</code></p>
            <p>Last Pack: <code className="bg-white px-1.5 py-0.5 rounded text-xs font-mono">{result.lastPackId}</code></p>
            <p className="text-xs text-gray-400">All packs are AWAITING_INWARD — scan them in the Inward module</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <a
              href={packsApi.batchLabelsUrl(form.itemCode, result.lotNo)}
              target="_blank"
              rel="noreferrer"
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Printer size={15} />
              Print All {result.totalPacks} Labels (PDF)
            </a>
          </div>

          {/* Pack table preview */}
          <div className="mt-4 overflow-auto max-h-64">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-1.5 text-left">Bag</th>
                  <th className="px-3 py-1.5 text-left">Pack ID</th>
                  <th className="px-3 py-1.5 text-right">Qty</th>
                  <th className="px-3 py-1.5 text-center">Label</th>
                </tr>
              </thead>
              <tbody>
                {result.packs.slice(0, 10).map((p) => (
                  <tr key={p.packId} className="border-t">
                    <td className="px-3 py-1.5">{String(p.bagNo).padStart(3, '0')}</td>
                    <td className="px-3 py-1.5 font-mono">{p.packId}</td>
                    <td className="px-3 py-1.5 text-right">{Number(p.packQty)} {p.uom}</td>
                    <td className="px-3 py-1.5 text-center">
                      <a href={packsApi.labelUrl(p.packId)} target="_blank" rel="noreferrer"
                         className="text-blue-600 hover:underline">PDF</a>
                    </td>
                  </tr>
                ))}
                {result.packs.length > 10 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-center text-gray-400">
                      + {result.packs.length - 10} more packs
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
