const SHEETS = [
  {
    sheet: 'Product Master',
    match: 'Sheet name contains "product" (not recipe/equipment)',
    cols: [
      { name: 'Product Name', note: 'Required. Duplicate names are skipped.' },
      { name: 'Plant Name', note: 'Optional. Plant where this product is manufactured.' },
    ],
    note: 'Product Code is auto-generated (PROD-001, PROD-002…) if not provided.'
  },
  {
    sheet: 'Equipment Master',
    match: 'Sheet name contains "equipment" or "equip"',
    cols: [
      { name: 'Equipment Name', note: 'Required. Unique name for each equipment.' },
      { name: 'Working Volume', note: 'Numeric. Capacity of the equipment (e.g. 500).' },
      { name: 'Operation', note: 'Type of operation (e.g. Granulation, Blending).' },
      { name: 'Plant', note: 'Plant where this equipment is located.' },
    ],
    note: 'Equipment Name is used as the unique key — existing records are updated.'
  },
  {
    sheet: 'RM Master',
    match: 'Sheet name contains "RM" or "Material" (not product/recipe)',
    cols: [
      { name: 'Item Code', note: 'Required. Unique RM code.' },
      { name: 'Item Name', note: 'Required. RM description.' },
      { name: 'UOM', note: 'Unit of measure (KG, L, etc.).' },
    ],
    note: null
  },
  {
    sheet: 'Recipe / BOM',
    match: 'Sheet TAB name contains "recipe", "bom", or "formula" — OR auto-detected by columns',
    cols: [
      { name: 'Product Name', note: 'Required. Product (FG) this BOM belongs to.' },
      { name: 'Raw Material', note: 'Required. RM ingredient name.' },
      { name: 'Qty Per Unit', note: 'Required. Qty of RM per unit of product.' },
      { name: 'UOM', note: 'Unit of measure for the RM qty.' },
    ],
    note: 'Raw Materials MUST already exist in RM Master — the system matches by name (with fuzzy matching for minor spelling differences) but will NOT create new RM codes. Unmatched RMs are listed in the warnings. Products are auto-created if missing.'
  },
  {
    sheet: 'Print Master (Pack Stock)',
    match: 'Sheet name contains "print" or "pack master"',
    cols: [
      { name: 'Pack ID', note: 'Required. Unique ID for each bag/pack.' },
      { name: 'Item Code', note: 'Required. RM code this pack belongs to.' },
      { name: 'Lot No', note: 'Lot or batch code.' },
      { name: 'Pack Qty', note: 'Quantity in this pack.' },
      { name: 'Supplier', note: 'Optional.' },
      { name: 'Invoice No', note: 'Optional.' },
      { name: 'Status', note: 'Set "INWARDED" for stock already received.' },
    ],
    note: null
  },
  {
    sheet: 'Inward',
    match: 'Sheet name contains "inward" or "GRN" or "goods received"',
    cols: [
      { name: 'Pack ID', note: 'Required. Must already exist in Print Master.' },
      { name: 'Warehouse', note: 'Location where inward is done.' },
      { name: 'Date', note: 'Date of inward.' },
    ],
    note: null
  },
]

export default function FormatGuide() {
  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800">📌 Excel File Format Guide</h3>
        <p className="text-xs text-gray-500 mt-0.5">One Excel file can have multiple sheets — detected by sheet TAB name, filename, or column headers automatically</p>
      </div>
      <div className="divide-y divide-gray-100">
        {SHEETS.map(s => (
          <div key={s.sheet} className="px-5 py-4">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="font-semibold text-gray-800">{s.sheet}</span>
              <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{s.match}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 mb-2">
              {s.cols.map(c => (
                <div key={c.name} className="flex gap-2 text-xs">
                  <span className="font-semibold text-gray-700 min-w-[120px] shrink-0">{c.name}</span>
                  <span className="text-gray-500">{c.note}</span>
                </div>
              ))}
            </div>
            {s.note && <p className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded mt-1">{s.note}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
