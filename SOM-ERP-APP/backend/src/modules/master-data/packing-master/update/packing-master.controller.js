import prisma from '../../../../db.js'
import { toCanonical, normalizeUom, CANONICAL_UNITS } from '../../../../utils/uom.js'

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

export const updatePackingMaterial = async (req, res) => {
  try {
    const { id } = req.params
    const {
      itemName, category, subType, material,
      capacity, capacityUnit, length, width, height,
      ply, shape, color, laminate, contentsSpec, packCount, quantity, uom, notes,
    } = req.body

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

    const item = await prisma.packingMaterial.update({
      where: { id },
      data: {
        itemName:     itemName?.trim(),
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
    return res.json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
