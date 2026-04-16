/**
 * Outward Page — 5 modes:
 * 1. BOM Issuance (select indent → RM → scan packs)
 * 2. Pack Size Reduction (scan pack → enter qty → container)
 * 3. Stock Recon Adjustment
 * 4. Warehouse Transfer
 * 5. Job Work
 */
import { useState, useEffect, useCallback } from 'react'
import { outwardApi, indentApi, rmApi } from '../api/client'
import QRScanner from '../components/QRScanner'
import { ArrowUpCircle, CheckCircle, AlertTriangle, RotateCcw } from 'lucide-react'

const MODES = [
  { id: 'BOM_ISSUANCE',     label: 'BOM Issuance',        desc: 'Issue raw materials against a production indent' },
  { id: 'PACK_REDUCTION',   label: 'Pack Size Reduction',  desc: 'Transfer from pack into container' },
  { id: 'WAREHOUSE_TRANSFER',label: 'Warehouse Transfer',  desc: 'Move a pack to a different warehouse' },
  { id: 'STOCK_RECON',      label: 'Stock Adjustment',     desc: 'Manual correction with mandatory remarks' },
  { id: 'JOB_WORK',         label: 'Job Work Issue',       desc: 'Issue to external job work (no BOM required)' },
]

const WAREHOUSES = [
  'COLD ROOM','SOLVENT GODOWN','BULK ROOM','STERILE ROOM',
  'BLACK ROOM','ACM ROOM','BOX GODOWN','ISSUANCE AREA','BOTTLE GODOWN','LIVE STORE',
]

export default function Outward() {
  const [mode, setMode] = useState(null)

  if (!mode) return <ModeSelect onSelect={setMode} />
  if (mode === 'BOM_ISSUANCE')      return <BomIssuance onBack={() => setMode(null)} />
  if (mode === 'PACK_REDUCTION')    return <PackReduction onBack={() => setMode(null)} />
  if (mode === 'WAREHOUSE_TRANSFER') return <WarehouseTransfer onBack={() => setMode(null)} />
  if (mode === 'STOCK_RECON')       return <StockRecon onBack={() => setMode(null)} />
  if (mode === 'JOB_WORK')          return <BomIssuance onBack={() => setMode(null)} jobWork />
  return null
}

// ─── Mode selector ───────────────────────────────────────────
function ModeSelect({ onSelect }) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ArrowUpCircle size={24} className="text-primary" />
        <h1 className="text-xl font-bold text-primary">Outward — Select Mode</h1>
      </div>
      <div className="space-y-3">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className="card w-full text-left hover:border-primary hover:shadow-md transition-all group flex items-start gap-3"
          >
            <ArrowUpCircle size={20} className="text-primary mt-0.5 shrink-0 group-hover:text-accent transition-colors" />
            <div>
              <p className="font-semibold text-primary">{m.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── BOM Issuance ─────────────────────────────────────────────
function BomIssuance({ onBack, jobWork }) {
  const [indents, setIndents] = useState([])
  const [selectedIndent, setSelectedIndent] = useState(null)
  const [selectedRm, setSelectedRm] = useState(null)
  const [scanResult, setScanResult] = useState(null)
  const [scanError, setScanError] = useState(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    indentApi.list({ status: 'OPEN,PARTIAL' }).then((r) => setIndents(r.data || []))
  }, [])

  const loadIndent = async (indentId) => {
    const res = await indentApi.get(indentId)
    setSelectedIndent(res.data)
    setSelectedRm(null)
    setScanResult(null)
  }

  const handleScan = useCallback(async (packId) => {
    if (!selectedIndent || !selectedRm) return
    setScanError(null)
    try {
      const res = await outwardApi.bomScan({
        indentId: selectedIndent.indentId,
        rmCode: selectedRm.rmCode,
        packId,
      })
      setScanResult(res)
      if (res.isComplete) setScanning(false)
      // Refresh indent details
      const updated = await indentApi.get(selectedIndent.indentId)
      setSelectedIndent(updated.data)
      const updatedRm = updated.data.details.find((d) => d.rmCode === selectedRm.rmCode)
      if (updatedRm) setSelectedRm(updatedRm)
    } catch (err) {
      setScanError(err.message)
    }
  }, [selectedIndent, selectedRm])

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600">←</button>
        <h1 className="text-lg font-bold text-primary">{jobWork ? 'Job Work Issue' : 'BOM Issuance'}</h1>
      </div>

      {/* Step 1: Select Indent */}
      <div className="card mb-3">
        <label className="label">Select Indent</label>
        <select className="input" onChange={(e) => loadIndent(e.target.value)} defaultValue="">
          <option value="">— Select open indent —</option>
          {indents.map((ind) => (
            <option key={ind.indentId} value={ind.indentId}>
              {ind.indentId} · {ind.productName} · Batch {ind.batchSize} {ind.batchUnit}
              {ind.diNo ? ` · ${ind.diNo}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2: RM list */}
      {selectedIndent && (
        <div className="card mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">RM List — tap to select</p>
          <div className="space-y-2">
            {selectedIndent.details.map((d) => {
              const isSelected = selectedRm?.rmCode === d.rmCode
              const isComplete = d.status === 'COMPLETE'
              return (
                <button
                  key={d.rmCode}
                  onClick={() => { if (!isComplete) { setSelectedRm(d); setScanResult(null); setScanError(null); setScanning(true) } }}
                  className={`w-full text-left rounded-lg px-3 py-2.5 border transition-all text-sm
                    ${isComplete ? 'bg-green-50 border-green-200 text-green-700' :
                      isSelected ? 'bg-primary text-white border-primary' :
                      'bg-white border-gray-200 hover:border-primary'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold truncate">{d.rmName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ml-2 shrink-0 ${
                      isComplete ? 'bg-green-200' : d.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100'
                    }`}>
                      {isComplete ? '✅ Done' : d.status}
                    </span>
                  </div>
                  <div className={`text-xs mt-0.5 ${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>
                    Required: {Number(d.requiredQty)} · Issued: {Number(d.issuedQty)} · Balance: {Number(d.balanceQty)}
                    {d.currentStock !== undefined && ` · In Stock: ${d.currentStock}`}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 3: Scan */}
      {selectedRm && scanning && (
        <div className="card mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
            Scanning for: {selectedRm.rmName} — Need: {Number(selectedRm.balanceQty)} {selectedRm.uom || 'Kg'}
          </p>
          <QRScanner onScan={handleScan} active={scanning} lastError={scanError} />
          {scanResult && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">
              ✅ Deducted {scanResult.deducted} — Remaining: {scanResult.remaining}
              {scanResult.isComplete && <span className="font-bold"> — RM COMPLETE!</span>}
            </div>
          )}
          {scanError && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600 flex items-center gap-2">
              <AlertTriangle size={14} /> {scanError}
            </div>
          )}
          <button onClick={() => setScanning(false)} className="btn-outline text-xs mt-3">Stop Scanning</button>
        </div>
      )}
    </div>
  )
}

// ─── Pack Reduction ───────────────────────────────────────────
function PackReduction({ onBack }) {
  const [step, setStep] = useState('scan') // scan | confirm | done
  const [packId, setPackId] = useState(null)
  const [qty, setQty] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleScan = useCallback(async (scannedId) => {
    setPackId(scannedId)
    setStep('confirm')
  }, [])

  const handleSubmit = async () => {
    setError(null)
    try {
      const res = await outwardApi.packReduction({ packId, qty: parseFloat(qty) })
      setResult(res)
      setStep('done')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-gray-400">←</button>
        <h1 className="text-lg font-bold text-primary">Pack Size Reduction</h1>
      </div>

      {step === 'scan' && (
        <div className="card">
          <p className="text-sm text-gray-600 mb-3">Scan the pack you want to transfer to a container:</p>
          <QRScanner onScan={handleScan} active={true} />
        </div>
      )}

      {step === 'confirm' && (
        <div className="card space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 font-mono text-sm text-blue-800">
            {packId}
          </div>
          <div>
            <label className="label">Quantity to Transfer (Kg)</label>
            <input type="number" step="0.001" className="input" value={qty}
              onChange={(e) => setQty(e.target.value)} placeholder="Enter qty" />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">❌ {error}</div>}
          <div className="flex gap-2">
            <button onClick={() => setStep('scan')} className="btn-outline flex-1">Re-scan</button>
            <button onClick={handleSubmit} disabled={!qty} className="btn-primary flex-1">Transfer to Container</button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="card text-center py-8">
          <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
          <p className="font-bold text-green-700">Transfer Complete</p>
          <p className="text-sm text-gray-500 mt-2">
            Transferred {result.qtyTransferred} Kg → {result.containerId}
          </p>
          <p className="text-sm text-gray-500">Pack remaining: {result.packRemainingQty} Kg</p>
          <button onClick={() => { setStep('scan'); setPackId(null); setQty(''); setResult(null) }}
            className="btn-primary mt-4 inline-flex items-center gap-2">
            <RotateCcw size={14} /> New Transfer
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Warehouse Transfer ───────────────────────────────────────
function WarehouseTransfer({ onBack }) {
  const [step, setStep] = useState('scan')
  const [packId, setPackId] = useState(null)
  const [toWarehouse, setToWarehouse] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleScan = useCallback((id) => { setPackId(id); setStep('confirm') }, [])

  const handleSubmit = async () => {
    try {
      const res = await outwardApi.warehouseTransfer({ packId, toWarehouse })
      setResult(res)
      setStep('done')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-gray-400">←</button>
        <h1 className="text-lg font-bold text-primary">Warehouse Transfer</h1>
      </div>

      {step === 'scan' && <div className="card"><QRScanner onScan={handleScan} active={true} /></div>}

      {step === 'confirm' && (
        <div className="card space-y-4">
          <div className="font-mono text-sm bg-blue-50 px-3 py-2 rounded-lg">{packId}</div>
          <div>
            <label className="label">Destination Warehouse *</label>
            <select className="input" value={toWarehouse} onChange={(e) => setToWarehouse(e.target.value)}>
              <option value="">— Select —</option>
              {WAREHOUSES.map((w) => <option key={w}>{w}</option>)}
            </select>
          </div>
          {error && <div className="text-red-600 text-sm">❌ {error}</div>}
          <button onClick={handleSubmit} disabled={!toWarehouse} className="btn-primary w-full">Confirm Transfer</button>
        </div>
      )}

      {step === 'done' && (
        <div className="card text-center py-8">
          <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
          <p className="font-bold text-green-700">{result.fromWarehouse} → {result.toWarehouse}</p>
          <button onClick={() => { setStep('scan'); setPackId(null) }} className="btn-primary mt-4">New Transfer</button>
        </div>
      )}
    </div>
  )
}

// ─── Stock Recon ──────────────────────────────────────────────
function StockRecon({ onBack }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ itemCode: '', adjustmentQty: '', remarks: '' })
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => { rmApi.list().then((r) => setItems(r.data || [])) }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await outwardApi.stockAdjustment(form)
      setResult(res)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-gray-400">←</button>
        <h1 className="text-lg font-bold text-primary">Stock Adjustment</h1>
      </div>

      {result ? (
        <div className="card text-center py-8">
          <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
          <p className="font-bold">Adjustment recorded. New balance: {result.newBalance}</p>
          <button onClick={() => { setResult(null); setForm({ itemCode: '', adjustmentQty: '', remarks: '' }) }}
            className="btn-primary mt-4">New Adjustment</button>
        </div>
      ) : (
        <form className="card space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="label">Item *</label>
            <select className="input" value={form.itemCode} onChange={(e) => setForm((f) => ({ ...f, itemCode: e.target.value }))} required>
              <option value="">— Select Item —</option>
              {items.map((i) => <option key={i.itemCode} value={i.itemCode}>{i.itemName} [{i.itemCode}]</option>)}
            </select>
          </div>
          <div>
            <label className="label">Adjustment Qty (positive = add, negative = deduct) *</label>
            <input type="number" step="0.001" className="input" value={form.adjustmentQty}
              onChange={(e) => setForm((f) => ({ ...f, adjustmentQty: e.target.value }))}
              placeholder="e.g. -5 or +10" required />
          </div>
          <div>
            <label className="label">Remarks * (mandatory)</label>
            <textarea className="input" rows={3} value={form.remarks}
              onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
              placeholder="Reason for adjustment (min 5 characters)" required minLength={5} />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2 text-sm">❌ {error}</div>}
          <button type="submit" className="btn-primary w-full">Record Adjustment</button>
        </form>
      )}
    </div>
  )
}
