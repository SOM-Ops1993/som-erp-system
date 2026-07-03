import prisma from '../../../../db.js'

const calcCurrentCfu = (mfgCfu, decayK, mfgDate) => {
  const daysSince = (Date.now() - new Date(mfgDate).getTime()) / (1000 * 86400)
  return Number(mfgCfu) * Math.exp(-Number(decayK) * daysSince)
}

const containerStatus = (currentCfu, mfgCfu, expiryDate) => {
  const cfuRatio = currentCfu / Number(mfgCfu)
  const daysToExpiry = (new Date(expiryDate) - Date.now()) / (1000 * 86400)
  if (cfuRatio < 0.3 || daysToExpiry < 10) return 'at_risk'
  if (cfuRatio < 0.5 || daysToExpiry < 30) return 'watch'
  return 'healthy'
}

const enrichContainer = (c) => {
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

export const listContainers = async (req, res) => {
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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};

export const getContainer = async (req, res) => {
  try {
    const container = await prisma.microbialContainer.findUnique({
      where: { containerId: req.params.id },
      include: { strain: true, transactions: { orderBy: { dispatchDate: 'desc' } } },
    })
    if (!container) return res.status(404).json({ success: false, error: 'Container not found', code: 'NOT_FOUND' })

    return res.json({ success: true, data: enrichContainer(container) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};

export const listTransactions = async (req, res) => {
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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};

export const getDecayReport = async (req, res) => {
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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};
