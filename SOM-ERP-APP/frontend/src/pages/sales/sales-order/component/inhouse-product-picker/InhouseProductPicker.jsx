import { useState, useEffect } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// InhouseProductPicker
// Searchable dropdown over the internal product master.
// Filters by both productName and productCode as the user types.
// Shows the selected productCode as a monospaced badge inside the input.
//
// Props:
//   value       {string}  current free-text value shown in the input
//   productCode {string}  resolved product code (shown as badge when set)
//   products    {array}   [{ productCode, productName }] from product master API
//   onChange    {fn}      (name: string, code: string) => void
// ─────────────────────────────────────────────────────────────────────────────
export default function InhouseProductPicker({ value, productCode, products, onChange }) {
  const [query, setQuery] = useState(value || '')
  const [open,  setOpen]  = useState(false)

  // Stay in sync when the parent form resets or pre-fills the value
  useEffect(() => { setQuery(value || '') }, [value])

  const filtered = products
    .filter(p =>
      !query ||
      p.productName.toLowerCase().includes(query.toLowerCase()) ||
      (p.productCode || '').toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 20)

  function pick(p) {
    setQuery(p.productName)
    setOpen(false)
    onChange(p.productName, p.productCode)
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); onChange(e.target.value, '') }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder="Search product master…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
      />

      {/* Resolved product code badge */}
      {productCode && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-green-600">
          {productCode}
        </span>
      )}

      {open && (
        <div className="absolute z-30 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
          {products.length === 0 ? (
            <div className="px-4 py-3 text-xs text-amber-600 bg-amber-50">
              No products in master yet — import recipe data via Data Import page first
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-3 text-xs text-gray-400 italic">
              No match — type free text or import more recipes
            </div>
          ) : (
            filtered.map(p => (
              <button
                key={p.productCode}
                type="button"
                onMouseDown={() => pick(p)}
                className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm flex items-center justify-between gap-2"
              >
                <span className="font-medium text-gray-800">{p.productName}</span>
                <span className="text-xs text-gray-400 font-mono shrink-0">{p.productCode}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
