export const CATEGORIES = [
  {
    value: 'BOTTLES_TINS',
    label: 'Bottles / Containers / Tins',
    icon: '🧴',
    desc: 'HDPE bottles, CL tins, barrels, containers, jars',
    prefix: 'BTL',
    cls: { grad: 'from-blue-500 to-blue-700', header: 'bg-blue-600', light: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', ring: 'ring-blue-500' },
  },
  {
    value: 'POUCHES_BAGS',
    label: 'Pouches / Bags / Covers',
    icon: '🛍️',
    desc: 'Laminated pouches, LD covers, liners, handle bags',
    prefix: 'PCH',
    cls: { grad: 'from-violet-500 to-violet-700', header: 'bg-violet-600', light: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-600', badge: 'bg-violet-100 text-violet-700', ring: 'ring-violet-500' },
  },
  {
    value: 'CORRUGATED_BOXES',
    label: 'Corrugated Boxes / Cartons',
    icon: '📦',
    desc: '3, 5 & 7 ply boxes, shippers, inner cartons',
    prefix: 'CBB',
    cls: { grad: 'from-emerald-500 to-emerald-700', header: 'bg-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-500' },
  },
]

export const CAT = Object.fromEntries(CATEGORIES.map(c => [c.value, c]))

export const SUB_TYPES = {
  BOTTLES_TINS: [
    { value: 'Bottle',      icon: '🍾' },
    { value: 'Container',   icon: '🧴' },
    { value: 'Tin',         icon: '🥫' },
    { value: 'Barrel',      icon: '🛢️' },
    { value: 'Drum',        icon: '🏺' },
    { value: 'Jar',         icon: '🫙' },
    { value: 'Lid / Cap',   icon: '⚙️' },
    { value: 'Plug / Vent', icon: '🔌' },
  ],
  POUCHES_BAGS: [
    { value: 'Pouch',  icon: '👝' },
    { value: 'Bag',    icon: '🛍️' },
    { value: 'Cover',  icon: '🫙' },
    { value: 'Liner',  icon: '📄' },
  ],
  CORRUGATED_BOXES: [
    { value: 'Regular CBB',  icon: '📦' },
    { value: 'Shipper Box',  icon: '📫' },
    { value: 'Inner Box',    icon: '📭' },
  ],
}

const CHIP_CLS = {
  blue:    'bg-blue-50 text-blue-700 border-blue-200',
  violet:  'bg-violet-50 text-violet-700 border-violet-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber:   'bg-amber-50 text-amber-700 border-amber-200',
  yellow:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  orange:  'bg-orange-50 text-orange-700 border-orange-200',
  sky:     'bg-sky-50 text-sky-700 border-sky-200',
  pink:    'bg-pink-50 text-pink-700 border-pink-200',
  gray:    'bg-gray-100 text-gray-600 border-gray-200',
  slate:   'bg-slate-50 text-slate-500 border-slate-200',
}

export function getChips(item) {
  const c = []
  if (item.category === 'CORRUGATED_BOXES') {
    if (item.ply)  c.push({ label: `${item.ply} PLY`, color: 'emerald' })
    if (item.length && item.width && item.height) c.push({ label: `${item.length}×${item.width}×${item.height}mm`, color: 'amber' })
    if (item.color)        c.push({ label: item.color, color: 'yellow' })
    if (item.laminate)     c.push({ label: item.laminate, color: 'violet' })
    if (item.contentsSpec) c.push({ label: item.contentsSpec, color: 'sky' })
    if (item.packCount)    c.push({ label: `${item.packCount} Nos`, color: 'orange' })
  } else if (item.category === 'POUCHES_BAGS') {
    if (item.width && item.height) c.push({ label: `${item.width}×${item.height}mm`, color: 'amber' })
    if (item.capacity != null) c.push({ label: `${item.capacity} ${item.capacityUnit || ''}`.trim(), color: 'blue' })
    if (item.material) c.push({ label: item.material, color: 'gray' })
    if (item.color)    c.push({ label: item.color, color: 'pink' })
  } else {
    if (item.capacity != null) c.push({ label: `${item.capacity} ${item.capacityUnit || ''}`.trim(), color: 'blue' })
    if (item.shape)    c.push({ label: item.shape, color: 'violet' })
    if (item.material) c.push({ label: item.material, color: 'gray' })
    if (item.color)    c.push({ label: item.color, color: 'pink' })
  }
  if (item.notes) c.push({ label: item.notes, color: 'slate', italic: true })
  return c
}

export function Chip({ label, color = 'gray', italic }) {
  return (
    <span className={`inline-flex items-center border text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${CHIP_CLS[color] || CHIP_CLS.gray} ${italic ? 'italic' : ''}`}>
      {label}
    </span>
  )
}

export const MATERIALS_BTL  = ['HDPE', 'HM-HDPE', 'PET', 'Aluminium', 'US Tin', 'CL Tin', 'BP Tin', 'Glass', 'PP']
export const MATERIALS_PCH  = ['Laminated Film', 'Aluminium (TLSB)', 'LD (Low Density PE)', 'Bilaminated', 'Woven / Kraft']
export const SHAPES         = ['Round', 'Triangle', 'Square', 'Oval']
export const COLORS_BTL     = ['White', 'Blue', 'Natural', 'Amber', 'Green', 'Clear', 'Yellow', 'Black', 'Silver']
export const COLORS_PCH     = ['Silver', 'Plain', 'White', 'Golden', 'Blue']
export const COLORS_CBB     = ['Brown', 'White', 'Golden Yellow']
export const CAPACITY_UNITS = ['ML', 'GMS', 'LT', 'KG']
export const PLY_OPTIONS    = [3, 5, 7]
export const LAMINATES      = ['ITC Laminated', 'ITC Top', 'ITC White Board', 'White Duplex', 'Bilaminated']

export const EMPTY_FORM = {
  itemName: '', category: '', subType: '', material: '',
  capacity: '', capacityUnit: 'ML', length: '', width: '', height: '',
  ply: '', shape: '', color: '', laminate: '', contentsSpec: '', packCount: '', notes: '',
}

export const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white'

export function Lbl({ text, req }) {
  return <label className="block text-xs font-semibold text-gray-600 mb-1">{text}{req && <span className="text-red-500 ml-0.5">*</span>}</label>
}

export function Field({ label, req, children }) {
  return <div><Lbl text={label} req={req} />{children}</div>
}
