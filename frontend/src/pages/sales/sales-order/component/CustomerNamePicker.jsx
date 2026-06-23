import { useState, useEffect } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// CustomerNamePicker
// Searches 489+ customer profiles. When a known customer is selected it
// auto-fills company and orderType in the parent form.
// Each result shows a confidence badge (HIGH / MEDIUM / LOW / NEW) based
// on how many previous orders that customer has.
//
// Props:
//   value    {string}  controlled input value
//   profiles {array}   [{ customerName, company, orderType, orderCount }]
//   onSelect {fn}      (name, company|null, orderType|null) => void
// ─────────────────────────────────────────────────────────────────────────────
export default function CustomerNamePicker({ value, profiles, onSelect }) {
  const [query, setQuery] = useState(value || '')
  const [open,  setOpen]  = useState(false)

  useEffect(() => { setQuery(value || '') }, [value])

  const filtered = profiles
    .filter(p => !query || p.customerName.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 12)

  function badge(count) {
    if (count >= 10) return { label: 'HIGH',   cls: 'bg-green-100 text-green-700' }
    if (count >= 3)  return { label: 'MEDIUM', cls: 'bg-blue-100 text-blue-600' }
    if (count >= 1)  return { label: 'LOW',    cls: 'bg-gray-100 text-gray-500' }
    return             { label: 'NEW',    cls: 'bg-yellow-100 text-yellow-700' }
  }

  function pick(p) {
    setQuery(p.customerName)
    setOpen(false)
    onSelect(p.customerName, p.company, p.orderType)
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); onSelect(e.target.value, null, null) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder="Type customer name…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
      />

      {open && (
        <div className="absolute z-40 w-full bg-white border border-gray-200 rounded-xl shadow-xl mt-1 max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 italic">
              New customer — will be added to memory on save
            </div>
          ) : (
            filtered.map(p => {
              const b = badge(p.orderCount)
              return (
                <button
                  key={p.customerName}
                  type="button"
                  onMouseDown={() => pick(p)}
                  className="w-full text-left px-3 py-2.5 hover:bg-green-50 transition flex items-center justify-between gap-3 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{p.customerName}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{p.company} · {p.orderType}</div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${b.cls}`}>
                    {b.label}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
