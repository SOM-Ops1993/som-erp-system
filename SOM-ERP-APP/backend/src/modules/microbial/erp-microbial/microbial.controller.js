import prisma from '../../../db.js'
import { writeAudit, auditUser } from '../../../middleware/audit.js'
import { createNotification } from '../../../services/notification-service.js'

function calcCurrentCfu(mfgCfu, decayK, mfgDate) {
  const daysSince = (Date.now() - new Date(mfgDate).getTime()) / (1000 * 86400)
  return Number(mfgCfu) * Math.exp(-Number(decayK) * daysSince)
}

function containerStatus(currentCfu, mfgCfu, expiryDate) {
  const cfuRatio = currentCfu / Number(mfgCfu)
  const daysToExpiry = (new Date(expiryDate) - Date.now()) / (1000 * 86400)
  if (cfuRatio < 0.3 || daysToExpiry < 10) return 'at_risk'
  if (cfuRatio < 0.5 || daysToExpiry < 30) return 'watch'
  return 'healthy'
}

function enrichContainer(c) {
  const currentCfu = calcCurrentCfu(c.mfgCfuPerMl, c.strain.decayK, c.mfgDate)
  return {
    ...c,
    strain_name: c.strain.strainName,
    decay_k: c.strain.decayK,
    optimal_temp_c: c.strain.optimalTempC,
    min_viable_cfu_per_ml: c.strain.minViableCfuPerMl,
    current_cfu_per_ml: Number(currentCfu.toFixed(2)),
    cfu_ratio_pct: Number(((currentCfu / Number(c.mfgCfuPerMl)) * 100).toFixed(1)),
    days_to_expiry: Math.max(0, Math.floor((new Date(c.expiryDate) - Date.now()) / 86400000)),
    computed_status: containerStatus(currentCfu, c.mfgCfuPerMl, c.expiryDate),
  }
}

export async function listContainers(req, res) {
  try {
    const { strain_id, status } = req.query
    const where = {}
    if (strain_id) where.strainId = strain_id
    if (status) where.status = status

    const containers = await prisma.microbialContainer.findMany({
      where,
      include: { strain: true },
      orderBy: { expiryDate: 'asc' },
    })

    return res.json({ success: true, data: containers.map(enrichContainer) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getContainer(req, res) {
  try {
    const container = await prisma.microbialContainer.findUnique({
      where: { containerId: req.params.id },
      include: { strain: true, transactions: { orderBy: { dispatchDate: 'desc' } } },
    })
    if (!container) return res.status(404).json({ success: false, error: 'Container not found' })

    return res.json({ success: true, data: enrichContainer(container) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createContainer(req, res) {
  try {
    const {
      strain_id, location_room, location_position,
      volume_litres, mfg_cfu_per_ml, mfg_date, expiry_date,
      storage_temp_c, notes,
    } = req.body || {}

    if (!strain_id || !volume_litres || !mfg_cfu_per_ml || !mfg_date || !expiry_date)
      return res.status(400).json({ success: false, error: 'strain_id, volume_litres, mfg_cfu_per_ml, mfg_date, expiry_date required' })

    const container = await prisma.microbialContainer.create({
      data: {
        strainId: strain_id,
        locationRoom: location_room || null,
        locationPosition: location_position || null,
        volumeLitres: volume_litres,
        mfgCfuPerMl: mfg_cfu_per_ml,
        mfgDate: new Date(mfg_date),
        expiryDate: new Date(expiry_date),
        storageTempC: storage_temp_c || null,
        notes: notes || null,
      },
    })

    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'microbial_containers', recordId: container.containerId, newValue: req.body })
    return res.status(201).json({ success: true, data: container })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function patchContainer(req, res) {
  try {
    const { location_room, location_position, storage_temp_c, status, notes } = req.body || {}

    const data = {}
    if (location_room !== undefined)    data.locationRoom     = location_room
    if (location_position !== undefined) data.locationPosition = location_position
    if (storage_temp_c !== undefined)   data.storageTempC     = storage_temp_c
    if (status !== undefined)           data.status           = status
    if (notes !== undefined)            data.notes            = notes

    await prisma.microbialContainer.update({
      where: { containerId: req.params.id },
      data,
    })

    await writeAudit({ ...auditUser(req), action: 'UPDATE', tableName: 'microbial_containers', recordId: req.params.id, newValue: req.body })
    return res.json({ success: true, message: 'Container updated' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function allocateCfu(req, res) {
  try {
    const { strain_id, cfu_demand, required_cfu_per_ml, volume_litres } = req.body || {}
    if (!strain_id) return res.status(400).json({ success: false, error: 'strain_id required' })

    const totalCfuDemand = cfu_demand
      ? Number(cfu_demand)
      : (Number(required_cfu_per_ml || 1e8) * Number(volume_litres || 1) * 1000 * 1.20)

    const containers = await prisma.microbialContainer.findMany({
      where: {
        strainId: strain_id,
        status: { in: ['healthy', 'watch'] },
        expiryDate: { gt: new Date() },
      },
      include: { strain: true },
      orderBy: { mfgDate: 'desc' },
    })

    let cfuMet = 0
    const allocation = []
    for (const c of containers) {
      if (cfuMet >= totalCfuDemand) break
      const currentCfu = calcCurrentCfu(c.mfgCfuPerMl, c.strain.decayK, c.mfgDate)
      const cfuStillNeeded = totalCfuDemand - cfuMet
      const volumeToUse = Math.min(Number(c.volumeLitres), cfuStillNeeded / (currentCfu * 1000))
      const cfuContrib = currentCfu * volumeToUse * 1000
      cfuMet += cfuContrib
      allocation.push({
        container_id: c.containerId,
        location: `${c.locationRoom || ''} ${c.locationPosition || ''}`.trim(),
        current_cfu_per_ml: Number(currentCfu.toFixed(2)),
        volume_litres: Number(c.volumeLitres),
        volume_to_use: Number(volumeToUse.toFixed(3)),
        cfu_contribution: cfuContrib.toExponential(2),
        expiry_date: c.expiryDate,
      })
    }

    return res.json({
      success: true,
      data: {
        cfu_demand: totalCfuDemand.toExponential(2),
        cfu_allocated: cfuMet.toExponential(2),
        sufficient: cfuMet >= totalCfuDemand,
        allocation,
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createTransaction(req, res) {
  try {
    const { container_id, job_id, volume_dispatched_l, cfu_per_ml_at_dispatch, dispatch_temp_c, receiver_name } = req.body || {}
    if (!container_id || !volume_dispatched_l || !receiver_name)
      return res.status(400).json({ success: false, error: 'container_id, volume_dispatched_l, receiver_name required' })

    const container = await prisma.microbialContainer.findUnique({
      where: { containerId: container_id },
      include: { strain: true },
    })
    if (!container) return res.status(404).json({ success: false, error: 'Container not found' })

    const currentCfu = calcCurrentCfu(container.mfgCfuPerMl, container.strain.decayK, container.mfgDate)

    const tx = await prisma.microbialTransaction.create({
      data: {
        containerId: container_id,
        jobId: job_id || null,
        volumeDispatchedL: volume_dispatched_l,
        cfuPerMlAtDispatch: cfu_per_ml_at_dispatch ?? Number(currentCfu.toFixed(2)),
        dispatchTempC: dispatch_temp_c || null,
        dispatchedBy: req.user?.user_id || null,
        receiverName: receiver_name,
      },
    })

    await writeAudit({ ...auditUser(req), action: 'DISPATCH', tableName: 'microbial_transactions', recordId: tx.id, newValue: req.body })
    return res.status(201).json({ success: true, data: tx })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function confirmReceipt(req, res) {
  try {
    const { actual_cfu_on_receipt, receipt_notes } = req.body || {}

    await prisma.microbialTransaction.update({
      where: { id: req.params.id },
      data: {
        receiptConfirmed: true,
        receiptConfirmedAt: new Date(),
        actualCfuOnReceipt: actual_cfu_on_receipt || null,
        receiptNotes: receipt_notes || null,
      },
    })

    await writeAudit({ ...auditUser(req), action: 'CONFIRM_RECEIPT', tableName: 'microbial_transactions', recordId: req.params.id })
    return res.json({ success: true, message: 'Receipt confirmed' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listTransactions(req, res) {
  try {
    const { container_id, unconfirmed_only, limit = 100, offset = 0 } = req.query
    const where = {}
    if (container_id) where.containerId = container_id
    if (unconfirmed_only === 'true') where.receiptConfirmed = false

    const data = await prisma.microbialTransaction.findMany({
      where,
      include: {
        container: {
          include: { strain: { select: { strainName: true } } },
        },
      },
      orderBy: { dispatchDate: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    })

    // flatten to snake_case shape controllers downstream expect
    const rows = data.map(t => ({
      ...t,
      strain_name: t.container?.strain?.strainName ?? null,
      dispatched_by_name: null, // no User relation yet; keep field for API compat
    }))

    return res.json({ success: true, data: rows })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getDecayReport(req, res) {
  try {
    const containers = await prisma.microbialContainer.findMany({
      where: { status: { not: 'exhausted' } },
      include: { strain: true },
      orderBy: { expiryDate: 'asc' },
    })

    const today = new Date()
    const report = containers.map(c => {
      const days = (today - new Date(c.mfgDate)) / 86400000
      const currentCfu = Number(c.mfgCfuPerMl) * Math.exp(-Number(c.strain.decayK) * days)
      const halfLife = Math.log(2) / Number(c.strain.decayK)
      const projections = [7, 14, 30, 60, 90].map(d => ({
        days_from_now: d,
        projected_cfu: Number((Number(c.mfgCfuPerMl) * Math.exp(-Number(c.strain.decayK) * (days + d))).toFixed(2)),
      }))
      return {
        ...c,
        strain_name: c.strain.strainName,
        decay_k: c.strain.decayK,
        current_cfu_per_ml: Number(currentCfu.toFixed(2)),
        cfu_ratio_pct: Number(((currentCfu / Number(c.mfgCfuPerMl)) * 100).toFixed(1)),
        days_since_mfg: Math.floor(days),
        days_to_expiry: Math.max(0, Math.floor((new Date(c.expiryDate) - today) / 86400000)),
        half_life_days: Number(halfLife.toFixed(1)),
        projections,
        computed_status: containerStatus(currentCfu, c.mfgCfuPerMl, c.expiryDate),
      }
    })

    return res.json({ success: true, data: report })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
