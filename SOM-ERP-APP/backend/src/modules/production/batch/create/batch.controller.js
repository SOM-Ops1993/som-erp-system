import prisma from '../../../../db.js'
import { randomUUID } from 'crypto'

const INCLUDE_ALL = {
  biomassInputs: true,
  technicalDetail: true,
  formulationCycles: { orderBy: { cycleNo: 'asc' } },
  unloadingLog: true,
  sievingLog: true,
  packingLog: true,
  qcSample: true,
  inventoryHandover: true,
}

export const createBatch = async (req, res) => {
  try {
    const { indentId, category = 'POWDER', temperature, humidity, cfuTarget } = req.body
    if (!indentId) return res.status(400).json({ success: false, error: 'indentId required', code: 'VALIDATION_ERROR' })
    const indent = await prisma.indentMaster.findUnique({ where: { indentId }, include: { details: true } })
    if (!indent) return res.status(404).json({ success: false, error: 'Indent not found', code: 'NOT_FOUND' })
    const existing = await prisma.productionBatch.findFirst({ where: { indentId, category } })
    if (existing) return res.status(409).json({ success: false, error: 'Production batch already exists for this indent', data: existing, code: 'CONFLICT' })
    const batch = await prisma.productionBatch.create({
      data: { id: randomUUID(), indentId, productCode: indent.productCode, productName: indent.productName, diNo: indent.diNo, batchCode: indent.batchNo, orderQty: indent.batchSize, category, temperature: temperature ? parseFloat(temperature) : null, humidity: humidity ? parseFloat(humidity) : null, cfuTarget: cfuTarget || null },
      include: INCLUDE_ALL,
    })
    return res.status(201).json({ success: true, data: batch })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};

export const addFormulationCycle = async (req, res) => {
  try {
    const { id } = req.params; const d = req.body
    const count = await prisma.formulationCycle.count({ where: { batchId: id } })
    const flagged = (d.sfgUsed && !d.sfgId) || !d.startTime || !d.endTime
    const cycle = await prisma.formulationCycle.create({
      data: { id: randomUUID(), batchId: id, cycleNo: count + 1, formulationDate: d.formulationDate || '', startTime: d.startTime || '', endTime: d.endTime || '', noOfWorkers: d.noOfWorkers ? parseInt(d.noOfWorkers) : null, sfgUsed: d.sfgUsed || false, sfgId: d.sfgId || null, sfgDiNo: d.sfgDiNo || null, sfgQtyUsed: d.sfgQtyUsed ? parseFloat(d.sfgQtyUsed) : null, carrierType: d.carrierType || null, inchargeName: d.inchargeName || null, flagged }
    })
    await prisma.productionBatch.update({ where: { id }, data: { formulationFlag: flagged, currentStage: 'UNLOADING', updatedAt: new Date() } })
    return res.status(201).json({ success: true, data: cycle })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};
