export const PERIODS = [
  { key: 'today', label: 'Today'      },
  { key: 'month', label: 'This Month' },
  { key: 'year',  label: 'This Year'  },
  { key: 'all',   label: 'All Time'   },
]

export function fmt(n, dec = 0) {
  if (n == null) return '—'
  const v = Number(n)
  if (isNaN(v)) return '—'
  return dec > 0
    ? v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })
    : v.toLocaleString('en-IN')
}
