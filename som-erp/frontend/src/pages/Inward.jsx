/**
 * Inward Page — Bulk Scan Session
 *
 * Flow:
 *  1. Select pending item+lot+warehouse → Create session
 *  2. Scan packs continuously (camera)
 *  3. Live scanned/pending tables update
 *  4. Submit button activates only when all scanned
 */

import { useState, useEffect, useCallback } from 'react'
import { inwardApi, packsApi, rmApi } from '../api/client'
import QRScanner from '../components/QRScanner'
import {
  ArrowDownCircle, CheckCircle, XCircle, Scan,
  AlertTriangle, RotateCcw, Send
} from 'lucide-react'

const WAREHOUSES = [
  'COLD ROOM', 'SOLVENT GODOWN', 'BULK ROOM', 'STERILE ROOM',
  'BLACK ROOM', 'ACM ROOM', 'BOX GODOWN', 'ISSUANCE AREA',
  'BOTTLE GODOWN', 'LIVE STORE',
]

export default function Inward() {
  const [step, setStep] = useState('setup') // setup | scanning | done
  const [pendingGroups, setPendingGroups] = useState([])
  const [form, setForm] = useState({ itemCode: '', lotNo: '', warehouse: '' })
  const [session, setSession] = useState(null)
  const [scannedPacks, setScannedPacks] = useState([])
  const [pendingPacks, setPendingPacks] = useState([])
  const [scanError, setScanError] = useState(null)
  const [scanFlash, setScanFlash] = useState(null) // { type: 'ok'|'err', msg }
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState(null)
  const [loading, setLoading] = useState(false)

  // Load pending groups
  useEffect(() => {
    packsApi.pendingInward().then((r) => setPendingGroups(r.data || []))
  }, [])

  // Group by item for dropdowns
  const uniqueItems = [...new Map(pendingGroups.map((g) => [g.item_code, g])).values()]
  const lotsForItem = pendingGroups.filter((g) => g.item_code === form.itemCode)

  const handleItemChange = (itemCode) => {
    setForm({ itemCode, lotNo: '', warehouse: '' })
  }

  const handleLotChange = (lotNo) => {
    const g = lotsForItem.find((x) => x.lot_no === lotNo)
    setForm((f) => ({ ...f, lotNo }))
  }

  const startSession = async () => {
    if (!form.itemCode || !form.lotNo || !form.warehouse) return
    setLoading(true)
    try {
      const res = await inwardApi.createSession({
        itemCode: form.itemCode,
        lotNo: form.lotNo,
        warehouse: form.warehouse,
      })
      setSession(res.session)
      const allPending = res.pendingPacks || []
      setPendingPacks(allPending)
      setScannedPacks([])
      setStep('scanning')
    } catch (err) {
      setScanError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Called by QRScanner on each decoded code
  const handleScan = useCallback(async (packId) => {
    if (!session) return
    setScanFlash(null)
    setScanError(null)
    try {
      const res = await inwardApi.scan(session.sessionId, packId)
      setScannedPacks((prev) => [...prev, res.packInfo])
      setPendingPacks((prev) => prev.filter((p) => p.packId !== packId))
      setScanFlash({ type: 'ok', msg: `✅ Bag ${String(res.packInfo.bagNo).padStart(3,'0')} — ${res.packInfo.packQty} ${res.packInfo.uom}` })
      setTimeout(() => setScanFlash(null), 1500)
    } catch (err) {
      setScanFlash({ type: 'err', msg: err.message })
      setScanError(err.message)
      setTimeout(() => setScanFlash(null), 2500)
    }
  }, [session])

  const handleUndo = async (packId) => {
    try {
      await inwardApi.removeScan(session.sessionId, packId)
      const removed = scannedPacks.find((p) => p.packId === packId)
      setScannedPacks((prev) => prev.filter((p) => p.packId !== packId))
      if (removed) setPendingPacks((prev) => [...prev, removed])
    } catch (err) {
      setScanError(err.message)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await inwardApi.submit(session.sessionId)
      setSubmitResult(res)
      setStep('done')
    } catch (err) {
      setScanError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setStep('setup')
    setSession(null)
    setScannedPacks([])
    setPendingPacks([])
    setScanError(null)
    setSubmitResult(null)
    setForm({ itemCode: '', lotNo: '', warehouse: '' })
    packsApi.pendingInward().then((r) => setPendingGroups(r.data || []))
  }

  const isComplete = session && scannedPacks.length >= session.expectedBags
  const progress = session ? Math.min(100, (scannedPacks.length / session.expectedBags) * 100) : 0

  // ── SETUP STEP ─────────────────────────────────────────────
  if (step === 'setup') {
    return (
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <ArrowDownCircle size={24} className="text-primary" />
          <h1 className="text-xl font-bold text-primary">Inward — Bulk Scan</h1>
        </div>

        <div className="card space-y-4">
          <div>
            <label className="label">Pending Item *</label>
            <select className="input" value={form.itemCode} onChange={(e) => handleItemChange(e.target.value)} required>
              <option value="">— Select Item to Inward —</option>
              {uniqueItems.map((g) => (
                <option key={g.item_code} value={g.item_code}>
                  {g.item_name} [{g.item_code}]
                </option>
              ))}
            </select>
          </div>

          {form.itemCode && (
            <div>
              <label className="label">Lot No *</label>
              <select className="input" value={form.lotNo} onChange={(e) => handleLotChange(e.target.value)} required>
                <option value="">— Select Lot —</option>
                {lotsForItem.map((g) => (
                  <option key={g.lot_no} value={g.lot_no}>
                    Lot {g.lot_no} — {g.pending_bags} bags ({g.total_qty} {g.uom})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Warehouse *</label>
            <select className="input" value={form.warehouse} onChange={(e) => setForm((f) => ({ ...f, warehouse: e.target.value }))} required>
              <option value="">— Select Warehouse —</option>
              {WAREHOUSES.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>

          {scanError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">❌ {scanError}</div>
          )}

          <button
            className="btn-primary w-full"
            disabled={!form.itemCode || !form.lotNo || !form.warehouse || loading}
            onClick={startSession}
          >
            {loading ? 'Starting…' : '▶ Start Scan Session'}
          </button>
        </div>

        {pendingGroups.length === 0 && (
          <div className="text-center text-gray-400 mt-8 text-sm">
            <Package size={40} className="mx-auto mb-2 opacity-30" />
            No pending items. Generate packs in Print Master first.
          </div>
        )}
      </div>
    )
  }

  // ── DONE STEP ──────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card border-green-300 bg-green-50 text-center py-8">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-green-700 mb-2">Inward Complete!</h2>
          <p className="text-gray-600 text-sm mb-1">{submitResult?.packsInwarded} packs inwarded</p>
          <p className="text-gray-600 text-sm mb-1">Total: {submitResult?.totalQty} Kg</p>
          <p className="text-gray-600 text-sm">Warehouse: {submitResult?.warehouse}</p>
          <button onClick={reset} className="btn-primary mt-6 inline-flex items-center gap-2">
            <RotateCcw size={15} /> New Session
          </button>
        </div>
      </div>
    )
  }

  // ── SCANNING STEP ──────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-primary">{session.itemName}</h1>
          <p className="text-xs text-gray-500">Lot {session.lotNo} · {session.warehouse}</p>
        </div>
        <button onClick={reset} className="btn-outline text-xs flex items-center gap-1">
          <XCircle size={13} /> Cancel
        </button>
      </div>

      {/* Progress bar */}
      <div className="card mb-4 pb-3">
        <div className="flex justify-between text-sm font-semibold mb-2">
          <span className="text-green-600">Scanned: {scannedPacks.length}</span>
          <span className="text-gray-500">Expected: {session.expectedBags}</span>
          <span className="text-orange-500">Pending: {pendingPacks.length}</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${isComplete ? 'bg-green-500' : 'bg-accent'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {isComplete && (
          <p className="text-green-600 text-xs font-semibold text-center mt-1">
            ✅ All bags scanned — ready to submit!
          </p>
        )}
      </div>

      {/* Camera */}
      <div className="mb-4">
        <QRScanner onScan={handleScan} active={!isComplete} lastError={scanFlash?.type === 'err' ? scanFlash.msg : null} />
        {scanFlash?.type === 'ok' && (
          <div className="text-center text-green-600 font-semibold text-sm mt-2 animate-pulse">
            {scanFlash.msg}
          </div>
        )}
      </div>

      {/* Two-column: scanned + pending */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Scanned list */}
        <div className="card p-0 overflow-hidden">
          <div className="bg-green-50 px-3 py-2 border-b border-green-100 text-xs font-bold text-green-700 flex items-center gap-1">
            <CheckCircle size={12} /> Scanned ({scannedPacks.length})
          </div>
          <div className="overflow-y-auto max-h-48">
            {scannedPacks.length === 0 ? (
              <p className="text-center text-gray-400 text-xs py-4">Scan your first bag…</p>
            ) : (
              [...scannedPacks].reverse().map((p) => (
                <div key={p.packId} className="flex items-center justify-between px-3 py-1.5 border-b text-xs hover:bg-gray-50">
                  <div>
                    <span className="font-mono font-semibold">
                      {String(p.bagNo).padStart(3, '0')}
                    </span>
                    <span className="text-gray-400 ml-1">{p.packQty} {p.uom}</span>
                  </div>
                  <button onClick={() => handleUndo(p.packId)} className="text-red-400 hover:text-red-600 p-0.5">
                    <XCircle size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending list */}
        <div className="card p-0 overflow-hidden">
          <div className="bg-orange-50 px-3 py-2 border-b border-orange-100 text-xs font-bold text-orange-700">
            ⏳ Pending ({pendingPacks.length})
          </div>
          <div className="overflow-y-auto max-h-48">
            {pendingPacks.length === 0 && scannedPacks.length > 0 ? (
              <p className="text-center text-green-600 text-xs py-4 font-semibold">All done! ✅</p>
            ) : (
              pendingPacks.slice(0, 30).map((p) => (
                <div key={p.packId} className="px-3 py-1.5 border-b text-xs text-gray-500 font-mono">
                  {String(p.bagNo).padStart(3, '0')}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Submit button */}
      <button
        className="btn-success w-full flex items-center justify-center gap-2 text-base"
        disabled={!isComplete || submitting}
        onClick={handleSubmit}
      >
        {submitting ? (
          'Submitting…'
        ) : (
          <>
            <Send size={17} />
            {isComplete ? `Submit ${scannedPacks.length} Packs to Inward` : `Scan ${pendingPacks.length} more bags to enable submit`}
          </>
        )}
      </button>

      {scanError && (
        <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm flex items-center gap-2">
          <AlertTriangle size={15} />
          {scanError}
        </div>
      )}
    </div>
  )
}
