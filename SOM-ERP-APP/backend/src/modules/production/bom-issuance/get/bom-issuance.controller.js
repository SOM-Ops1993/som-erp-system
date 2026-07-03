import prisma from '../../../../db.js'

export const listPendingJobs = async (req, res) => {
  try {
    const jobs = await prisma.erpProductionJob.findMany({
      where:   { status: 'pending', plan: { status: 'published' } },
      include: {
        plan:      { select: { productCode: true, plannedQty: true, bomVersion: true, bomId: true, diNumber: true } },
        equipment: { select: { equipmentName: true } },
      },
    })

    // Batch-resolve sales order info and prev-batch QC
    const diNumbers = [...new Set(jobs.map(j => j.plan?.diNumber).filter(Boolean))]
    const planIds   = [...new Set(jobs.map(j => j.planId).filter(Boolean))]

    const [salesOrders, allJobs] = await Promise.all([
      diNumbers.length ? prisma.erpSalesOrder.findMany({
        where:  { diNumber: { in: diNumbers } },
        select: { diNumber: true, customerName: true, etd: true, priority: true },
      }) : [],
      planIds.length ? prisma.erpProductionJob.findMany({
        where:  { planId: { in: planIds } },
        select: { jobId: true, planId: true, batchNo: true },
      }) : [],
    ])

    const soMap  = Object.fromEntries(salesOrders.map(s => [s.diNumber, s]))
    // map: "planId-batchNo" → jobId for prev-batch lookup
    const jobMap = {}
    for (const j of allJobs) jobMap[`${j.planId}-${j.batchNo}`] = j.jobId

    const prevJobIds = jobs
      .filter(j => j.batchNo > 1)
      .map(j => jobMap[`${j.planId}-${j.batchNo - 1}`])
      .filter(Boolean)

    const qcRecords = prevJobIds.length ? await prisma.batchQcRecord.findMany({
      where:   { jobId: { in: prevJobIds } },
      select:  { jobId: true, result: true },
      orderBy: { createdAt: 'desc' },
    }) : []
    const latestQcMap = {}
    for (const qc of qcRecords) {
      if (!latestQcMap[qc.jobId]) latestQcMap[qc.jobId] = qc.result
    }

    const so  = soMap[jobs[0]?.plan?.diNumber]  // used for ordering

    const data = jobs
      .map(j => {
        const prevJobId = j.batchNo > 1 ? jobMap[`${j.planId}-${j.batchNo - 1}`] : null
        const diNo      = j.plan?.diNumber ?? null
        const orderInfo = soMap[diNo] ?? {}
        return {
          ...j,
          product_code:   j.plan?.productCode ?? null,
          planned_qty:    j.plan?.plannedQty  ?? null,
          bom_version:    j.plan?.bomVersion  ?? null,
          bom_id:         j.plan?.bomId       ?? null,
          di_number:      diNo,
          customer_name:  orderInfo.customerName ?? null,
          etd:            orderInfo.etd          ?? null,
          priority:       orderInfo.priority     ?? null,
          equipment_name: j.equipment?.equipmentName ?? null,
          prev_batch_qc:  prevJobId ? (latestQcMap[prevJobId] ?? null) : null,
          prev_batch_no:  j.batchNo - 1,
          plan:      undefined,
          equipment: undefined,
        }
      })
      .sort((a, b) => {
        const priA = a.priority === 'High' ? 2 : a.priority === 'Normal' ? 1 : 0
        const priB = b.priority === 'High' ? 2 : b.priority === 'Normal' ? 1 : 0
        if (priB !== priA) return priB - priA
        if (a.etd && b.etd) return new Date(a.etd) - new Date(b.etd)
        return a.batchNo - b.batchNo
      })

    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getJob = async (req, res) => {
  try {
    const job = await prisma.erpProductionJob.findUnique({
      where: { jobId: req.params.jobId },
      include: { plan: { select: { bomId: true, bomVersion: true, productCode: true, plannedQty: true, diNumber: true } } },
    })
    if (!job) return res.status(404).json({ success: false, error: 'Job not found', code: 'NOT_FOUND' })

    if (job.batchNo > 1) {
      const prevJob = await prisma.erpProductionJob.findFirst({
        where: { planId: job.planId, batchNo: job.batchNo - 1 },
        select: { jobId: true, status: true },
      })
      if (prevJob && !['qc_passed', 'scrapped'].includes(prevJob.status)) {
        return res.status(423).json({
          success: false,
          error: `Batch ${job.batchNo} is locked. Batch ${job.batchNo - 1} must be QC passed or scrapped first.`,
          prev_batch_status: prevJob.status,
        })
      }
    }

    const bom = await prisma.erpBomHeader.findUnique({ where: { bomId: job.plan.bomId } })
    const yieldFactor = Number(bom?.yieldPct || 98) / 100
    const batchQty = Number(job.batchQty)

    const formLines = await prisma.erpBomLineFormulation.findMany({
      where: { bomId: job.plan.bomId },
      include: { item: { select: { itemName: true, uom: true, isMicrobial: true } } },
      orderBy: { seqNo: 'asc' },
    })
    const packLines = await prisma.erpBomLinePacking.findMany({
      where: { bomId: job.plan.bomId },
      include: { item: { select: { itemName: true, uom: true } } },
      orderBy: { seqNo: 'asc' },
    })

    const enrichLine = async (line, lineType) => {
      const requiredQty = (Number(line.qtyPerUnit) * batchQty) / yieldFactor
      const issuedAgg = await prisma.erpBomIssuance.aggregate({
        where: { jobId: job.jobId, itemCode: line.itemCode },
        _sum: { issuedQty: true },
      })
      const totalIssued = Number(issuedAgg._sum.issuedQty || 0)
      const packs = await prisma.erpPack.findMany({
        where: {
          itemCode: line.itemCode,
          qrConfirmed: true,
          status: { in: ['active', 'partial'] },
          qtyRemaining: { gt: 0 },
        },
        select: { packId: true, lotNumber: true, qtyRemaining: true, inwardDate: true, status: true, location: true },
        orderBy: [{ inwardDate: 'asc' }, { createdAt: 'asc' }],
      })
      return {
        ...line,
        item_name: line.item?.itemName ?? null,
        uom: line.item?.uom ?? null,
        is_microbial: line.item?.isMicrobial ?? false,
        line_type: lineType,
        required_qty: Number(requiredQty.toFixed(6)),
        issued_qty: totalIssued,
        remaining_to_issue: Math.max(0, requiredQty - totalIssued),
        available_packs: packs,
        item: undefined,
      }
    }

    const allLines = [
      ...(await Promise.all(formLines.map(l => enrichLine(l, 'formulation')))),
      ...(await Promise.all(packLines.map(l => enrichLine(l, 'packing')))),
    ]

    const existingIssuances = await prisma.erpBomIssuance.findMany({
      where: { jobId: job.jobId },
      include: { pack: { select: { lotNumber: true } } },
      orderBy: { issuedAt: 'desc' },
    })
    const issuancesFlat = existingIssuances.map(bi => ({
      ...bi,
      lot_number: bi.pack?.lotNumber ?? null,
      pack: undefined,
    }))

    return res.json({ success: true, data: { ...job, bom, lines: allLines, issuances: issuancesFlat } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const listHistory = async (req, res) => {
  try {
    const { job_id, item_code, limit = 100, offset = 0 } = req.query
    const where = {}
    if (job_id) where.jobId = job_id
    if (item_code) where.itemCode = item_code

    const data = await prisma.erpBomIssuance.findMany({
      where,
      include: { pack: { select: { lotNumber: true, itemCode: true } } },
      orderBy: { issuedAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    })
    const result = data.map(b => ({
      ...b,
      lot_number: b.pack?.lotNumber ?? null,
      pack_item: b.pack?.itemCode ?? null,
      pack: undefined,
    }))
    return res.json({ success: true, data: result })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
