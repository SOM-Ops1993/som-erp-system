import { useState, useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// CustomerProductPicker
// Searches customer-specific product profiles (cpProfiles) for the current
// customer. Each option previews unit qty, primary pack and label type.
// When a profile is selected, onSelect fires with the full profile object
// so the parent can auto-fill all packing fields (memory apply).
//
// Props:
//   value      {string}  controlled input value
//   cpProfiles {array}   [{ productName, unitQty, unitUom, primaryPack, labelType, … }]
//   onChange   {fn}      (value: string) => void  — every keystroke
//   onSelect   {fn}      (profile: object) => void — only when user picks
// ─────────────────────────────────────────────────────────────────────────────
export default function CustomerProductPicker({ value, cpProfiles, onSelect, onChange }) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState(value || '')
  const ref = useRef(null)

  useEffect(() => { setSearch(value || '') }, [value])

  // Close on outside click
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const filtered = search.trim().length >= 1
    ? cpProfiles.filter(p => p.productName.toLowerCase().includes(search.toLowerCase())).slice(0, 10)
    : cpProfiles.slice(0, 10)

  return (
    <div className="relative" ref={ref}>
      <input
        value={search}
        onChange={e => { setSearch(e.target.value); onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
        placeholder={cpProfiles.length > 0 ? `${cpProfiles.length} known products…` : 'Type product name'}
      />

      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
          {filtered.map((p, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={e => {
                e.preventDefault()
                setSearch(p.productName)
                onChange(p.productName)
                setOpen(false)
                onSelect(p)
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 flex items-center justify-between gap-2"
            >
              <span className="font-medium text-gray-800 truncate">{p.productName}</span>
              <span className="text-xs text-gray-400 shrink-0 flex gap-1">
                {p.unitQty    && <span>{p.unitQty}{p.unitUom}</span>}
                {p.primaryPack && <span>· {p.primaryPack}</span>}
                {p.labelType   && <span className="text-green-600">· {p.labelType.replace('_', ' ')}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
