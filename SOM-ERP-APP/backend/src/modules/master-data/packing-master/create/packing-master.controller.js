import prisma from '../../../../db.js'

const PREFIX = {
  BOTTLES_TINS:      'BTL',
  POUCHES_BAGS:      'PCH',
  CORRUGATED_BOXES:  'CBB',
}

const generateItemCode = async (category) => {
  const prefix = PREFIX[category] || 'PKG'
  const last = await prisma.packingMaterial.findFirst({
    where: { itemCode: { startsWith: `${prefix}-` } },
    orderBy: { itemCode: 'desc' },
    select: { itemCode: true },
  })
  const seq = last ? (parseInt(last.itemCode.split('-')[1]) || 0) + 1 : 1
  return `${prefix}-${String(seq).padStart(3, '0')}`
}

function parseNum(v) {
  if (v === '' || v == null) return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}
function parseInt2(v) {
  if (v === '' || v == null) return null
  const n = parseInt(v)
  return isNaN(n) ? null : n
}

export const createPackingMaterial = async (req, res) => {
  try {
    const {
      itemName, category, subType, material,
      capacity, capacityUnit, length, width, height,
      ply, shape, color, laminate, contentsSpec, packCount, quantity, uom, notes,
    } = req.body

    if (!itemName || !category) {
      return res.status(400).json({ success: false, error: 'itemName and category are required', code: 'VALIDATION_ERROR' })
    }

    const itemCode = await generateItemCode(category)

    const item = await prisma.packingMaterial.create({
      data: {
        itemCode,
        itemName:     itemName.trim(),
        category,
        subType:      subType      || null,
        material:     material     || null,
        capacity:     parseNum(capacity),
        capacityUnit: capacityUnit || null,
        length:       parseNum(length),
        width:        parseNum(width),
        height:       parseNum(height),
        ply:          parseInt2(ply),
        shape:        shape        || null,
        color:        color        || null,
        laminate:     laminate     || null,
        contentsSpec: contentsSpec || null,
        packCount:    parseInt2(packCount),
        quantity:     parseInt2(quantity) ?? 0,
        uom:          uom          || 'Nos',
        notes:        notes        || null,
      },
    })
    return res.status(201).json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
