import prisma from '../../../../db.js'
import { toCanonical, normalizeUom, CANONICAL_UNITS } from '../../../../utils/uom.js'

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

    // `capacity`/`capacityUnit` (a single unit's size, e.g. a 500 mL bottle)
    // and `quantity`/`uom` (the stock count) are two independent
    // measurements — each converts to its own canonical unit.
    const capacityNum = parseNum(capacity)
    let canonicalCapacity = capacityNum
    let canonicalCapacityUnit = capacityUnit || null
    if (capacityNum != null && capacityUnit) {
      try {
        const c = toCanonical(capacityNum, capacityUnit)
        canonicalCapacity = c.qty
        canonicalCapacityUnit = c.uom
      } catch (e) {
        return res.status(400).json({ success: false, error: `capacityUnit: ${e.message}`, code: 'VALIDATION_ERROR' })
      }
    }

    const rawUom = uom || 'Nos'
    const canonicalUom = normalizeUom(rawUom)
    if (!CANONICAL_UNITS.includes(canonicalUom))
      return res.status(400).json({ success: false, error: `uom must convert to one of ${CANONICAL_UNITS.join(', ')} — got "${rawUom}"`, code: 'VALIDATION_ERROR' })

    const item = await prisma.packingMaterial.create({
      data: {
        itemCode,
        itemName:     itemName.trim(),
        category,
        subType:      subType      || null,
        material:     material     || null,
        capacity:     canonicalCapacity,
        capacityUnit: canonicalCapacityUnit,
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
        uom:          canonicalUom,
        notes:        notes        || null,
      },
    })
    return res.status(201).json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
