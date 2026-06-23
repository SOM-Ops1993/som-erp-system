export default function Pagination({ page, total, limit, onChange, onLimitChange }) {
  const totalPages = Math.ceil(total / limit)
  const PER_PAGE_OPTIONS = [10, 15, 25, 50]

  const buildPages = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const result = []
    const left = Math.max(2, page - 2)
    const right = Math.min(totalPages - 1, page + 2)
    result.push(1)
    if (left > 2) result.push('...')
    for (let i = left; i <= right; i++) result.push(i)
    if (right < totalPages - 1) result.push('...')
    result.push(totalPages)
    return result
  }

  if (totalPages <= 1 && !onLimitChange) return null
  const pages = totalPages > 1 ? buildPages() : []

  return (
    <div className="flex items-center gap-1 py-3 select-none">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Previous
      </button>

      {pages.map((p, i) =>
        p === '...'
          ? <span key={`el-${i}`} className="px-1 text-sm text-gray-400 leading-8">···</span>
          : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`min-w-[32px] h-8 px-1.5 text-sm rounded transition-colors ${
                p === page
                  ? 'border border-gray-300 bg-white text-gray-900 font-medium shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          )
      )}

      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
      </button>

      {onLimitChange && (
        <select
          value={limit}
          onChange={e => onLimitChange(Number(e.target.value))}
          className="ml-3 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-600 cursor-pointer outline-none focus:ring-2 focus:ring-blue-400 hover:border-gray-300"
        >
          {PER_PAGE_OPTIONS.map(n => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>
      )}
    </div>
  )
}
