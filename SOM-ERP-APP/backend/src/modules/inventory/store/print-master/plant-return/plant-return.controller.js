import { generatePackBatch } from '../../../../../services/pack-generator.js'

const plantReturn = async (req, res) => {
  const { itemCode, itemName, uom, perPackQty, numberOfPacks, plant, returnedBy } = req.body
  
  try {

    if (!itemCode || !itemName || !uom || !perPackQty || !numberOfPacks)
      return res.status(400).json({ success: false, error: 'itemCode, itemName, uom, perPackQty and numberOfPacks are required' })

    if (parseInt(numberOfPacks) < 1 || parseFloat(perPackQty) <= 0)
      return res.status(400).json({ success: false, error: 'numberOfPacks must be ≥ 1 and perPackQty must be > 0' })

    const supplierLabel = plant ? `Plant Return — ${plant}` : 'Plant Return'
    const result = await generatePackBatch({
      itemCode,
      itemName,
      numberOfBags: parseInt(numberOfPacks),
      packQty:      parseFloat(perPackQty),
      uom,
      supplier:     supplierLabel,
      invoiceNo:    returnedBy ? `RET-${returnedBy.replace(/\s+/g, '-').toUpperCase()}` : 'PLANT-RETURN',
      receivedDate: new Date(),
    })

    return res.status(201).json({ success: true, data: result })

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export { plantReturn }
