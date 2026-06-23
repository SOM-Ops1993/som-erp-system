/**
 * BOM Issuance — Pack-level FIFO issuance with scanner and manual modes
 *
 * Flow:
 *   Planning saves plan → BomSend record created (PENDING)
 *   Store opens BOM → recipe lines with required qty + FIFO bags
 *   Scanner mode: plug in USB QR scanner / type packId + Enter → auto-issues
 *   Manual mode:  list of bags in FIFO order → click bag → confirm qty → issue
 *   Each issue deducts from PackBalance + writes StockLedger
 *   Remaining shown live after every scan
 *   Shortage: alert with option to raise purchase indent request
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { bomSendApi } from '../../api/sales.js'
import Pagination from '../../components/erp/Pagination.jsx'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtQty(n) { return n == null ? '—' : parseFloat(n.toFixed(3)).toString() }

const STATUS_BADGE = {
  PENDING:  'bg-yellow-100 text-yellow-700 border border-yellow-200',
  PICKED:   'bg-blue-100 text-blue-700 border border-blue-200',
  ISSUED:   'bg-green-100 text-green-700 border border-green-200',
  CANCELLED:'bg-gray-100 text-gray-400 border border-gray-200',
}
const LINE_STATUS = {
  PENDING:  { cls: 'bg-gray-100 text-gray-500',    label: 'Pending'  },
  PARTIAL:  { cls: 'bg-orange-100 text-orange-700', label: 'Partial'  },
  ISSUED:   { cls: 'bg-green-100 text-green-700',   label: '✓ Issued' },
  SHORT:    { cls: 'bg-red-100 text-red-700',       label: '⚠ Short'  },
  STOCKOUT: { cls: 'bg-red-200 text-red-800',       label: '✕ No Stock'},
}
const ROLE_COLOR = {
  ACTIVE:    'text-indigo-700',
  CARRIER:   'text-purple-600',
  EXCIPIENT: 'text-teal-600',
  PACKING:   'text-cyan-600',
}
const BOM_TYPE_BADGE = {
  FORMULATION: 'bg-violet-100 text-violet-700',
  PACKING:     'bg-cyan-100 text-cyan-700',
}

// ─────────────────────────────────────────────────────────────────────────────
// Material Line — handles one RM with scanner + manual tabs
// ─────────────────────────────────────────────────────────────────────────────
function MaterialLine({ line, bomId, sendId, onIssued }) {
  const [mode, setMode]         = useState('scanner')  // 'scanner' | 'manual'
  const [open, setOpen]         = useState(false)
  const [scanInput, setScanInput] = useState('')
  const [lastScan, setLastScan] = useState(null)       // { packId, deducted, packRemaining, itemRemaining }
  const [scanning, setScanning] = useState(false)
  const [manualPack, setManualPack] = useState(null)   // selected pack for manual issue
  const [manualQty, setManualQty]   = useState('')
  const [issuing, setIssuing]   = useState(false)
  const [err, setErr]           = useState('')
  const scanRef                 = useRef()

  const done    = line.status === 'ISSUED'
  const noStock = line.status === 'STOCKOUT'

  // Auto-focus scan input when panel opens in scanner mode
  useEffect(() => {
    if (open && mode === 'scanner' && scanRef.current) {
      scanRef.current.focus()
    }
  }, [open, mode])

  // Reset error on mode change
  useEffect(() => { setErr('') }, [mode])

  // ── Scanner: press Enter to issue ──────────────────────────────────────────
  async function handleScan(e) {
    if (e.key !== 'Enter') return
    const packId = scanInput.trim()
    if (!packId) return
    setScanning(true); setErr(''); setLastScan(null)
    try {
      const res = await bomSendApi.issuePack(bomId, { rmCode: line.rmCode, packId })
      const d = res.data || res
      setLastScan({ packId, ...d })
      setScanInput('')
      if (d.bomFullyDone || d.itemFullyDone) onIssued()
      else onIssued() // always refresh to update remaining
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || 'Issue failed')
    } finally { setScanning(false) }
  }

  // ── Manual: issue from a selected bag ─────────────────────────────────────
  async function handleManualIssue() {
    if (!manualPack) { setErr('Select a bag first'); return }
    setIssuing(true); setErr('')
    try {
      const payload = { rmCode: line.rmCode, packId: manualPack.packId }
      if (manualQty) payload.qty = parseFloat(manualQty)
      const res = await bomSendApi.issuePack(bomId, payload)
      const d = res.data || res
      setLastScan({ packId: manualPack.packId, ...d })
      setManualPack(null); setManualQty('')
      onIssued()
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || 'Issue failed')
    } finally { setIssuing(false) }
  }

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      done     ? 'border-green-200 bg-green-50/50' :
      noStock  ? 'border-red-200 bg-red-50/40' :
      line.shortage ? 'border-orange-200 bg-orange-50/30' :
                 'border-gray-200 bg-white'
    }`}>
      {/* ── Line Header ─────────────────────────────────────────────────────── */}
      <div
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-black/5 transition-colors ${done ? 'cursor-default' : ''}`}
        onClick={() => !done && setOpen(o => !o)}
      >
        {/* Status icon */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
          done ? 'bg-green-500 text-white' : noStock ? 'bg-red-400 text-white' : line.shortage ? 'bg-orange-400 text-white' : 'bg-gray-200 text-gray-500'
        }`}>
          {done ? '✓' : noStock ? '✕' : line.shortage ? '!' : '○'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${ROLE_COLOR[line.roleType] || 'text-gray-800'}`}>
              {line.rmName}
            </span>
            <span className="text-xs text-gray-400 font-mono">({line.rmCode})</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{line.roleType}</span>
          </div>

          <div className="flex items-center gap-4 mt-1 text-xs flex-wrap">
            <span className="text-gray-500">
              Required: <strong className="text-gray-800">{fmtQty(line.requiredQty)} {line.uom}</strong>
            </span>
            {line.issuedQty > 0 && (
              <span className="text-green-600">
                Issued: <strong>{fmtQty(line.issuedQty)} {line.uom}</strong>
              </span>
            )}
            {line.remainingQty > 0 && (
              <span className={line.shortage ? 'text-red-600 font-semibold' : 'text-orange-600'}>
                Remaining: <strong>{fmtQty(line.remainingQty)} {line.uom}</strong>
              </span>
            )}
            {line.shortage && !noStock && (
              <span className="text-red-600 font-semibold">
                Stock avail: <strong>{fmtQty(line.totalAvail)} {line.uom}</strong> — SHORT by <strong>{fmtQty(line.remainingQty - line.totalAvail)} {line.uom}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${LINE_STATUS[line.status]?.cls || 'bg-gray-100 text-gray-500'}`}>
            {LINE_STATUS[line.status]?.label || line.status}
          </span>
          {!done && <span className="text-gray-300 text-sm">{open ? '▲' : '▼'}</span>}
        </div>
      </div>

      {/* ── Shortage Alert ───────────────────────────────────────────────────── */}
      {(line.shortage || noStock) && (
        <div className="mx-4 mb-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-red-700">
              {noStock ? '⛔ No Stock Available' : '⚠ Insufficient Stock'}
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {noStock
                ? `${line.rmName} (${line.rmCode}) has no stock. Raise a purchase indent.`
                : `Available ${fmtQty(line.totalAvail)} ${line.uom} · Need ${fmtQty(line.remainingQty)} ${line.uom} · Short ${fmtQty(line.remainingQty - line.totalAvail)} ${line.uom}`
              }
            </p>
          </div>
          <a
            href={`mailto:procurement@somplant.com?subject=Purchase Indent Request — ${line.rmCode}&body=Material: ${line.rmName}%0ACode: ${line.rmCode}%0AShort Qty: ${fmtQty(line.remainingQty - line.totalAvail)} ${line.uom}%0ABOM: ${sendId}%0APlease raise purchase order.`}
            className="shrink-0 text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition whitespace-nowrap"
          >
            📧 Raise Purchase Indent
          </a>
        </div>
      )}

      {/* ── Issue Panel (open) ───────────────────────────────────────────────── */}
      {open && !done && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-4">

          {/* Mode switcher */}
          <div className="flex gap-1 mb-4 bg-gray-200 rounded-lg p-0.5 w-fit">
            {['scanner','manual'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${mode===m?'bg-white text-gray-900 shadow':'text-gray-500 hover:text-gray-700'}`}>
                {m === 'scanner' ? '📷 Scanner Mode' : '🖱 Manual Mode'}
              </button>
            ))}
          </div>

          {/* FIFO suggestion banner */}
          {line.fifoPacks.length > 0 && (
            <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
              <strong>FIFO Order:</strong> Issue from{' '}
              {line.fifoPacks.slice(0, 3).map((p, i) => (
                <span key={p.packId}>
                  {i > 0 && ' → '}
                  <span className="font-mono font-bold">{p.lotNo || p.packId.slice(-8)}</span>
                  {` (Bag ${p.bagNo}, ${fmtQty(p.remainingQty)} ${line.uom} avail)`}
                </span>
              ))}
              {line.fifoPacks.length > 3 && ` + ${line.fifoPacks.length - 3} more`}
            </div>
          )}

          {/* ── SCANNER MODE ─────────────────────────────────────────────── */}
          {mode === 'scanner' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Scan QR / Enter Pack ID — press <kbd className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-700 font-mono">Enter</kbd> to issue
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={scanRef}
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  onKeyDown={handleScan}
                  placeholder="Scan pack QR or type pack ID…"
                  disabled={scanning}
                  className="flex-1 border-2 border-indigo-300 bg-white rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  autoComplete="off"
                />
                <button
                  onClick={() => handleScan({ key: 'Enter' })}
                  disabled={scanning || !scanInput.trim()}
                  className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition whitespace-nowrap">
                  {scanning ? '⏳' : 'Issue'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                💡 USB QR scanner auto-fills this field and presses Enter. System issues min(pack qty, remaining needed).
              </p>

              {/* Last scan result */}
              {lastScan && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
                  <p className="font-bold text-green-700">✅ Issued {fmtQty(lastScan.deducted)} {line.uom} from pack <span className="font-mono">{lastScan.packId?.slice(-12)}</span></p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-600">
                    <span>Pack remaining: <strong className={lastScan.packRemaining > 0 ? 'text-gray-800' : 'text-red-500'}>{fmtQty(lastScan.packRemaining)} {line.uom}</strong></span>
                    <span>Still needed: <strong className={lastScan.itemRemaining > 0 ? 'text-orange-600' : 'text-green-600'}>{fmtQty(lastScan.itemRemaining)} {line.uom}</strong></span>
                  </div>
                  {lastScan.packRemaining > 0 && lastScan.itemRemaining > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      📦 {fmtQty(lastScan.packRemaining)} {line.uom} left in this bag — you can transfer it to container or issue from it next time.
                    </p>
                  )}
                  {lastScan.itemRemaining <= 0 && (
                    <p className="text-xs text-green-600 font-bold mt-1">✅ Material fully issued!</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── MANUAL MODE ──────────────────────────────────────────────── */}
          {mode === 'manual' && (
            <div>
              {line.fifoPacks.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">No bags with remaining stock</div>
              ) : (
                <>
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                    Select Bag (FIFO Order — oldest first)
                  </p>
                  <div className="space-y-2 mb-4 max-h-56 overflow-y-auto pr-1">
                    {line.fifoPacks.map((pack, i) => (
                      <div
                        key={pack.packId}
                        onClick={() => {
                          setManualPack(pack)
                          // Default qty = min(pack.remaining, item.remaining)
                          setManualQty(String(Math.min(pack.remainingQty, line.remainingQty)))
                          setErr('')
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                          manualPack?.packId === pack.packId
                            ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-300'
                            : i === 0
                            ? 'border-green-300 bg-green-50/60 hover:bg-green-50'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {i === 0 && (
                            <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded font-bold">FIFO 1st</span>
                          )}
                          <div>
                            <div className="text-sm font-mono font-bold text-gray-800">
                              {pack.lotNo ? `Lot: ${pack.lotNo}` : pack.packId.slice(-14)}
                              {pack.bagNo > 0 && ` · Bag #${pack.bagNo}`}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {pack.supplier && <span>Supplier: {pack.supplier} · </span>}
                              Received: {fmt(pack.receivedDate)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-800">{fmtQty(pack.remainingQty)} {line.uom}</div>
                          <div className="text-xs text-gray-400">of {fmtQty(pack.totalQty)}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {manualPack && (
                    <div className="bg-white border border-indigo-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-indigo-700 mb-3">
                        Issuing from: <span className="font-mono">{manualPack.lotNo || manualPack.packId.slice(-14)}</span>
                        {manualPack.bagNo > 0 && ` · Bag #${manualPack.bagNo}`}
                        <span className="text-gray-400 font-normal"> · Available: {fmtQty(manualPack.remainingQty)} {line.uom}</span>
                      </p>
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Qty to Issue ({line.uom}) — max {fmtQty(Math.min(manualPack.remainingQty, line.remainingQty))}
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            max={Math.min(manualPack.remainingQty, line.remainingQty)}
                            value={manualQty}
                            onChange={e => setManualQty(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                            autoFocus
                          />
                        </div>
                        <button
                          onClick={handleManualIssue}
                          disabled={issuing || !manualQty}
                          className="px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition whitespace-nowrap">
                          {issuing ? '⏳ Issuing…' : '✅ Confirm Issue'}
                        </button>
                        <button
                          onClick={() => { setManualPack(null); setManualQty('') }}
                          className="px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
                          Cancel
                        </button>
                      </div>

                      {/* Show pack split info if partial */}
                      {manualQty && parseFloat(manualQty) < manualPack.remainingQty && (
                        <p className="text-xs text-blue-600 mt-2">
                          📦 {fmtQty(manualPack.remainingQty - parseFloat(manualQty))} {line.uom} will remain in this bag.
                          Store person may transfer it to a container if needed.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Last issue result */}
                  {lastScan && (
                    <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-xs text-green-700">
                      ✅ Issued <strong>{fmtQty(lastScan.deducted)} {line.uom}</strong>
                      {lastScan.packRemaining > 0 && <> · Bag remaining: <strong>{fmtQty(lastScan.packRemaining)} {line.uom}</strong></>}
                      {lastScan.itemRemaining > 0
                        ? <> · Still needed: <strong className="text-orange-600">{fmtQty(lastScan.itemRemaining)} {line.uom}</strong></>
                        : <> · <span className="font-bold">Material fully issued! ✅</span></>
                      }
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {err && (
            <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{err}</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BOM Detail Drawer
// ─────────────────────────────────────────────────────────────────────────────
function BomDrawer({ bomId, onClose, onRefresh }) {
  const [bom, setBom]     = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await bomSendApi.get(bomId)
      setBom(res.data)
    } catch (e) {
      alert('Failed to load BOM: ' + (e?.response?.data?.error || e.message))
      onClose()
    } finally { setLoading(false) }
  }, [bomId])

  useEffect(() => { load() }, [load])

  async function handleIssued() { await load(); onRefresh() }

  const totalLines  = bom?.lines?.length || 0
  const issuedLines = bom?.lines?.filter(l => l.status === 'ISSUED').length || 0
  const shortLines  = bom?.lines?.filter(l => l.shortage || l.status === 'STOCKOUT').length || 0
  const pct         = totalLines > 0 ? Math.round((issuedLines / totalLines) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">

        {/* Header */}
        <div className={`px-6 py-5 flex-shrink-0 text-white ${
          bom?.status === 'ISSUED'   ? 'bg-gradient-to-r from-green-700 to-green-600' :
          shortLines > 0             ? 'bg-gradient-to-r from-red-700 to-red-600' :
                                       'bg-gradient-to-r from-slate-800 to-slate-700'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="text-white/50 text-sm">Loading…</div>
              ) : bom ? (
                <>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-sm text-white/70">{bom.sendId}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${BOM_TYPE_BADGE[bom.bomType] || 'bg-white/20 text-white'}`}>
                      {bom.bomType}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[bom.status] || 'bg-white/20 text-white'}`}>
                      {bom.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white truncate">{bom.productName}</h2>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-white/60">
                    <span>DI: <strong className="text-white/90">{bom.diNo}</strong></span>
                    <span>Section: <strong className="text-white/90">{bom.sectionType || '—'}</strong></span>
                    <span>Batch: <strong className="text-white/90">{bom.totalQty} {bom.uom}</strong></span>
                    <span>Planned: <strong className="text-white/90">{fmt(bom.plannedDate)}</strong></span>
                  </div>
                  {bom.batchNo && <div className="text-xs text-white/40 mt-0.5">Batch No: {bom.batchNo}</div>}
                </>
              ) : null}
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white text-2xl leading-none ml-4 mt-1">×</button>
          </div>
        </div>

        {/* Progress bar */}
        {!loading && bom && totalLines > 0 && (
          <div className="px-6 py-3 border-b border-gray-100 bg-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : shortLines > 0 ? 'bg-orange-400' : 'bg-indigo-500'}`}
                  style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-bold text-gray-600 whitespace-nowrap">
                {issuedLines} / {totalLines} materials issued ({pct}%)
              </span>
            </div>
            {shortLines > 0 && (
              <p className="text-xs text-red-600 font-semibold mt-1.5">
                ⚠ {shortLines} material{shortLines > 1 ? 's' : ''} with stock shortage — raise purchase indents below
              </p>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-3xl animate-spin inline-block">⚙</div>
              <p className="text-sm mt-2">Loading recipe &amp; stock…</p>
            </div>
          ) : !bom?.lines?.length ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">📋</div>
              <p className="font-semibold text-gray-500">No recipe found</p>
              <p className="text-xs mt-1 text-gray-400">
                Product code <strong>{bom?.productCode || '—'}</strong> has no BOM in Recipe Master.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bom.lines.map(line => (
                <MaterialLine
                  key={line.rmCode}
                  line={line}
                  bomId={bomId}
                  sendId={bom.sendId}
                  onIssued={handleIssued}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {bom && !loading && bom.status !== 'CANCELLED' && (
          <div className="px-6 py-4 border-t bg-gray-50 flex-shrink-0 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-400">
              Each issue deducts from Pack Balance and writes a StockLedger outward entry
            </p>
            {bom.status !== 'ISSUED' && (
              <button
                onClick={async () => {
                  if (!confirm('Cancel this BOM? Stock already issued will not be reversed.')) return
                  await bomSendApi.updateStatus(bomId, 'CANCELLED')
                  onRefresh(); onClose()
                }}
                className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-50 transition whitespace-nowrap">
                Cancel BOM
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function BomIssuance() {
  const [boms,          setBoms]          = useState([])
  const [loading,       setLoading]       = useState(true)
  const [selected,      setSelected]      = useState(null)
  const [filterStatus,  setFilterStatus]  = useState('ALL')
  const [filterSection, setFilterSection] = useState('ALL')
  const [search,        setSearch]        = useState('')

  const SECTIONS = ['NANO','BOTANICAL','LIQUID','POWDER','GRANULES']

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterStatus  !== 'ALL') params.status  = filterStatus
      if (filterSection !== 'ALL') params.section = filterSection
      const res = await bomSendApi.list(params)
      setBoms(res.data || [])
    } finally { setLoading(false) }
  }, [filterStatus, filterSection])

  useEffect(() => { load() }, [load])

  const filtered = boms.filter(b => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      b.productName?.toLowerCase().includes(q) ||
      b.diNo?.toLowerCase().includes(q) ||
      b.sendId?.toLowerCase().includes(q) ||
      b.batchNo?.toLowerCase().includes(q)
    )
  })
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(15)
  const paginatedFiltered = filtered.slice((page - 1) * limit, page * limit)
  useEffect(() => { setPage(1) }, [search, filterStatus, filterSection])

  const counts = {
    pending:  boms.filter(b => b.status === 'PENDING').length,
    partial:  boms.filter(b => b.status === 'PICKED').length,
    issued:   boms.filter(b => b.status === 'ISSUED').length,
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">BOM Issuance</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Material issuance to production · FIFO pack selection · Scanner &amp; manual modes
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <button onClick={() => setFilterStatus('PENDING')}
          className={`rounded-xl p-4 text-center border transition hover:shadow-md ${filterStatus==='PENDING'?'border-yellow-400 bg-yellow-50':'bg-white border-gray-200'}`}>
          <div className="text-2xl font-bold text-yellow-600">{counts.pending}</div>
          <div className="text-xs font-semibold text-yellow-600 mt-0.5">Pending Issuance</div>
        </button>
        <button onClick={() => setFilterStatus('PICKED')}
          className={`rounded-xl p-4 text-center border transition hover:shadow-md ${filterStatus==='PICKED'?'border-blue-400 bg-blue-50':'bg-white border-gray-200'}`}>
          <div className="text-2xl font-bold text-blue-600">{counts.partial}</div>
          <div className="text-xs font-semibold text-blue-600 mt-0.5">Partially Issued</div>
        </button>
        <button onClick={() => setFilterStatus('ISSUED')}
          className={`rounded-xl p-4 text-center border transition hover:shadow-md ${filterStatus==='ISSUED'?'border-green-400 bg-green-50':'bg-white border-gray-200'}`}>
          <div className="text-2xl font-bold text-green-600">{counts.issued}</div>
          <div className="text-xs font-semibold text-green-600 mt-0.5">Fully Issued</div>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search product, DI no., BOM ID…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none w-64" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PICKED">Partially Issued</option>
          <option value="ISSUED">Fully Issued</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select value={filterSection} onChange={e => setFilterSection(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          <option value="ALL">All Sections</option>
          {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => setFilterStatus('ALL')} className="text-xs text-gray-500 hover:underline">Clear</button>
        <button onClick={load}
          className="text-sm text-indigo-600 border border-indigo-200 px-3 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition ml-auto">
          ↻ Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading BOMs…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📦</div>
            <p className="font-semibold text-gray-500">No BOMs found</p>
            <p className="text-xs mt-1 text-gray-400">BOMs appear automatically when a plan is saved in Production Planning</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">BOM ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Product Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">DI No.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Section</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Planned Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Batch Qty</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedFiltered.map((b, idx) => (
                <tr key={b.id}
                  onClick={() => setSelected(b.id)}
                  className={`border-b border-gray-50 cursor-pointer hover:bg-indigo-50/40 transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  } ${b.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{b.sendId}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900 max-w-[200px] truncate">{b.productName}</div>
                    {b.batchNo && <div className="text-xs text-gray-400">Batch: {b.batchNo}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{b.diNo}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-600">{b.sectionType || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{fmt(b.plannedDate)}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-700">
                    {b.totalQty} <span className="text-xs text-gray-400 font-normal">{b.uom}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BOM_TYPE_BADGE[b.bomType] || 'bg-gray-100 text-gray-600'}`}>
                      {b.bomType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[b.status] || 'bg-gray-100 text-gray-500'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">›</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && (
          <div className="px-4 pb-3">
            <Pagination page={page} total={filtered.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
          </div>
        )}
      </div>

      {selected && (
        <BomDrawer bomId={selected} onClose={() => setSelected(null)} onRefresh={load} />
      )}
    </div>
  )
}
