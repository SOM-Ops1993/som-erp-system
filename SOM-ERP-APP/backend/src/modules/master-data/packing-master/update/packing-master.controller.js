import prisma from '../../../../db.js'

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

    const item = await prisma.packingMaterial.update({
      where: { id },
      data: {
        itemName:     itemName?.trim(),
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
    return res.json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
