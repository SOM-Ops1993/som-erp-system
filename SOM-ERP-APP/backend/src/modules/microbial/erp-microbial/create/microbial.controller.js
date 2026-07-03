import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'

const calcCurrentCfu = (mfgCfu, decayK, mfgDate) => {
  const daysSince = (Date.now() - new Date(mfgDate).getTime()) / (1000 * 86400)
  return Number(mfgCfu) * Math.exp(-Number(decayK) * daysSince)
}

export const createContainer = async (req, res) => {
  try {
    const {
      strain_id, location_room, location_position,
      volume_litres, mfg_cfu_per_ml, mfg_date, expiry_date,
      storage_temp_c, notes,
    } = req.body || {}

    if (!strain_id || !volume_litres || !mfg_cfu_per_ml || !mfg_date || !expiry_date)
      return res.status(400).json({ success: false, error: 'strain_id, volume_litres, mfg_cfu_per_ml, mfg_date, expiry_date required', code: 'VALIDATION_ERROR' })

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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};

export const allocateCfu = async (req, res) => {
  try {
    const { strain_id, cfu_demand, required_cfu_per_ml, volume_litres } = req.body || {}
    if (!strain_id) return res.status(400).json({ success: false, error: 'strain_id required', code: 'VALIDATION_ERROR' })

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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};

export const createTransaction = async (req, res) => {
  try {
    const { container_id, job_id, volume_dispatched_l, cfu_per_ml_at_dispatch, dispatch_temp_c, receiver_name } = req.body || {}
    if (!container_id || !volume_dispatched_l || !receiver_name)
      return res.status(400).json({ success: false, error: 'container_id, volume_dispatched_l, receiver_name required', code: 'VALIDATION_ERROR' })

    const container = await prisma.microbialContainer.findUnique({
      where: { containerId: container_id },
      include: { strain: true },
    })
    if (!container) return res.status(404).json({ success: false, error: 'Container not found', code: 'NOT_FOUND' })

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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};
