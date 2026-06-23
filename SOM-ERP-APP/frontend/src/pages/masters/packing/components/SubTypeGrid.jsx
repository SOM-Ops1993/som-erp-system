import { SUB_TYPES } from './packingConstants.jsx'

export default function SubTypeGrid({ catMeta, catCounts, subCounts, onBack, onAdd, onSelect }) {
  return (
    <div className="px-6 py-5">
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-5">
        <button onClick={onBack} className="hover:text-gray-600 font-medium">Packing Materials</button>
        <span>›</span>
        <span className={`font-semibold ${catMeta.cls.text}`}>{catMeta.label}</span>
      </nav>

      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>{catMeta.icon}</span>{catMeta.label}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {catCounts[catMeta.value] || 0} materials · choose a type to view items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-sm font-medium">
            ← Back
          </button>
          <button onClick={onAdd} className={`${catMeta.cls.header} text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 shadow-sm`}>
            + Add Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {(SUB_TYPES[catMeta.value] || []).map(sub => {
          const count = subCounts[sub.value] || 0
          const active = count > 0
          return (
            <button
              key={sub.value}
              onClick={() => active && onSelect(sub.value)}
              disabled={!active}
              className={`relative bg-white border-2 rounded-2xl p-5 text-center transition-all duration-150 ${
                active
                  ? `border-gray-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:${catMeta.cls.border}`
                  : 'border-gray-100 opacity-35 cursor-not-allowed'
              }`}
            >
              {active && <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${catMeta.cls.header}`} />}
              <div className="text-3xl mb-2.5">{sub.icon}</div>
              <div className="text-sm font-bold text-gray-800">{sub.value}</div>
              <div className={`text-xs font-semibold mt-1.5 ${active ? catMeta.cls.text : 'text-gray-300'}`}>
                {count} item{count !== 1 ? 's' : ''}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
