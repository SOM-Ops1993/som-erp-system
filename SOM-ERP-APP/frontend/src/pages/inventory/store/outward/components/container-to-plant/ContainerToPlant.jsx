import { useState, useCallback, useEffect } from 'react'
import { containerApi } from '../../../../../../api/inventory.js'
import { indentApi } from '../../../../../../api/production.js'
import { useQrScanner } from '../../../../../../hooks/useQrScanner.js'
import { Button } from '../../../../../../components/ui'
import './ContainerToPlant.css'

export default function ContainerToPlant({ preselected, onDone }) {
  const [container, setContainer]   = useState(preselected || null)
  const [manualId, setManualId]     = useState('')
  const [loadingCont, setLoadingC]  = useState(false)
  const [qty, setQty]               = useState('')
  const [plant, setPlant]           = useState('')
  const [remarks, setRemarks]       = useState('')
  const [indents, setIndents]       = useState([])
  const [indentId, setIndentId]     = useState('')
  const [submitting, setSub]        = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')

  useEffect(() => {
    if (preselected) {
      indentApi.list({ status: 'OPEN' })
        .then(r => setIndents((r.data || []).filter(i => i.details?.some(d => d.rmCode === preselected.itemCode))))
        .catch(() => {})
    }
  }, [])

  const onScan = useCallback(async (raw) => {
    const id = raw.startsWith('CONT:') ? raw.slice(5) : raw
    scanner.stop()
    await loadContainer(id)
  }, [])

  const scanner = useQrScanner(onScan)

  const loadContainer = async (id) => {
    const trimmed = id.trim().toUpperCase()
    if (!trimmed) return
    setError(''); setSuccess(''); setContainer(null); setQty(''); setPlant(''); setRemarks(''); setIndentId('')
    try {
      setLoadingC(true)
      const r = await containerApi.get(trimmed)
      setContainer(r.data)
      // load open indents filtered to this item
      const ir = await indentApi.list({ status: 'OPEN' })
      setIndents((ir.data || []).filter(i => i.details?.some(d => d.rmCode === r.data.itemCode)))
    } catch (e) { setError('Container not found: ' + trimmed) }
    finally { setLoadingC(false) }
  }

  const submit = async () => {
    const q = parseFloat(qty)
    if (!q || q <= 0) { setError('Enter a valid quantity'); return }
    if (q > container.currentQty) { setError(`Qty exceeds container balance (${container.currentQty})`); return }
    setSub(true); setError(''); setSuccess('')
    try {
      const r = await containerApi.issue(container.containerId, {
        qty: q,
        indentId: indentId || undefined,
        remarks: remarks || (plant ? `To: ${plant}` : undefined),
      })
      const linked = indentId ? ` (Indent linked)` : (plant ? ` → ${plant}` : '')
      setSuccess(`Issued ${r.issued} ${container.uom} from ${container.containerId}${linked}. Remaining: ${r.data.currentQty} ${r.data.uom}`)
      setContainer(r.data)
      setQty(''); setPlant(''); setRemarks(''); setIndentId('')
    } catch (e) { setError(e.response?.data?.error || e.message) }
    finally { setSub(false) }
  }

  return (
    <div className="p-6 max-w-lg">
      <p className="text-sm text-gray-500 mb-5">
        Issue material from a container to the plant. Scan the container QR or enter its ID.
      </p>

      {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{success}</div>}
      {scanner.camError && <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-4 text-sm">{scanner.camError}</div>}

      {/* Always-rendered video */}
      <div className={`bg-black rounded-xl overflow-hidden relative mb-4 ctp-camera-wrap ${scanner.active ? 'block' : 'hidden'}`}>
        <video ref={scanner.videoRef} className="w-full h-full object-cover" playsInline muted />
        <canvas ref={scanner.canvasRef} className="hidden" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-40 h-40 border-2 border-green-400 rounded-lg" />
        </div>
        <div className="absolute bottom-2 left-0 right-0 text-center text-white text-xs bg-black/50 py-1">
          Point at container QR (orange label)
        </div>
      </div>

      {/* Container selector */}
      {!container && (
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Container ID</label>
          <div className="flex gap-2 flex-wrap">
            <input value={manualId} onChange={e => setManualId(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && loadContainer(manualId)}
              placeholder="e.g. CONT-AZOS"
              className="flex-1 min-w-[140px] border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-green-500"
            />
            <Button onClick={() => loadContainer(manualId)} disabled={loadingCont || !manualId.trim()} loading={loadingCont} variant="success" size="sm">
              {loadingCont ? '…' : 'Load'}
            </Button>
            <Button onClick={scanner.active ? scanner.stop : scanner.start} variant={scanner.active ? 'danger' : 'outline-gray'} size="sm">
              {scanner.active ? 'Stop' : 'Scan QR'}
            </Button>
          </div>
        </div>
      )}

      {/* Container card */}
      {container && (
        <>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-bold text-green-900 font-mono">{container.containerId}</div>
                <div className="text-sm text-green-700">{container.itemName} <span className="text-xs font-mono">({container.itemCode})</span></div>
              </div>
              <Button onClick={() => { setContainer(null); setError(''); setSuccess('') }} variant="ghost" size="xs">Change</Button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-white rounded-lg py-2">
                <div className={`font-bold text-xl ${container.currentQty > 0 ? 'text-green-700' : 'text-red-500'}`}>{container.currentQty}</div>
                <div className="text-xs text-gray-500">Available ({container.uom})</div>
              </div>
              <div className="bg-white rounded-lg py-2">
                <div className="font-bold text-xl text-gray-400">{container.capacity}</div>
                <div className="text-xs text-gray-500">Capacity ({container.uom})</div>
              </div>
            </div>
            {container.currentQty <= 0 && <p className="text-red-600 text-xs mt-2 text-center font-semibold">Container is empty — fill it first</p>}
          </div>

          {container.currentQty > 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Qty to Issue *</label>
                <input type="number" min="0.001" step="0.001" max={container.currentQty}
                  value={qty} onChange={e => setQty(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Plant / Destination</label>
                <input value={plant} onChange={e => setPlant(e.target.value)}
                  placeholder="e.g. Formulation Plant A"
                  list="plant-list-ctp"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
                />
                <datalist id="plant-list-ctp">
                  {['Plant A', 'Plant B', 'Formulation Unit', 'Packing Unit'].map(p => <option key={p} value={p} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Link to Indent <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select value={indentId} onChange={e => setIndentId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">— No indent —</option>
                  {indents.map(i => (
                    <option key={i.indentId} value={i.indentId}>
                      {i.productName} | {i.batchNo} | {i.batchSize} kg
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Remarks</label>
                <input value={remarks} onChange={e => setRemarks(e.target.value)}
                  placeholder="Optional"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <Button onClick={submit} disabled={submitting || !qty} loading={submitting} variant="success" fullWidth>
                {submitting ? 'Issuing…' : 'Issue from Container'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
