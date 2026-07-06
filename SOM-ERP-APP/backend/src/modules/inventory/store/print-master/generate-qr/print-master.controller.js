import { generatePackBatch } from "../../../../../services/pack-generator.js";
import { toCanonical } from "../../../../../utils/uom.js";

export const generatePacks = async (req, res) => {
  const { itemCode, itemName, numberOfBags, packQty, uom, supplier, invoiceNo, receivedDate } = req.body;
 
  try {
    if (!itemCode || !itemName || !numberOfBags || !packQty || !uom)
      return res.status(400).json({ success: false, error: "itemCode, itemName, numberOfBags, packQty, uom are required", code: 'VALIDATION_ERROR' });

    let canonical;
    try {
      canonical = toCanonical(parseFloat(packQty), uom);
    } catch (e) {
      return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' });
    }

    const result = await generatePackBatch({
      itemCode, itemName,
      numberOfBags: parseInt(numberOfBags),
      packQty: canonical.qty, uom: canonical.uom,
      supplier, invoiceNo, receivedDate,
    });

    return res.status(201).json({ success: true, data: result });
    
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}