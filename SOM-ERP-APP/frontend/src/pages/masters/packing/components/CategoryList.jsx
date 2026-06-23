import { CATEGORIES, SUB_TYPES } from './packingConstants.jsx'

export default function CategoryList({ loading, catCounts, onSelect }) {
  if (loading) return <p className="text-center text-gray-400 py-20">Loading…</p>

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {CATEGORIES.map(cat => (
        <button
          key={cat.value}
          onClick={() => onSelect(cat.value)}
          className="group relative bg-white border-2 border-gray-200 rounded-2xl p-6 text-left hover:border-gray-300 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden"
        >
          <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${cat.cls.grad}`} />

          <div className="text-4xl mb-4 mt-1">{cat.icon}</div>
          <h2 className="text-lg font-bold text-gray-900 leading-snug mb-1">{cat.label}</h2>
          <p className="text-xs text-gray-500 mb-5 leading-relaxed">{cat.desc}</p>

          <div className="flex items-center justify-between mb-4">
            <span className={`text-lg font-extrabold ${cat.cls.text}`}>
              {catCounts[cat.value] || 0}
              <span className="text-sm font-medium text-gray-400 ml-1">materials</span>
            </span>
            <span className="text-gray-300 group-hover:text-gray-500 transition-colors text-xl font-light">→</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(SUB_TYPES[cat.value] || []).map(s => (
              <span key={s.value} className={`text-[10px] px-2 py-0.5 rounded-full font-medium border-0 ${cat.cls.badge}`}>
                {s.icon} {s.value}
              </span>
            ))}
          </div>
        </button>
      ))}
    </div>
  )
}
