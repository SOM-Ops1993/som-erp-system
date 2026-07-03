import { ChevronLeft, Plus, Pencil, X } from 'lucide-react'
import { Button, IconButton } from '../../../../../components/ui'
import { SUB_TYPES, getChips, Chip } from '../packing-constants/packingConstants.jsx'

export default function ItemList({ catMeta, selSub, subItems, groupedByName, onBack, onBackToCategories, onAdd, onEdit, onDelete }) {
  const subIcon = (SUB_TYPES[catMeta.value] || []).find(s => s.value === selSub)?.icon || '📦'

  return (
    <div className="px-6 py-5">
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-5">
        <Button variant="ghost" size="xs" onClick={onBackToCategories}>Packing Materials</Button>
        <span>›</span>
        <Button variant="ghost" size="xs" onClick={onBack} className={catMeta.cls.text}>{catMeta.label}</Button>
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
          <Button variant="outline-gray" icon={ChevronLeft} onClick={onBack} size="sm">Back</Button>
          <Button variant="purple" icon={Plus} onClick={onAdd} size="sm">Add Item</Button>
        </div>
      </div>

      {subItems.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-3">{subIcon}</div>
          <p className="font-semibold text-gray-500">No items yet</p>
          <Button variant="ghost" onClick={onAdd} className="mt-3">Add the first item</Button>
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
                <div className="flex items-center gap-3">
                  {/* Total stock across all variants of this product */}
                  {(() => {
                    const total = variants.reduce((s, v) => s + (Number(v.quantity) || 0), 0)
                    return (
                      <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        total === 0 ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
                      }`}>
                        <span>📦</span>
                        {total.toLocaleString()} {variants[0]?.uom || 'Nos'} total
                      </span>
                    )
                  })()}
                  <span className="text-xs text-gray-400 font-medium">{catMeta.prefix}</span>
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {variants.map(item => {
                  const qty = Number(item.quantity) || 0
                  return (
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

                    {/* Per-variant stock quantity */}
                    <div className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      qty === 0
                        ? 'bg-red-50 text-red-500 border-red-200'
                        : qty <= 50
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-green-50 text-green-700 border-green-200'
                    }`}>
                      {qty === 0 && <span className="text-[10px]">⚠</span>}
                      {qty.toLocaleString()}
                      <span className="font-normal text-[10px] opacity-70">{item.uom || 'Nos'}</span>
                    </div>

                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <IconButton icon={Pencil} tooltip="Edit" onClick={() => onEdit(item)} />
                      <IconButton icon={X} variant="danger" tooltip="Delete" onClick={() => onDelete(item.id, item.itemName)} />
                    </div>
                  </div>
                )})}

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
