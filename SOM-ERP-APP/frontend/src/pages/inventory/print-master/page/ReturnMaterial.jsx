import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { packsApi, rmApi } from '../../../../api/inventory.js'
import { BackButton, Button } from '../../../../components/ui'
import QRCodePreview from '../components/qr-code-preview/QRCodePreview.jsx'
import { ArrowLeftRight, QrCode, Printer } from 'lucide-react'

const PLANTS = ['Nano', 'Botanical', 'Liquid', 'Powder', 'Granules']

export default function ReturnMaterial() {
  const navigate = useNavigate()

  // RM search
  const [rmList,      setRmList]      = useState([])
  const [rmSearch,    setRmSearch]    = useState('')
  const [showDrop,    setShowDrop]    = useState(false)
  const [selectedRm,  setSelectedRm]  = useState(null)
  const dropRef = useRef(null)

  // Form fields
  const [perPackQty,   setPerPackQty]   = useState('')
  const [numberOfPacks, setNumberOfPacks] = useState('')
  const [plant,        setPlant]        = useState('')
  const [returnedBy,   setReturnedBy]   = useState('')

  // UI state
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [result,      setResult]      = useState(null)   // { lotNo, packs }
  const [showQR,      setShowQR]      = useState(false)

  useEffect(() => {
    rmApi.list({}).then(r => setRmList(r.data || [])).catch(() => {})
  }, [])

  const filteredRm = rmList.filter(r =>
    !rmSearch ||
    r.itemName?.toLowerCase().includes(rmSearch.toLowerCase()) ||
    r.itemCode?.toLowerCase().includes(rmSearch.toLowerCase())
  ).slice(0, 30)

  function pickRm(rm) {
    setSelectedRm({ itemCode: rm.itemCode, itemName: rm.itemName, uom: rm.uom })
    setRmSearch(rm.itemName)
    setShowDrop(false)
  }

  function clearRm() {
    setSelectedRm(null)
    setRmSearch('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedRm)        { setError('Please select a raw material'); return }
    if (!perPackQty || parseFloat(perPackQty) <= 0) { setError('Enter a valid qty per pack'); return }
    if (!numberOfPacks || parseInt(numberOfPacks) < 1) { setError('Enter number of packs (min 1)'); return }

    setLoading(true); setError('')
    try {
      const r = await packsApi.plantReturn({
        itemCode:     selectedRm.itemCode,
        itemName:     selectedRm.itemName,
        uom:          selectedRm.uom,
        perPackQty:   parseFloat(perPackQty),
        numberOfPacks: parseInt(numberOfPacks),
        plant:        plant || undefined,
        returnedBy:   returnedBy.trim() || undefined,
      })
      setResult(r.data)
      setShowQR(true)
    } catch (ex) {
      setError(ex?.response?.data?.error || ex.message)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setSelectedRm(null); setRmSearch(''); setPerPackQty(''); setNumberOfPacks('')
    setPlant(''); setReturnedBy(''); setResult(null); setError('')
  }

  const totalQty = (parseFloat(perPackQty) || 0) * (parseInt(numberOfPacks) || 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* QR preview overlay */}
      {showQR && result && (
        <QRCodePreview results={[result]} onClose={() => setShowQR(false)} />
      )}

      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-1">
          <BackButton onClick={() => navigate('/print-master')} label="Print Master" size="sm" />
        </div>
        <div className="flex items-center gap-3 mt-3">
          <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
            <ArrowLeftRight size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Return Material — Plant to Warehouse</h1>
            <p className="text-sm text-gray-500 mt-0.5">Generate QR labels for raw materials being sent back from plant</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* How it works */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
          <p className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wide">How it works</p>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside leading-relaxed">
            <li>Fill the form with raw material, qty per pack, and number of packs</li>
            <li>Generate QR codes and print the labels</li>
            <li>Attach each label to the corresponding pack</li>
            <li>Send packs to warehouse — warehouse team scans them in via normal inward</li>
          </ol>
        </div>

        {/* Success state */}
        {result && !showQR && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-5">
            <p className="font-bold text-green-800 text-base mb-1">
              {result.packs?.length} QR label{result.packs?.length !== 1 ? 's' : ''} generated!
            </p>
            <p className="text-sm text-green-700 mb-1">
              <span className="font-semibold">{selectedRm?.itemName}</span> · Lot: <span className="font-mono font-bold">{result.lotNo}</span>
            </p>
            <p className="text-xs text-green-600 mb-4">
              {result.packs?.length} packs × {perPackQty} {selectedRm?.uom} = {totalQty.toFixed(3)} {selectedRm?.uom} total
            </p>
            <div className="flex gap-3">
              <Button icon={QrCode} variant="primary" onClick={() => setShowQR(true)}>
                Show QR Labels
              </Button>
              <a
                href={packsApi.batchLabelsUrl(selectedRm?.itemCode, result.lotNo)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-lg transition">
                <Printer size={15} /> PDF Labels
              </a>
              <Button variant="outline-gray" onClick={resetForm}>
                Return Another
              </Button>
            </div>
          </div>
        )}

        {/* Form */}
        {!result && (
          <form onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">

            {/* RM search */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Raw Material *
              </label>
              <div className="relative">
                <input
                  value={rmSearch}
                  onChange={e => { setRmSearch(e.target.value); setShowDrop(true); if (selectedRm && e.target.value !== selectedRm.itemName) clearRm() }}
                  onFocus={() => setShowDrop(true)}
                  onBlur={() => setTimeout(() => setShowDrop(false), 160)}
                  placeholder="Search by name or code…"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                />
                {showDrop && filteredRm.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {filteredRm.map(r => (
                      <button key={r.itemCode} type="button"
                        onMouseDown={() => pickRm(r)}
                        className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 flex items-center justify-between text-sm border-b border-gray-50 last:border-0">
                        <span className="font-medium text-gray-900">{r.itemName}</span>
                        <span className="text-xs font-mono text-gray-400 ml-3 shrink-0">{r.itemCode}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedRm && (
                <div className="mt-2 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <span className="text-xs font-mono text-emerald-500">{selectedRm.itemCode}</span>
                  <span className="text-sm font-semibold text-emerald-900 flex-1">{selectedRm.itemName}</span>
                  <span className="text-xs text-emerald-600 font-medium">{selectedRm.uom}</span>
                  <button type="button" onClick={clearRm}
                    className="text-emerald-400 hover:text-emerald-600 text-sm font-bold ml-1">✕</button>
                </div>
              )}
            </div>

            {/* Qty per pack + number of packs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Qty per Pack ({selectedRm?.uom || 'KG'}) *
                </label>
                <input
                  type="number" min="0.001" step="0.001"
                  value={perPackQty}
                  onChange={e => setPerPackQty(e.target.value)}
                  placeholder="e.g. 25"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Number of Packs *
                </label>
                <input
                  type="number" min="1" step="1"
                  value={numberOfPacks}
                  onChange={e => setNumberOfPacks(e.target.value)}
                  placeholder="e.g. 4"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            {/* Live total */}
            {totalQty > 0 && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-600">
                Total return quantity: <span className="font-bold text-gray-900">{totalQty.toFixed(3)} {selectedRm?.uom || 'KG'}</span>
                {' '}across <span className="font-bold text-gray-900">{numberOfPacks}</span> pack{parseInt(numberOfPacks) !== 1 ? 's' : ''}
              </div>
            )}

            {/* Plant + Returned by */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Plant <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <select
                  value={plant}
                  onChange={e => setPlant(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-400">
                  <option value="">— Select plant —</option>
                  {PLANTS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Returned By <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  value={returnedBy}
                  onChange={e => setReturnedBy(e.target.value)}
                  placeholder="Plant manager name"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Generating…' : `Generate ${numberOfPacks ? `${numberOfPacks} ` : ''}QR Label${parseInt(numberOfPacks) !== 1 ? 's' : ''}`}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
