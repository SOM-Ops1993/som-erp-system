import { useState, useEffect } from 'react'
import { outwardApi } from '../../../../../api/inventory.js'
import { indentApi } from '../../../../../api/production.js'

export default function WarehouseToPlant() {
  const [rmCode, setRmCode]         = useState('')
  const [packs, setPacks]           = useState([])
  const [loadingPacks, setLoadingP] = useState(false)
  const [selectedPack, setPack]     = useState(null)
  const [mode, setMode]             = useState('direct') // 'direct' | 'indent'
  const [plant, setPlant]           = useState('')
  const [qty, setQty]               = useState('')
  const [remarks, setRemarks]       = useState('')
  const [indents, setIndents]       = useState([])
  const [selectedIndent, setIndent] = useState(null)
  const [selectedRm, setRm]         = useState(null)
  const [submitting, setSub]        = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')

  useEffect(() => {
    indentApi.list({ status: 'OPEN' }).then(r => setIndents(r.data || [])).catch(() => {})
  }, [])

  const searchPacks = async () => {
    const code = rmCode.trim().toUpperCase()
    if (!code) return
    setError(''); setPack(null); setQty('')
    try {
      setLoadingP(true)
      const r = await outwardApi.availablePacks(code)
      setPacks(r.data || [])
      if (!r.data?.length) setError(`No available stock for "${code}"`)
    } catch (e) { setError(e.message) }
    finally { setLoadingP(false) }
  }

  const submit = async () => {
    const q = parseFloat(qty)
    if (!selectedPack) { setError('Select a pack'); return }
    if (!q || q <= 0) { setError('Enter a valid quantity'); return }
    setSub(true); setError(''); setSuccess('')
    try {
      if (mode === 'direct') {
        if (!plant.trim()) { setError('Enter plant name'); setSub(false); return }
        await outwardApi.directIssue({ packId: selectedPack.packId, qty: q, plant: plant.trim(), remarks })
        setSuccess(`Issued ${q} ${selectedPack.itemName ? '' : 'kg'} from pack ${selectedPack.packId} to ${plant}`)
      } else {
        if (!selectedIndent || !selectedRm) { setError('Select indent and RM'); setSub(false); return }
        const r = await outwardApi.bomManual({ indentId: selectedIndent.indentId, rmCode: selectedRm.rmCode, packId: selectedPack.packId, qtyToIssue: q })
        setSuccess(`Issued ${r.data?.deducted ?? q} against indent ${selectedIndent.batchNo}`)
      }
      setPack(null); setQty(''); setRemarks('')
      searchPacks()
    } catch (e) { setError(e.response?.data?.error || e.message) }
    finally { setSub(false) }
  }

  return (
    <div className="p-6">
      <p className="text-sm text-gray-500 mb-5">
        Issue a pack directly to a plant, or against a production indent (BOM issuance).
      </p>

      {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{success}</div>}

      {/* Issue mode toggle */}
      <div className="flex gap-0 border border-gray-300 rounded-lg overflow-hidden mb-5 w-fit">
        {[['direct', 'Direct to Plant'], ['indent', 'Against Indent (BOM)']].map(([v, l]) => (
          <button key={v} onClick={() => { setMode(v); setError(''); setPack(null) }}
            className={`px-5 py-2 text-sm font-medium transition ${mode === v ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — Pack selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">RM Item Code *</label>
          <div className="flex gap-2 mb-3">
            <input value={rmCode} onChange={e => setRmCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && searchPacks()}
              placeholder="e.g. AZOS"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={searchPacks} disabled={loadingPacks || !rmCode.trim()}
              className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {loadingPacks ? '…' : 'Search'}
            </button>
          </div>

          {packs.length > 0 && (
            <div className="space-y-2 max-h-72 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
              {packs.map(p => (
                <button key={p.packId} onClick={() => { setPack(p); setQty(String(p.remainingQty)); setError('') }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition ${selectedPack?.packId === p.packId ? 'bg-blue-50 border-blue-400' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <div className="font-mono text-xs text-gray-800 truncate">{p.packId}</div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>Lot: {p.lotNo} | Bag #{p.bagNo}</span>
                    <span className="font-semibold text-green-700">{p.remainingQty} kg</span>
                  </div>
                  {p.supplier && <div className="text-xs text-gray-400">{p.supplier}</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right — Issue details */}
        <div>
          {mode === 'direct' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Plant / Destination *</label>
                <input value={plant} onChange={e => setPlant(e.target.value)}
                  placeholder="e.g. Formulation Plant A"
                  list="plant-list"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="plant-list">
                  {['Plant A', 'Plant B', 'Formulation Unit', 'Packing Unit'].map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Qty *</label>
                <input type="number" min="0.001" step="0.001"
                  max={selectedPack?.remainingQty}
                  value={qty} onChange={e => setQty(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Remarks</label>
                <input value={remarks} onChange={e => setRemarks(e.target.value)}
                  placeholder="Optional"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Open Indent *</label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                  {indents.length === 0
                    ? <p className="text-gray-400 text-sm p-2">No open indents</p>
                    : indents.map(i => (
                      <button key={i.indentId} onClick={() => { setIndent(i); setRm(null); setQty('') }}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${selectedIndent?.indentId === i.indentId ? 'bg-blue-50 border-blue-400' : 'border-gray-100 hover:bg-gray-50'}`}>
                        <div className="font-medium">{i.productName}</div>
                        <div className="text-xs text-gray-400">Batch: {i.batchNo} | {i.batchSize} kg</div>
                      </button>
                    ))}
                </div>
              </div>

              {selectedIndent && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Select RM from Indent *</label>
                  <div className="space-y-1 max-h-36 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                    {(selectedIndent.details || []).filter(d => d.balanceQty > 0).map(d => (
                      <button key={d.id} onClick={() => { setRm(d); setQty(String(Math.min(selectedPack?.remainingQty || d.balanceQty, d.balanceQty))) }}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-xs ${selectedRm?.id === d.id ? 'bg-blue-50 border-blue-400' : 'border-gray-100 hover:bg-gray-50'}`}>
                        <span className="font-medium">{d.rmName}</span>
                        <span className="text-gray-400 ml-2">Balance: {d.balanceQty}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Qty *</label>
                <input type="number" min="0.001" step="0.001" value={qty} onChange={e => setQty(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <button onClick={submit} disabled={submitting || !selectedPack || !qty}
            className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
            {submitting ? 'Issuing…' : 'Issue to Plant'}
          </button>
        </div>
      </div>
    </div>
  )
}
