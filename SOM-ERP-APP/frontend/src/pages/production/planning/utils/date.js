export function todayISO() { return new Date().toISOString().slice(0,10) }

export function addDays(d, n) {
  const dt = new Date(d + 'T00:00:00')
  dt.setDate(dt.getDate() + n)
  return dt.toISOString().slice(0,10)
}

export function fmtDateLabel(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  })
}
