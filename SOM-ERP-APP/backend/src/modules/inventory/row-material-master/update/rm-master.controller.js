import prisma from '../../../../db.js'
import { normalizeUom, CANONICAL_UNITS } from '../../../../utils/uom.js'

export const updateRm = async (req, res) => {
  try {
    const { itemName, uom, trackingType } = req.body
    let canonicalUom = uom
    if (uom) {
      canonicalUom = normalizeUom(uom)
      if (!CANONICAL_UNITS.includes(canonicalUom))
        return res.status(400).json({ success: false, error: `uom must convert to one of ${CANONICAL_UNITS.join(', ')} — got "${uom}"`, code: 'VALIDATION_ERROR' })
    }
    const data = { itemName, uom: canonicalUom }
    if (trackingType) data.trackingType = trackingType
    const item = await prisma.rmMaster.update({ where: { itemCode: req.params.itemCode }, data })
    return res.json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
