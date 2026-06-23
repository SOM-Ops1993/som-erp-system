import { generatePackBatch } from "../../services/pack-generator.js";

export async function generatePacks(req, res) {
  try {
    const { itemCode, itemName, numberOfBags, packQty, uom, supplier, invoiceNo, receivedDate } = req.body;
    if (!itemCode || !itemName || !numberOfBags || !packQty || !uom)
      return res.status(400).json({ success: false, error: "itemCode, itemName, numberOfBags, packQty, uom are required" });
    const result = await generatePackBatch({
      itemCode, itemName,
      numberOfBags: parseInt(numberOfBags),
      packQty: parseFloat(packQty),
      uom, supplier, invoiceNo, receivedDate,
    });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
