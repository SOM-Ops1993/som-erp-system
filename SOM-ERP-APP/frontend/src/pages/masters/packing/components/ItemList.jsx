import { SUB_TYPES, getChips, Chip } from './packingConstants.jsx'

export default function ItemList({ catMeta, selSub, subItems, groupedByName, onBack, onBackToCategories, onAdd, onEdit, onDelete }) {
  const subIcon = (SUB_TYPES[catMeta.value] || []).find(s => s.value === selSub)?.icon || '📦'

  return (
    <div className="px-6 py-5">
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-5">
        <button onClick={onBackToCategories} className="hover:text-gray-600 font-medium">Packing Materials</button>
        <span>›</span>
        <button onClick={onBack} className={`hover:text-gray-600 font-medium ${catMeta.cls.text}`}>{catMeta.label}</button>
        <span>›</span>
        <span className="font-semibold text-gray-700">{selSub}</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{subIcon} {selSub}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            <span className={catMeta.cls.text}>{catMeta.label}</span>
            {' · '}{subItems.length} item{subItems.length !== 1 ? 's' : ''}
            {Object.keys(groupedByName).length !== subItems.length && (
              <> · {Object.keys(groupedByName).length} product{Object.keys(groupedByName).length !== 1 ? 's' : ''}</>
            )}
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

      {subItems.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-3">{subIcon}</div>
          <p className="font-semibold text-gray-500">No items yet</p>
          <button onClick={onAdd} className={`mt-3 ${catMeta.cls.text} underline text-sm`}>Add the first item</button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByName).map(([name, variants]) => (
            <div key={name} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className={`flex items-center justify-between px-5 py-3.5 ${catMeta.cls.light} border-b ${catMeta.cls.border}`}>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-bold text-gray-900">{name}</span>
                  {variants.length > 1 && (
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${catMeta.cls.badge}`}>
                      {variants.length} variants
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400 font-medium">{catMeta.prefix}</span>
              </div>

              <div className="divide-y divide-gray-50">
                {variants.map(item => (
                  <div key={item.id} className="flex items-center gap-4 px-5 py-3.5 group hover:bg-gray-50 transition-colors">
                    <span className={`font-mono text-[11px] font-bold ${catMeta.cls.text} w-16 shrink-0`}>
                      {item.itemCode}
                    </span>

                    <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                      {getChips(item).length > 0
                        ? getChips(item).map((chip, i) => <Chip key={i} label={chip.label} color={chip.color} italic={chip.italic} />)
                        : <span className="text-xs text-gray-300 italic">No specifications recorded</span>
                      }
                    </div>

                    <span className="text-xs text-gray-400 shrink-0 font-medium">{item.uom || 'Nos'}</span>

                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(item)} className="text-blue-600 hover:text-blue-800 px-2.5 py-1 rounded-lg hover:bg-blue-50 text-xs font-semibold">
                        Edit
                      </button>
                      <button onClick={() => onDelete(item.id, item.itemName)} className="text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 text-sm font-bold leading-none">
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
