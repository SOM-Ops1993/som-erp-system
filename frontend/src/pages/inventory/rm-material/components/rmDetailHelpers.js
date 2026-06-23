export function fmtQty(n) {
  if (n == null) return '—'
  const v = Number(n)
  if (isNaN(v)) return '—'
  return v % 1 === 0
    ? v.toLocaleString('en-IN')
    : v.toLocaleString('en-IN', { maximumFractionDigits: 3 })
}

export function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const STATUS_META = {
  INWARDED:         { label: 'Inwarded',       cls: 'bg-blue-100 text-blue-800'    },
  PARTIALLY_ISSUED: { label: 'Partial',         cls: 'bg-orange-100 text-orange-700' },
  EXHAUSTED:        { label: 'Exhausted',       cls: 'bg-gray-100 text-gray-500'   },
  AWAITING_INWARD:  { label: 'Awaiting Inward', cls: 'bg-yellow-100 text-yellow-800' },
}

export const statusMeta = (s) => STATUS_META[s] ?? { label: s, cls: 'bg-gray-100 text-gray-600' }

export function groupPacks(packs) {
  const map = new Map()
  for (const p of packs) {
    const key = `${p.lotNo || 'NOLOT'}||${p.invoiceNo || 'NOINV'}`
    if (!map.has(key)) {
      map.set(key, { key, lotNo: p.lotNo, invoiceNo: p.invoiceNo, supplier: p.supplier, receivedDate: p.receivedDate, uom: p.uom, bags: [] })
    }
    map.get(key).bags.push(p)
  }
  for (const g of map.values()) {
    g.bags.sort((a, b) => (a.bagNo || 0) - (b.bagNo || 0))
  }
  return Array.from(map.values()).sort((a, b) => {
    if (!a.receivedDate && !b.receivedDate) return 0
    if (!a.receivedDate) return 1
    if (!b.receivedDate) return -1
    return new Date(b.receivedDate) - new Date(a.receivedDate)
  })
}

export function groupStatus(bags) {
  const s = new Set(bags.map(b => b.status))
  if (s.size === 1) return [...s][0]
  if (bags.some(b => b.status === 'PARTIALLY_ISSUED')) return 'PARTIALLY_ISSUED'
  if (bags.some(b => b.status === 'INWARDED'))         return 'INWARDED'
  return 'EXHAUSTED'
}
