import prisma from '../../../db.js'
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

export async function listBatches(req, res) {
  try {
    const { category = 'POWDER', status, page = 1, limit = 50 } = req.query
    const where = { category }
    if (status) where.status = status
    const [batches, total] = await Promise.all([
      prisma.productionBatch.findMany({
        where,
        include: { biomassInputs: { select: { id: true } }, formulationCycles: { select: { id: true } }, packingLog: { select: { totalQtyPacked: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.productionBatch.count({ where })
    ])
    return res.json({ success: true, data: batches, total })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createBatch(req, res) {
  try {
    const { indentId, category = 'POWDER', temperature, humidity, cfuTarget } = req.body
    if (!indentId) return res.status(400).json({ success: false, error: 'indentId required' })
    const indent = await prisma.indentMaster.findUnique({ where: { indentId }, include: { details: true } })
    if (!indent) return res.status(404).json({ success: false, error: 'Indent not found' })
    const existing = await prisma.productionBatch.findFirst({ where: { indentId, category } })
    if (existing) return res.status(409).json({ success: false, error: 'Production batch already exists for this indent', data: existing })
    const batch = await prisma.productionBatch.create({
      data: { id: randomUUID(), indentId, productCode: indent.productCode, productName: indent.productName, diNo: indent.diNo, batchCode: indent.batchNo, orderQty: indent.batchSize, category, temperature: temperature ? parseFloat(temperature) : null, humidity: humidity ? parseFloat(humidity) : null, cfuTarget: cfuTarget || null },
      include: INCLUDE_ALL,
    })
    return res.status(201).json({ success: true, data: batch })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getBatch(req, res) {
  try {
    const batch = await prisma.productionBatch.findUnique({ where: { id: req.params.id }, include: INCLUDE_ALL })
    if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' })
    return res.json({ success: true, data: batch })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function patchBatch(req, res) {
  try {
    const allowed = ['currentStage','status','temperature','humidity','cfuTarget','biomassFlag','technicalFlag','formulationFlag','sievingFlag','packingFlag','qcFlag']
    const data = {}
    for (const k of allowed) if (req.body[k] !== undefined) data[k] = req.body[k]
    data.updatedAt = new Date()
    const batch = await prisma.productionBatch.update({ where: { id: req.params.id }, data, include: INCLUDE_ALL })
    return res.json({ success: true, data: batch })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function saveBiomass(req, res) {
  try {
    const { rows = [] } = req.body
    const { id } = req.params
    const batch = await prisma.productionBatch.findUnique({ where: { id } })
    if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' })
    await prisma.biomassInput.deleteMany({ where: { batchId: id } })
    const created = await Promise.all(rows.map(row =>
      prisma.biomassInput.create({
        data: { id: randomUUID(), batchId: id, cultureName: row.cultureName || '', batchNo: row.batchNo || '', doi: row.doi || '', cfuPerGram: row.cfuPerGram ? parseFloat(row.cfuPerGram) : null, biomassQty: row.biomassQty ? parseFloat(row.biomassQty) : null, moisture: row.moisture ? parseFloat(row.moisture) : null, form: row.form || '', receivedFrom: row.receivedFrom || '', receivedDate: row.receivedDate || '', receivedTime: row.receivedTime || '', flagged: !row.cfuPerGram || !row.biomassQty }
      })
    ))
    const anyFlagged = created.some(r => r.flagged)
    await prisma.productionBatch.update({ where: { id }, data: { biomassFlag: anyFlagged, currentStage: 'TECHNICAL', updatedAt: new Date() } })
    return res.json({ success: true, data: created })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function saveTechnical(req, res) {
  try {
    const { id } = req.params; const d = req.body
    const biomassQty = d.biomassQty ? parseFloat(d.biomassQty) : null
    const silicaQty = biomassQty ? parseFloat((biomassQty * 0.40).toFixed(3)) : (d.silicaQty ? parseFloat(d.silicaQty) : null)
    const caco3Qty  = biomassQty ? parseFloat((biomassQty * 0.30).toFixed(3)) : (d.caco3Qty ? parseFloat(d.caco3Qty) : null)
    const mgStearateQty = biomassQty ? parseFloat((biomassQty * 0.10).toFixed(3)) : (d.mgStearateQty ? parseFloat(d.mgStearateQty) : null)
    const smpQty = biomassQty ? parseFloat((biomassQty * 0.10).toFixed(3)) : (d.smpQty ? parseFloat(d.smpQty) : null)
    const coFormulants = (silicaQty || 0) + (caco3Qty || 0) + (mgStearateQty || 0) + (smpQty || 0)
    const totalTechnicalQty = biomassQty ? parseFloat((biomassQty + coFormulants).toFixed(3)) : (d.totalTechnicalQty ? parseFloat(d.totalTechnicalQty) : null)
    const qtyAfterSieving = d.qtyAfterSieving ? parseFloat(d.qtyAfterSieving) : null
    const wastage = totalTechnicalQty && qtyAfterSieving ? parseFloat((totalTechnicalQty - qtyAfterSieving).toFixed(3)) : null
    const flagged = !d.startTime || !d.endTime
    const upsertData = { batchId: id, method: d.method || 'MANUAL', startTime: d.startTime || '', endTime: d.endTime || '', biomassQty, silicaQty, caco3Qty, mgStearateQty, smpQty, totalTechnicalQty, qtyAfterSieving, wastage, flagged }
    const tech = await prisma.technicalDetail.upsert({ where: { batchId: id }, create: { id: randomUUID(), ...upsertData }, update: upsertData })
    await prisma.productionBatch.update({ where: { id }, data: { technicalFlag: flagged, currentStage: 'FORMULATION', updatedAt: new Date() } })
    return res.json({ success: true, data: tech })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function addFormulationCycle(req, res) {
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
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function updateFormulationCycle(req, res) {
  try {
    const d = req.body
    const flagged = (d.sfgUsed && !d.sfgId) || !d.startTime || !d.endTime
    const cycle = await prisma.formulationCycle.update({
      where: { id: req.params.cycleId },
      data: { formulationDate: d.formulationDate || '', startTime: d.startTime || '', endTime: d.endTime || '', noOfWorkers: d.noOfWorkers ? parseInt(d.noOfWorkers) : null, sfgUsed: d.sfgUsed || false, sfgId: d.sfgId || null, sfgDiNo: d.sfgDiNo || null, sfgQtyUsed: d.sfgQtyUsed ? parseFloat(d.sfgQtyUsed) : null, carrierType: d.carrierType || null, inchargeName: d.inchargeName || null, flagged }
    })
    return res.json({ success: true, data: cycle })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function deleteFormulationCycle(req, res) {
  try {
    await prisma.formulationCycle.delete({ where: { id: req.params.cycleId } })
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function saveUnloading(req, res) {
  try {
    const { id } = req.params; const d = req.body
    const flagged = !d.weightAfter
    const data = { batchId: id, startTime: d.startTime || '', endTime: d.endTime || '', weightAfter: d.weightAfter ? parseFloat(d.weightAfter) : null, noOfWorkers: d.noOfWorkers ? parseInt(d.noOfWorkers) : null, inchargeName: d.inchargeName || null, flagged }
    const log = await prisma.unloadingLog.upsert({ where: { batchId: id }, create: { id: randomUUID(), ...data }, update: data })
    await prisma.productionBatch.update({ where: { id }, data: { currentStage: 'SIEVING', updatedAt: new Date() } })
    return res.json({ success: true, data: log })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function saveSieving(req, res) {
  try {
    const { id } = req.params; const d = req.body
    const flagged = d.sievingDone && !d.meshSize
    const data = { batchId: id, sievingDone: d.sievingDone || false, meshSize: d.meshSize || null, startTime: d.startTime || '', endTime: d.endTime || '', noOfWorkers: d.noOfWorkers ? parseInt(d.noOfWorkers) : null, inchargeName: d.inchargeName || null, flagged }
    const log = await prisma.sievingLog.upsert({ where: { batchId: id }, create: { id: randomUUID(), ...data }, update: data })
    await prisma.productionBatch.update({ where: { id }, data: { sievingFlag: flagged, currentStage: 'PACKING', updatedAt: new Date() } })
    return res.json({ success: true, data: log })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function savePacking(req, res) {
  try {
    const { id } = req.params; const d = req.body
    const flagged = !d.totalQtyPacked
    const data = { batchId: id, packingType: d.packingType || null, weightPerUnit: d.weightPerUnit ? parseFloat(d.weightPerUnit) : null, totalUnitsPacked: d.totalUnitsPacked ? parseInt(d.totalUnitsPacked) : null, totalQtyPacked: d.totalQtyPacked ? parseFloat(d.totalQtyPacked) : null, unitsPerBag: d.unitsPerBag ? parseInt(d.unitsPerBag) : null, totalOuterPackages: d.totalOuterPackages ? parseInt(d.totalOuterPackages) : null, packingStart: d.packingStart || '', packingEnd: d.packingEnd || '', labelingStart: d.labelingStart || '', labelingEnd: d.labelingEnd || '', strappingStart: d.strappingStart || '', strappingEnd: d.strappingEnd || '', stretchWrapping: d.stretchWrapping || false, noOfCartons: d.noOfCartons ? parseInt(d.noOfCartons) : null, noOfWorkers: d.noOfWorkers ? parseInt(d.noOfWorkers) : null, inchargeName: d.inchargeName || null, flagged }
    const log = await prisma.packingLog.upsert({ where: { batchId: id }, create: { id: randomUUID(), ...data }, update: data })
    await prisma.productionBatch.update({ where: { id }, data: { packingFlag: flagged, currentStage: 'QC', updatedAt: new Date() } })
    return res.json({ success: true, data: log })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function saveQc(req, res) {
  try {
    const { id } = req.params; const d = req.body
    const flagged = d.sampleCollected && !d.submittedOn
    const data = { batchId: id, sampleCollected: d.sampleCollected || false, sampleId: d.sampleId || null, collectedAtStage: d.collectedAtStage || null, submittedOn: d.submittedOn || null, rxAttached: d.rxAttached || false, flagged }
    const qc = await prisma.qcSample.upsert({ where: { batchId: id }, create: { id: randomUUID(), ...data }, update: data })
    await prisma.productionBatch.update({ where: { id }, data: { qcFlag: flagged, currentStage: 'INVENTORY', updatedAt: new Date() } })
    return res.json({ success: true, data: qc })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function saveInventory(req, res) {
  try {
    const { id } = req.params; const d = req.body
    const data = { batchId: id, sentToInventoryOn: d.sentToInventoryOn || null, handedOverTo: d.handedOverTo || null, leftoverQtyAt: d.leftoverQtyAt || null, sfgUpdated: d.sfgUpdated || false }
    const inv = await prisma.inventoryHandover.upsert({ where: { batchId: id }, create: { id: randomUUID(), ...data }, update: data })
    if (d.sfgUpdated && d.packedQty) {
      const batch = await prisma.productionBatch.findUnique({ where: { id } })
      if (batch) {
        const sfg = await prisma.sfgMaster.findFirst({ where: { indentId: batch.indentId } })
        if (sfg) {
          const newPacked = Number(sfg.packedQty) + parseFloat(d.packedQty)
          const newSfgQty = Math.max(0, Number(sfg.formulatedQty) - newPacked)
          await prisma.sfgMaster.update({ where: { sfgId: sfg.sfgId }, data: { packedQty: newPacked, sfgQty: newSfgQty, status: newSfgQty <= 0 ? 'COMPLETE' : 'PARTIAL' } })
        }
      }
    }
    await prisma.productionBatch.update({ where: { id }, data: { status: 'COMPLETED', updatedAt: new Date() } })
    return res.json({ success: true, data: inv })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
