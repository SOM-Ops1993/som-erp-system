import { useState, useEffect, useRef } from 'react'
import './CreateContainer.css'
import { containerApi, rmApi } from '../../../../../../api/inventory.js'
import { Button } from '../../../../../../components/ui'

export default function CreateContainer({ onCreated }) {
  const [query, setQuery]       = useState('')
  const [allRms, setAllRms]     = useState([])
  const [suggestions, setSuggs] = useState([])
  const [selectedRm, setSelRm]  = useState(null)
  const [capacity, setCapacity] = useState('')
  const [submitting, setSub]    = useState(false)
  const [error, setError]       = useState('')
  const [created, setCreated]   = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    rmApi.list().then(r => setAllRms(r.data || [])).catch(() => {})
  }, [])

  const handleQueryChange = (val) => {
    setQuery(val)
    setSelRm(null)
    setError('')
    if (!val.trim()) { setSuggs([]); return }
    const q = val.toLowerCase()
    setSuggs(allRms.filter(rm =>
      rm.itemName.toLowerCase().includes(q) || rm.itemCode.toLowerCase().includes(q)
    ).slice(0, 8))
  }

  const pickRm = (rm) => {
    setSelRm(rm)
    setQuery(rm.itemName)
    setSuggs([])
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!selectedRm) { setError('Select a raw material from the suggestions'); return }
    if (!capacity || parseFloat(capacity) <= 0) { setError('Enter a valid capacity'); return }
    setSub(true); setError('')
    try {
      const r = await containerApi.create({
        itemCode: selectedRm.itemCode,
        itemName: selectedRm.itemName,
        capacity: parseFloat(capacity),
        uom: selectedRm.uom || 'KG',
      })
      setCreated(r.data)
      onCreated?.()
    } catch (e) { setError(e.response?.data?.error || e.message) }
    finally { setSub(false) }
  }

  if (created) return (
    <div className="p-6 max-w-md">
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="text-4xl mb-3">o.</div>
        <h3 className="text-lg font-bold text-green-800 mb-1">Container Created!</h3>
        <p className="text-green-700 text-sm mb-0.5 font-mono font-bold">{created.containerId}</p>
        <p className="text-green-600 text-sm mb-4">{created.itemName} — Cap: {created.capacity} {created.uom}</p>
        <div className="flex gap-3 justify-center">
          <a
            href={containerApi.labelUrl(created.containerId)}
            target="_blank" rel="noreferrer"
            className="bg-orange-500 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-orange-600"
          >
            Print QR Label
          </a>
          <Button
            variant="outline-gray"
            onClick={() => { setCreated(null); setQuery(''); setSelRm(null); setCapacity('') }}
          >
            Create Another
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-md">
      <p className="text-sm text-gray-500 mb-5">
        Create a physical container (drum, bin, jerry can) for a raw material. The container ID and QR are auto-generated.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={submit} className="space-y-5">
        {/* RM Name with autocomplete */}
        <div className="relative">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Raw Material *</label>
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onBlur={() => setTimeout(() => setSuggs([]), 150)}
            placeholder="Type to search raw material name"
            autoComplete="off"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              {suggestions.map(rm => (
                <button
                  type="button"
                  key={rm.itemCode}
                  onMouseDown={() => pickRm(rm)}
                  className="w-full text-left px-4 py-2.5 hover:bg-orange-50 transition border-b border-gray-50 last:border-0"
                >
                  <div className="text-sm font-medium text-gray-900">{rm.itemName}</div>
                  <div className="text-xs text-gray-400 font-mono">{rm.itemCode} · {rm.uom}</div>
                </button>
              ))}
            </div>
          )}
          {selectedRm && (
            <div className="mt-2 flex gap-3 text-xs text-gray-500 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
              <span>Code: <strong className="font-mono text-orange-700">{selectedRm.itemCode}</strong></span>
              <span>UOM: <strong>{selectedRm.uom}</strong></span>
              <span className="text-gray-400">ID will be: <strong className="font-mono">CONT-{selectedRm.itemName.replace(/[^a-zA-Z0-9]/g,'').slice(0,4).toUpperCase()}-{selectedRm.itemCode}</strong></span>
            </div>
          )}
        </div>

        {/* Capacity */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Capacity ({selectedRm?.uom || 'KG'}) *
          </label>
          <input
            type="number" min="0.1" step="0.1"
            value={capacity}
            onChange={e => setCapacity(e.target.value)}
            placeholder="e.g. 50"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
          />
          <p className="text-xs text-gray-400 mt-1">Maximum amount this container can hold</p>
        </div>

        <Button
          type="submit"
          variant="warning"
          fullWidth
          loading={submitting}
          disabled={!selectedRm || !capacity}
        >
          Create Container + Generate QR
        </Button>
      </form>
    </div>
  )
}
