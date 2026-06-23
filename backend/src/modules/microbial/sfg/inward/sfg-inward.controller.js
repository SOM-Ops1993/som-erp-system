import prisma from '../../../../db.js'

function excelDateToIso(val) {
  if (val === null || val === undefined || val === '') return ''
  if (val instanceof Date) return val.toISOString().slice(0, 10)
  const num = Number(val)
  if (!isNaN(num) && Number.isInteger(num) && num > 1000) {
    const ms = (num - 25569) * 86400 * 1000
    const d = new Date(ms)
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  }
  const s = String(val).trim()
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return s
}

async function getNextContainerSeq(microbeCode, typeCode) {
  const result = await prisma.$transaction(async (tx) => {
    await tx.microbialSfgContainerSeq.upsert({
      where: { microbeCode_typeCode: { microbeCode, typeCode } },
      create: { microbeCode, typeCode, seq: 1 },
      update: { seq: { increment: 1 } },
    })
    return tx.microbialSfgContainerSeq.findUnique({
      where: { microbeCode_typeCode: { microbeCode, typeCode } },
    })
  })
  return result?.seq || 1
}

function buildContainerCode(microbeCode, typeCode, seq) {
  return `${microbeCode}-${typeCode}-${String(seq).padStart(3, '0')}`
}

export async function listSfgContainers(req, res) {
  try {
    const { microbe_code, type_code, fill_status } = req.query
    const where = {}
    if (microbe_code) where.microbeCode = microbe_code
    if (type_code)    where.typeCode    = type_code
    if (fill_status)  where.fillStatus  = fill_status

    const rows = await prisma.microbialSfgContainer.findMany({
      where,
      include: {
        _count: { select: { inwards: { where: { status: 'ACTIVE' } } } },
      },
      orderBy: [{ microbeCode: 'asc' }, { typeCode: 'asc' }, { seqNo: 'asc' }],
    })

    const data = rows.map(r => ({ ...r, batch_count: r._count.inwards, _count: undefined }))
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listAvailableSfgContainers(req, res) {
  try {
    const { microbe_code, type_code } = req.query
    const rows = await prisma.microbialSfgContainer.findMany({
      where: {
        microbeCode: microbe_code,
        typeCode:    type_code,
        fillStatus:  { in: ['PARTIAL', 'EMPTY'] },
      },
      orderBy: [{ fillStatus: 'desc' }, { seqNo: 'asc' }],
    })
    return res.json({ success: true, data: rows })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getNextContainerCode(req, res) {
  try {
    const { microbe_code, type_code } = req.query
    if (!microbe_code || !type_code) return res.status(400).json({ success: false, error: 'microbe_code and type_code required' })

    const agg = await prisma.microbialSfgContainer.aggregate({
      where: { microbeCode: microbe_code, typeCode: type_code },
      _max: { seqNo: true },
    })
    const nextSeq = (agg._max.seqNo || 0) + 1
    return res.json({ success: true, data: { next_code: buildContainerCode(microbe_code, type_code, nextSeq), next_seq: nextSeq } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getSfgContainerBatches(req, res) {
  try {
    const rows = await prisma.microbialSfgInward.findMany({
      where: { containerId: req.params.id },
      orderBy: [{ dateOfHarvest: 'asc' }, { createdAt: 'asc' }],
    })
    return res.json({ success: true, data: rows })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listSfgInward(req, res) {
  try {
    const { microbe_code, microbe_type, status } = req.query
    const where = {}
    if (microbe_code) where.microbeCode = microbe_code
    if (microbe_type) where.microbeType = microbe_type
    if (status)       where.status      = status

    const rows = await prisma.microbialSfgInward.findMany({
      where,
      include: { container: { select: { location: true, fillStatus: true } } },
      orderBy: [{ dateOfHarvest: 'asc' }, { createdAt: 'asc' }],
    })

    const data = rows.map(r => ({
      ...r,
      container_location:    r.container?.location    ?? null,
      container_fill_status: r.container?.fillStatus  ?? null,
      container: undefined,
    }))
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

// GROUP BY with FILTER aggregates — kept as $queryRaw (Prisma groupBy doesn't support FILTER)
export async function getSfgInwardSummary(req, res) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT i.microbe_code, i.microbe_name, i.microbe_type,
             COUNT(*) FILTER (WHERE i.status = 'ACTIVE') AS active_batches,
             COALESCE(SUM(i.remaining_qty_kg) FILTER (WHERE i.status = 'ACTIVE'), 0) AS total_remaining_kg,
             COALESCE(AVG(i.inhouse_cfu_per_g) FILTER (WHERE i.status = 'ACTIVE'), 0) AS avg_cfu_per_g,
             MAX(i.date_of_harvest) AS latest_harvest
      FROM microbial_sfg_inward i
      GROUP BY i.microbe_code, i.microbe_name, i.microbe_type
      ORDER BY i.microbe_name, i.microbe_type
    `
    return res.json({ success: true, data: rows })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createSfgInward(req, res) {
  try {
    const {
      container_id, new_container_code, microbe_id, microbe_code, microbe_name, microbe_type, type_code,
      inhouse_cfu_per_g, biomass_batch_code, date_of_harvest, total_qty_kg,
      location, moisture, shelf_life_days, fill_status,
    } = req.body || {}

    if (!microbe_code || !microbe_type || !inhouse_cfu_per_g || !biomass_batch_code || !date_of_harvest || !total_qty_kg)
      return res.status(400).json({ success: false, error: 'Required: microbe_code, microbe_type, inhouse_cfu_per_g, biomass_batch_code, date_of_harvest, total_qty_kg' })

    const tCode = (type_code || microbe_type).toUpperCase()
    const qty = Number(total_qty_kg)

    const result = await prisma.$transaction(async (tx) => {
      let resolvedContainerId = container_id
      let resolvedContainerCode

      if (!resolvedContainerId) {
        const seq = await getNextContainerSeq(microbe_code, tCode)
        const code = new_container_code || buildContainerCode(microbe_code, tCode, seq)
        const container = await tx.microbialSfgContainer.create({
          data: {
            containerCode: code,
            microbeId: microbe_id || null,
            microbeCode: microbe_code,
            microbeName: microbe_name || microbe_code,
            microbeType: microbe_type,
            typeCode: tCode,
            seqNo: seq,
            location: location || null,
            currentQtyKg: qty,
            fillStatus: fill_status || 'PARTIAL',
          },
        })
        resolvedContainerId = container.containerId
        resolvedContainerCode = code
      } else {
        const container = await tx.microbialSfgContainer.findUnique({ where: { containerId: resolvedContainerId } })
        if (!container) throw new Error('Container not found')
        resolvedContainerCode = container.containerCode
      }

      const inward = await tx.microbialSfgInward.create({
        data: {
          containerId: resolvedContainerId,
          containerCode: resolvedContainerCode,
          microbeId: microbe_id || null,
          microbeCode: microbe_code,
          microbeName: microbe_name || microbe_code,
          microbeType: microbe_type,
          inhouseCfuPerG: Number(inhouse_cfu_per_g),
          biomassBatchCode: biomass_batch_code,
          dateOfHarvest: new Date(date_of_harvest),
          totalQtyKg: qty,
          remainingQtyKg: qty,
          location: location || null,
          moisture: moisture != null ? Number(moisture) : null,
          shelfLifeDays: shelf_life_days != null ? Number(shelf_life_days) : null,
          fillStatus: fill_status || 'PARTIAL',
        },
      })

      if (container_id) {
        await tx.microbialSfgContainer.update({
          where: { containerId: resolvedContainerId },
          data: {
            currentQtyKg: { increment: qty },
            fillStatus: fill_status || 'PARTIAL',
            location: location || undefined,
          },
        })
      }

      return inward
    })

    return res.status(201).json({ success: true, data: result })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function updateSfgInward(req, res) {
  try {
    const { remaining_qty_kg, fill_status, status, location, moisture, shelf_life_days } = req.body || {}
    const data = {}
    if (remaining_qty_kg !== undefined) data.remainingQtyKg = Number(remaining_qty_kg)
    if (fill_status !== undefined)      data.fillStatus     = fill_status
    if (status !== undefined)           data.status         = status
    if (location !== undefined)         data.location       = location
    if (moisture !== undefined)         data.moisture       = Number(moisture)
    if (shelf_life_days !== undefined)  data.shelfLifeDays  = Number(shelf_life_days)

    const row = await prisma.microbialSfgInward.update({
      where: { inwardId: req.params.id },
      data,
    })
    return res.json({ success: true, data: row })
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ success: false, error: 'Inward record not found' })
    return res.status(500).json({ success: false, error: e.message })
  }
}

export async function importSfgInward(req, res) {
  try {
    const { rows } = req.body || {}
    if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ success: false, error: 'rows array required' })

    let imported = 0, skipped = 0
    const errors = []

    for (const r of rows) {
      const microbe_name  = (r['Microbe Name'] || r.microbe_name || '').toString().trim()
      const microbe_type  = (r['Microbe Type'] || r.microbe_type || '').toString().trim().toUpperCase()
      const cfu           = parseFloat(r['Inhouse CFU/g'] || r.inhouse_cfu_per_g || 0)
      const batchCode     = (r['Biomass Batch Code'] || r.biomass_batch_code || '').toString().trim()
      const harvestDate   = excelDateToIso(r['Date of Harvest'] ?? r.date_of_harvest ?? '')
      const qty           = parseFloat(r['Total Qty (kg)'] || r.total_qty_kg || 0)
      const location      = (r['Location'] || r.location || '').toString().trim() || null
      const moisture      = parseFloat(r['Moisture'] || r.moisture || '') || null
      const shelfLife     = parseInt(r['Shelf Life (days)'] || r.shelf_life_days || '') || null
      const fill          = (r['Fill Status'] || r.fill_status || 'PARTIAL').toString().toUpperCase()
      const containerCode = (r['Container Code'] || r.container_code || '').toString().trim()

      if (!microbe_name || !microbe_type || !cfu || !batchCode || !harvestDate || !qty) {
        skipped++
        const missing = [!microbe_name && 'Microbe Name', !microbe_type && 'Microbe Type', !cfu && 'Inhouse CFU/g', !batchCode && 'Biomass Batch Code', !harvestDate && 'Date of Harvest', !qty && 'Total Qty (kg)'].filter(Boolean).join(', ')
        errors.push({ row: microbe_name || JSON.stringify(r).slice(0, 60), error: `Missing: ${missing}` })
        continue
      }

      try {
        const microbe = await prisma.microbeMaster.findFirst({
          where: { microbeName: { equals: microbe_name, mode: 'insensitive' } },
        })
        const microbeId   = microbe?.microbeId   || null
        const microbeCode = microbe?.microbeCode || microbe_name.replace(/\s+/g, '_').toUpperCase()
        const typeCode    = microbe_type.substring(0, 3)

        let containerId, resolvedCode = containerCode
        if (containerCode) {
          let container = await prisma.microbialSfgContainer.findUnique({ where: { containerCode } })
          if (!container) {
            container = await prisma.microbialSfgContainer.create({
              data: { containerCode, microbeId, microbeCode, microbeName: microbe_name, microbeType: microbe_type, typeCode, seqNo: 1, location, currentQtyKg: qty, fillStatus: fill },
            })
          }
          containerId = container.containerId
        } else {
          const seq = await getNextContainerSeq(microbeCode, typeCode)
          resolvedCode = buildContainerCode(microbeCode, typeCode, seq)
          const container = await prisma.microbialSfgContainer.create({
            data: { containerCode: resolvedCode, microbeId, microbeCode, microbeName: microbe_name, microbeType: microbe_type, typeCode, seqNo: seq, location, currentQtyKg: qty, fillStatus: fill },
          })
          containerId = container.containerId
        }

        await prisma.microbialSfgInward.create({
          data: { containerId, containerCode: resolvedCode, microbeId, microbeCode, microbeName: microbe_name, microbeType: microbe_type, inhouseCfuPerG: cfu, biomassBatchCode: batchCode, dateOfHarvest: new Date(harvestDate), totalQtyKg: qty, remainingQtyKg: qty, location, moisture, shelfLifeDays: shelfLife, fillStatus: fill },
        })
        await prisma.microbialSfgContainer.update({
          where: { containerId },
          data: { currentQtyKg: { increment: qty }, fillStatus: fill },
        })

        imported++
      } catch (e) {
        errors.push({ row: microbe_name || JSON.stringify(r).slice(0, 60), error: e.message })
        skipped++
      }
    }

    return res.json({ success: true, imported, skipped, errors })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
