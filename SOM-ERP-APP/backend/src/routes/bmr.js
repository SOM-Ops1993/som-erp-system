// routes/bmr.js
// Digital BMR (Batch Manufacturing Record) — Powder Section
// Covers: Section A (env), B (technical), C (formulation), D (packing), E (COA)
// + Deviations, Samples, Analytics events

import prisma from '../db.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

// Create in-app notification (uses new Prisma Notification model)
async function notify({ title, message, role, section, link, userId }) {
  try {
    await prisma.notification.create({
      data: { title, message, role: role || null, section: section || null,
              link: link || null, userId: userId || null, notifType: 'IN_APP' }
    })
  } catch (e) { console.error('[BMR notify]', e.message) }
}

// Broadcast to multiple roles
async function notifyRoles(roles, { title, message, section, link }) {
  for (const role of roles) {
    await notify({ title, message, role, section, link })
  }
}

// Generate unique sample ID: [BatchCode]-[PREFIX]-[seq]
// PREFIX: FRM = formulation, PKG = packing, TECH = technical
async function genSampleId(bmrId, prefix) {
  const bmr = await prisma.bmrRecord.findUnique({ where: { id: bmrId } })
  const base = (bmr?.batchCode || bmr?.id.slice(-6)).toUpperCase()
  const existing = await prisma.bmrSample.findMany({
    where: { bmrId, section: prefix },
    orderBy: { createdAt: 'desc' },
  })
  const seq = String(existing.length + 1).padStart(3, '0')
  return `${base}-${prefix}-${seq}`
}

// Log analytics event (silent — never throws)
async function logEvent(eventType, { bmrId, bomId, planId, payload } = {}) {
  try {
    await prisma.bmrAnalyticsEvent.create({
      data: { eventType, bmrId: bmrId || null, bomId: bomId || null,
              planId: planId || null, payload: payload || undefined }
    })
  } catch {}
}

// Update BMR master status based on what's filled
async function refreshBmrStatus(bmrId) {
  const bmr = await prisma.bmrRecord.findUnique({
    where: { id: bmrId },
    include: { sectionA: true, sectionC: true, sectionD: true, sectionE: true }
  })
  if (!bmr) return
  let status = 'NOT_STARTED'
  if (bmr.sectionA?.savedAt) status = 'IN_PROGRESS'
  if (bmr.sectionC?.savedAt && bmr.sectionD?.savedAt) status = 'COMPLETED'
  if (bmr.sectionE?.coaStatus === 'APPROVED') status = 'VERIFIED'
  await prisma.bmrRecord.update({ where: { id: bmrId }, data: { bmrStatus: status } })
}

// ── Routes ────────────────────────────────────────────────────────────────────
export default async function bmrRoutes(fastify) {

  // ── GET /api/bmr  — list BMRs (section dashboard) ─────────────────────────
  fastify.get('/', async (req) => {
    const { section, date, status, planId } = req.query
    const where = {}
    if (section) where.section = section
    if (planId)  where.planId  = planId
    if (status && status !== 'ALL') where.bmrStatus = status
    if (date) {
      // filter by plannedDate from the linked plan
    }

    const records = await prisma.bmrRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        sectionA: { select: { savedAt: true, cleaningStatus: true } },
        sectionC: { select: { savedAt: true } },
        sectionD: { select: { savedAt: true } },
        sectionE: { select: { coaStatus: true } },
        deviations: { select: { id: true } },
        samples: { select: { sampleStatus: true } },
      }
    })

    // Enrich with plan data
    const enriched = await Promise.all(records.map(async (r) => {
      try {
        const plan = await prisma.productionPlan.findUnique({
          where: { id: r.planId },
          select: { plannedDate: true, planId: true, equipment: true,
                    batchIncharge: true, noOfCycles: true, shift: true,
                    totalQty: true, uom: true }
        })
        const bom = await prisma.bomSend.findFirst({
          where: { planId: r.planId, bomType: 'FORMULATION' },
          select: { status: true, issuedToSectionAt: true, acknowledgedAt: true }
        })
        return {
          ...r,
          plannedDate:     plan?.plannedDate  || null,
          planCode:        plan?.planId       || null,
          equipment:       plan?.equipment    || null,
          batchIncharge:   plan?.batchIncharge|| null,
          noOfCycles:      plan?.noOfCycles   || null,
          shift:           plan?.shift        || null,
          totalQty:        plan?.totalQty     || null,
          uom:             plan?.uom          || 'KG',
          bomStatus:       bom?.status        || 'PENDING',
          issuedToSection: !!bom?.issuedToSectionAt,
          acknowledged:    !!bom?.acknowledgedAt,
        }
      } catch { return r }
    }))

    return { success: true, data: enriched }
  })

  // ── POST /api/bmr  — create BMR for a plan (get-or-create) ────────────────
  fastify.post('/', async (req, reply) => {
    const { planId } = req.body
    if (!planId) return reply.status(400).send({ success: false, error: 'planId required' })

    // Get-or-create
    const existing = await prisma.bmrRecord.findFirst({ where: { planId } })
    if (existing) return { success: true, data: existing, created: false }

    const plan = await prisma.productionPlan.findUnique({ where: { id: planId } })
    if (!plan) return reply.status(404).send({ success: false, error: 'Plan not found' })

    const bmr = await prisma.bmrRecord.create({
      data: {
        planId,
        batchCode:   plan.batchCode   || '',
        productCode: plan.productCode || '',
        productName: plan.productName,
        diNo:        plan.diNo,
        section:     plan.sectionType,
        bmrStatus:   'NOT_STARTED',
      }
    })

    await logEvent('BMR_CREATED', { bmrId: bmr.id, planId })
    return { success: true, data: bmr, created: true }
  })

  // ── GET /api/bmr/:id  — full BMR with all sections ────────────────────────
  fastify.get('/:id', async (req, reply) => {
    const bmr = await prisma.bmrRecord.findUnique({
      where: { id: req.params.id },
      include: {
        sectionA: true,
        sectionB: { include: { cultureDetails: { orderBy: { rowOrder: 'asc' } } } },
        sectionC: { include: { rmChecklist: { orderBy: { rowOrder: 'asc' } } } },
        sectionD: true,
        sectionE: { include: { parameters: { orderBy: { rowOrder: 'asc' } } } },
        deviations: { orderBy: { createdAt: 'desc' } },
        samples: { orderBy: { createdAt: 'asc' } },
      }
    })
    if (!bmr) return reply.status(404).send({ success: false, error: 'BMR not found' })

    // Enrich with plan data
    let plan = null
    try {
      plan = await prisma.productionPlan.findUnique({
        where: { id: bmr.planId },
        select: {
          plannedDate: true, planId: true, equipment: true, batchIncharge: true,
          noOfCycles: true, cycleBatchSize: true, shift: true, totalQty: true,
          uom: true, carrier: true, specs: true, pp1: true, pp2: true,
          sp1: true, noOfSp: true, unitPackQty: true, labels: true,
        }
      })
    } catch {}

    return { success: true, data: { ...bmr, plan } }
  })

  // ── PUT /api/bmr/:id/section-a  — save environment + cleaning ────────────
  fastify.put('/:id/section-a', async (req, reply) => {
    const { id } = req.params
    const bmr = await prisma.bmrRecord.findUnique({ where: { id } })
    if (!bmr) return reply.status(404).send({ success: false, error: 'BMR not found' })

    const {
      batchDate, temperature, tempUnit, humidity, weather, cfuCountOrdered,
      cleaningStatus, cleaningPhotoUrl, cleaningStartTime, cleaningEndTime,
      cleaningEndPhotoUrl, savedBy
    } = req.body

    const data = {
      batchDate:          batchDate    ? new Date(batchDate) : null,
      temperature:        temperature  != null ? parseFloat(temperature) : null,
      tempUnit:           tempUnit     || 'C',
      humidity:           humidity     != null ? parseFloat(humidity)    : null,
      weather:            weather      || null,
      cfuCountOrdered:    cfuCountOrdered || null,
      cleaningStatus:     cleaningStatus  || null,
      cleaningPhotoUrl:   cleaningPhotoUrl || null,
      cleaningStartTime:  cleaningStartTime || null,
      cleaningEndTime:    cleaningEndTime   || null,
      cleaningEndPhotoUrl:cleaningEndPhotoUrl || null,
      savedAt: new Date(),
      savedBy: savedBy || null,
    }

    const existing = await prisma.bmrSectionA.findUnique({ where: { bmrId: id } })
    const sectionA = existing
      ? await prisma.bmrSectionA.update({ where: { bmrId: id }, data })
      : await prisma.bmrSectionA.create({ data: { ...data, bmrId: id } })

    await refreshBmrStatus(id)
    await logEvent('BMR_SECTION_A_SAVED', { bmrId: id, planId: bmr.planId })
    return { success: true, data: sectionA }
  })

  // ── PUT /api/bmr/:id/section-b  — save technical / microbial ─────────────
  fastify.put('/:id/section-b', async (req, reply) => {
    const { id } = req.params
    const bmr = await prisma.bmrRecord.findUnique({ where: { id } })
    if (!bmr) return reply.status(404).send({ success: false, error: 'BMR not found' })

    const { cultureDetails, savedBy, ...rest } = req.body

    const scalar = {
      microbesPresent:      rest.microbesPresent      ?? null,
      microbeTypes:         rest.microbeTypes          || [],
      noOfMicrobesReceived: rest.noOfMicrobesReceived != null ? parseInt(rest.noOfMicrobesReceived) : null,
      formOfCulture:        rest.formOfCulture         || null,
      microbesReceivedFrom: rest.microbesReceivedFrom  || null,
      mcrOrSsf:             rest.mcrOrSsf              || null,
      fungalCulture:        rest.fungalCulture          ?? null,
      kojiOrHarvested:      rest.kojiOrHarvested        || null,
      microbesReceivedOn:   rest.microbesReceivedOn   ? new Date(rest.microbesReceivedOn) : null,
      microbesReceivedTime: rest.microbesReceivedTime  || null,
      totalQtyReceived:     rest.totalQtyReceived     != null ? parseFloat(rest.totalQtyReceived) : null,
      noOfBags:             rest.noOfBags             != null ? parseInt(rest.noOfBags)           : null,
      biomassQty:           rest.biomassQty           != null ? parseFloat(rest.biomassQty)       : null,
      initialMoisture:      rest.initialMoisture      != null ? parseFloat(rest.initialMoisture)  : null,
      techStartTime:        rest.techStartTime         || null,
      techEndTime:          rest.techEndTime           || null,
      coFormulantsQty:      rest.coFormulantsQty      != null ? parseFloat(rest.coFormulantsQty)  : null,
      techWorkers:          rest.techWorkers           != null ? parseInt(rest.techWorkers)         : null,
      totalTechQty:         rest.totalTechQty          != null ? parseFloat(rest.totalTechQty)      : null,
      qtyAfterSieving:      rest.qtyAfterSieving       != null ? parseFloat(rest.qtyAfterSieving)   : null,
      sieving:              rest.sieving               ?? null,
      sievingStartTime:     rest.sievingStartTime      || null,
      sievingEndTime:       rest.sievingEndTime        || null,
      meshSize:             rest.meshSize              || null,
      inchargeName:         rest.inchargeName          || null,
      sampleCollected:      rest.sampleCollected       ?? null,
      sampleProcess:        rest.sampleProcess         || null,
      sampleId:             rest.sampleId              || null,
      sampleSubmittedOn:    rest.sampleSubmittedOn    ? new Date(rest.sampleSubmittedOn) : null,
      savedAt: new Date(),
      savedBy: savedBy || null,
    }

    const existing = await prisma.bmrSectionB.findUnique({ where: { bmrId: id } })
    let sectionB
    if (existing) {
      sectionB = await prisma.bmrSectionB.update({ where: { bmrId: id }, data: scalar })
      // Replace culture detail rows
      if (Array.isArray(cultureDetails)) {
        await prisma.bmrCultureDetail.deleteMany({ where: { sectionBId: existing.id } })
        if (cultureDetails.length) {
          await prisma.bmrCultureDetail.createMany({
            data: cultureDetails.map((c, i) => ({
              sectionBId:  existing.id,
              cultureName: c.cultureName || null,
              batchNo:     c.batchNo     || null,
              doiOrDoh:    c.doiOrDoh    ? new Date(c.doiOrDoh) : null,
              cfuPerG:     c.cfuPerG     != null ? parseFloat(c.cfuPerG) : null,
              qty:         c.qty         != null ? parseFloat(c.qty)     : null,
              rowOrder:    i,
            }))
          })
        }
      }
    } else {
      sectionB = await prisma.bmrSectionB.create({ data: { ...scalar, bmrId: id } })
      if (Array.isArray(cultureDetails) && cultureDetails.length) {
        await prisma.bmrCultureDetail.createMany({
          data: cultureDetails.map((c, i) => ({
            sectionBId:  sectionB.id,
            cultureName: c.cultureName || null,
            batchNo:     c.batchNo     || null,
            doiOrDoh:    c.doiOrDoh    ? new Date(c.doiOrDoh) : null,
            cfuPerG:     c.cfuPerG     != null ? parseFloat(c.cfuPerG) : null,
            qty:         c.qty         != null ? parseFloat(c.qty)     : null,
            rowOrder:    i,
          }))
        })
      }
    }

    await refreshBmrStatus(id)
    await logEvent('BMR_SECTION_B_SAVED', { bmrId: id, planId: bmr.planId })
    return { success: true, data: sectionB }
  })

  // ── PUT /api/bmr/:id/section-c  — save formulation + RM checklist ─────────
  fastify.put('/:id/section-c', async (req, reply) => {
    const { id } = req.params
    const bmr = await prisma.bmrRecord.findUnique({ where: { id } })
    if (!bmr) return reply.status(404).send({ success: false, error: 'BMR not found' })

    const { rmChecklist, savedBy, ...rest } = req.body

    const scalar = {
      sfgUsed:              rest.sfgUsed              ?? null,
      sfgDiNo:              rest.sfgDiNo              || null,
      sfgDof:               rest.sfgDof     ? new Date(rest.sfgDof)  : null,
      sfgQtyUsed:           rest.sfgQtyUsed != null  ? parseFloat(rest.sfgQtyUsed) : null,
      carrier:              rest.carrier              || null,
      maleWorkers:          rest.maleWorkers   != null ? parseInt(rest.maleWorkers)   : null,
      femaleWorkers:        rest.femaleWorkers != null ? parseInt(rest.femaleWorkers)  : null,
      equipment:            rest.equipment            || null,
      totalQty:             rest.totalQty    != null  ? parseFloat(rest.totalQty)     : null,
      rmChargingStartTime:  rest.rmChargingStartTime  || null,
      rmChargingEndTime:    rest.rmChargingEndTime    || null,
      blendingStartTime:    rest.blendingStartTime    || null,
      blendingEndTime:      rest.blendingEndTime      || null,
      unloadingStartTime:   rest.unloadingStartTime   || null,
      unloadingEndTime:     rest.unloadingEndTime     || null,
      weightAfterUnloading: rest.weightAfterUnloading != null ? parseFloat(rest.weightAfterUnloading) : null,
      sieving:              rest.sieving              ?? null,
      sievingStartTime:     rest.sievingStartTime     || null,
      sievingEndTime:       rest.sievingEndTime       || null,
      meshSize:             rest.meshSize             || null,
      weightAfterSieving:   rest.weightAfterSieving   != null ? parseFloat(rest.weightAfterSieving) : null,
      inchargeName:         rest.inchargeName         || null,
      sampleCollected:      rest.sampleCollected      ?? null,
      sampleProcess:        rest.sampleProcess        || null,
      sampleId:             rest.sampleId             || null,
      sampleSubmittedOn:    rest.sampleSubmittedOn  ? new Date(rest.sampleSubmittedOn) : null,
      savedAt: new Date(),
      savedBy: savedBy || null,
    }

    const existing = await prisma.bmrSectionC.findUnique({ where: { bmrId: id } })
    let sectionC
    if (existing) {
      sectionC = await prisma.bmrSectionC.update({ where: { bmrId: id }, data: scalar })
      // Update checklist items (preserve tick state — only update remarks/qty not added/timeAdded)
      if (Array.isArray(rmChecklist)) {
        for (const item of rmChecklist) {
          if (item.id) {
            await prisma.bmrRmChecklistItem.update({
              where: { id: item.id },
              data: { remarks: item.remarks || null }
            })
          }
        }
      }
    } else {
      sectionC = await prisma.bmrSectionC.create({ data: { ...scalar, bmrId: id } })
      // Auto-populate RM checklist from BOM recipe if not provided
      const recipeItems = await prisma.recipeDb.findMany({
        where: { productCode: bmr.productCode },
        orderBy: { roleType: 'asc' }
      })
      // Get plan for total qty
      const plan = await prisma.productionPlan.findUnique({ where: { id: bmr.planId }, select: { totalQty: true } })
      const totalQty = plan?.totalQty || 0
      if (recipeItems.length) {
        await prisma.bmrRmChecklistItem.createMany({
          data: recipeItems.map((r, i) => ({
            sectionCId: sectionC.id,
            rmCode:     r.rmCode,
            rmName:     r.rmName,
            stdQty:     parseFloat((r.qtyPerUnit * totalQty).toFixed(3)),
            uom:        r.uom,
            rowOrder:   i,
          }))
        })
      }
    }

    await refreshBmrStatus(id)
    if (!existing) await logEvent('BMR_FORMULATION_STARTED', { bmrId: id, planId: bmr.planId })
    await logEvent('BMR_SECTION_C_SAVED', { bmrId: id, planId: bmr.planId })
    return { success: true, data: sectionC }
  })

  // ── PATCH /api/bmr/:id/section-c/checklist/:itemId  — tick a checklist item
  fastify.patch('/:id/section-c/checklist/:itemId', async (req, reply) => {
    const { id, itemId } = req.params
    const { added, remarks } = req.body

    const item = await prisma.bmrRmChecklistItem.findUnique({ where: { id: itemId } })
    if (!item) return reply.status(404).send({ success: false, error: 'Item not found' })

    const updated = await prisma.bmrRmChecklistItem.update({
      where: { id: itemId },
      data: {
        added:     added ?? item.added,
        timeAdded: added && !item.added ? new Date() : item.timeAdded,
        remarks:   remarks !== undefined ? remarks : item.remarks,
      }
    })

    // Check if all items ticked → auto-stamp rm_charging_end_time
    const sectionC = await prisma.bmrSectionC.findUnique({ where: { bmrId: id } })
    if (sectionC) {
      const allItems = await prisma.bmrRmChecklistItem.findMany({ where: { sectionCId: sectionC.id } })
      const allTicked = allItems.every(it => it.added)
      const anyTicked = allItems.some(it => it.added)

      const updates = {}
      if (anyTicked && !sectionC.rmChargingStartTime) {
        updates.rmChargingStartTime = new Date().toTimeString().slice(0, 5)
      }
      if (allTicked && !sectionC.rmChargingEndTime) {
        updates.rmChargingEndTime = new Date().toTimeString().slice(0, 5)
      }
      if (Object.keys(updates).length) {
        await prisma.bmrSectionC.update({ where: { bmrId: id }, data: updates })
      }
    }

    await logEvent('BMR_RM_CHECKLIST_TICK', {
      bmrId: id, payload: { itemId, rmCode: item.rmCode, added, time: new Date() }
    })
    return { success: true, data: updated }
  })

  // ── PUT /api/bmr/:id/section-d  — save packing ────────────────────────────
  fastify.put('/:id/section-d', async (req, reply) => {
    const { id } = req.params
    const bmr = await prisma.bmrRecord.findUnique({ where: { id } })
    if (!bmr) return reply.status(404).send({ success: false, error: 'BMR not found' })

    const { savedBy, ...rest } = req.body
    const data = {
      dateOfPacking:      rest.dateOfPacking     ? new Date(rest.dateOfPacking)     : null,
      dateOfFormulation:  rest.dateOfFormulation ? new Date(rest.dateOfFormulation) : null,
      qtyReceived:        rest.qtyReceived        != null ? parseFloat(rest.qtyReceived)       : null,
      maleWorkers:        rest.maleWorkers        != null ? parseInt(rest.maleWorkers)          : null,
      femaleWorkers:      rest.femaleWorkers      != null ? parseInt(rest.femaleWorkers)        : null,
      typeOfPacking:      rest.typeOfPacking      || null,
      primaryPack:        rest.primaryPack        || null,
      secondaryPack:      rest.secondaryPack      || null,
      weightPerUnit:      rest.weightPerUnit      != null ? parseFloat(rest.weightPerUnit)     : null,
      totalQtyPacked:     rest.totalQtyPacked     != null ? parseFloat(rest.totalQtyPacked)    : null,
      totalUnitsPacked:   rest.totalUnitsPacked   != null ? parseInt(rest.totalUnitsPacked)    : null,
      unitsPerCbb:        rest.unitsPerCbb        != null ? parseInt(rest.unitsPerCbb)         : null,
      totalOuterPackages: rest.totalOuterPackages != null ? parseInt(rest.totalOuterPackages)  : null,
      labelType:          rest.labelType          || null,
      labellingStartTime: rest.labellingStartTime || null,
      labellingEndTime:   rest.labellingEndTime   || null,
      stretchFilm:        rest.stretchFilm        ?? null,
      sfStartTime:        rest.sfStartTime        || null,
      sfEndTime:          rest.sfEndTime          || null,
      carryStrapping:     rest.carryStrapping     ?? null,
      csStartTime:        rest.csStartTime        || null,
      csEndTime:          rest.csEndTime          || null,
      qtyLeftover:        rest.qtyLeftover        != null ? parseFloat(rest.qtyLeftover)       : null,
      leftoverStoredAt:   rest.leftoverStoredAt   || null,
      sfgUpdated:         rest.sfgUpdated         ?? null,
      sampleCollected:    rest.sampleCollected    ?? null,
      sampleProcess:      rest.sampleProcess      || null,
      sampleId:           rest.sampleId           || null,
      sampleSubmittedOn:  rest.sampleSubmittedOn  ? new Date(rest.sampleSubmittedOn)  : null,
      sentToInventoryOn:  rest.sentToInventoryOn  ? new Date(rest.sentToInventoryOn)  : null,
      handedOverTo:       rest.handedOverTo       || null,
      totalUnitsSent:     rest.totalUnitsSent     != null ? parseInt(rest.totalUnitsSent)      : null,
      sentTime:           rest.sentTime           || null,
      inchargeName:       rest.inchargeName       || null,
      savedAt: new Date(),
      savedBy: savedBy || null,
    }

    const existing = await prisma.bmrSectionD.findUnique({ where: { bmrId: id } })
    const sectionD = existing
      ? await prisma.bmrSectionD.update({ where: { bmrId: id }, data })
      : await prisma.bmrSectionD.create({ data: { ...data, bmrId: id } })

    await refreshBmrStatus(id)
    if (!existing) await logEvent('BMR_PACKING_STARTED', { bmrId: id, planId: bmr.planId })
    await logEvent('BMR_SECTION_D_SAVED', { bmrId: id, planId: bmr.planId })
    return { success: true, data: sectionD }
  })

  // ── PUT /api/bmr/:id/section-e  — save COA (QC only) ─────────────────────
  fastify.put('/:id/section-e', async (req, reply) => {
    const { id } = req.params
    const bmr = await prisma.bmrRecord.findUnique({ where: { id } })
    if (!bmr) return reply.status(404).send({ success: false, error: 'BMR not found' })

    const { parameters, savedBy, ...rest } = req.body
    const data = {
      coaNo:           rest.coaNo           || null,
      carrier:         rest.carrier         || null,
      sentOn:          rest.sentOn          ? new Date(rest.sentOn)         : null,
      sentBy:          rest.sentBy          || null,
      section:         rest.section         || null,
      composition:     rest.composition     || null,
      dateOfAnalysis:  rest.dateOfAnalysis  ? new Date(rest.dateOfAnalysis) : null,
      analystName:     rest.analystName     || null,
      analyzedBy:      rest.analyzedBy      || null,
      analyzedByDept:  rest.analyzedByDept  || null,
      analyzedByDate:  rest.analyzedByDate  ? new Date(rest.analyzedByDate) : null,
      checkedBy:       rest.checkedBy       || null,
      checkedByDept:   rest.checkedByDept   || null,
      checkedByDate:   rest.checkedByDate   ? new Date(rest.checkedByDate)  : null,
      approvedBy:      rest.approvedBy      || null,
      approvedByDept:  rest.approvedByDept  || null,
      approvedByDate:  rest.approvedByDate  ? new Date(rest.approvedByDate) : null,
      coaStatus:       rest.coaStatus       || 'PENDING',
      savedAt: new Date(),
      savedBy: savedBy || null,
    }

    const existing = await prisma.bmrSectionE.findUnique({ where: { bmrId: id } })
    let sectionE
    if (existing) {
      sectionE = await prisma.bmrSectionE.update({ where: { bmrId: id }, data })
      if (Array.isArray(parameters)) {
        await prisma.bmrCoaParameter.deleteMany({ where: { sectionEId: existing.id } })
        if (parameters.length) {
          await prisma.bmrCoaParameter.createMany({
            data: parameters.map((p, i) => ({
              sectionEId:    existing.id,
              paramName:     p.paramName     || '',
              specification: p.specification || null,
              result:        p.result        || null,
              paramStatus:   p.paramStatus   || null,
              rowOrder:      i,
              isSubRow:      p.isSubRow      || false,
              parentParam:   p.parentParam   || null,
            }))
          })
        }
      }
    } else {
      sectionE = await prisma.bmrSectionE.create({ data: { ...data, bmrId: id } })
      if (Array.isArray(parameters) && parameters.length) {
        await prisma.bmrCoaParameter.createMany({
          data: parameters.map((p, i) => ({
            sectionEId:    sectionE.id,
            paramName:     p.paramName     || '',
            specification: p.specification || null,
            result:        p.result        || null,
            paramStatus:   p.paramStatus   || null,
            rowOrder:      i,
            isSubRow:      p.isSubRow      || false,
            parentParam:   p.parentParam   || null,
          }))
        })
      }
    }

    // If approved → notify section incharge
    if (data.coaStatus === 'APPROVED') {
      await refreshBmrStatus(id)
      await notify({
        title:   `COA Approved — ${bmr.productName}`,
        message: `COA for Batch ${bmr.batchCode} | DI: ${bmr.diNo} has been approved by ${data.approvedBy || 'QC'}. Batch is cleared.`,
        section: bmr.section,
        link:    `/production/${bmr.section.toLowerCase()}/bmr/${id}`,
      })
    }
    await logEvent('BMR_COA_SAVED', { bmrId: id, planId: bmr.planId, payload: { status: data.coaStatus } })
    return { success: true, data: sectionE }
  })

  // ── POST /api/bmr/:id/deviation  — save + notify supervisors ─────────────
  fastify.post('/:id/deviation', async (req, reply) => {
    const { id } = req.params
    const bmr = await prisma.bmrRecord.findUnique({ where: { id } })
    if (!bmr) return reply.status(404).send({ success: false, error: 'BMR not found' })

    const { section, details, supervisorName, notifiedBy } = req.body
    if (!section || !details?.trim())
      return reply.status(400).send({ success: false, error: 'section and details required' })

    const deviation = await prisma.bmrDeviation.create({
      data: {
        bmrId: id, section, details,
        supervisorName: supervisorName || null,
        notifiedBy: notifiedBy || null,
      }
    })

    // Notify planning, stores, admin, production manager
    const msg = `Deviation in Section ${section} — ${bmr.productName} | Batch: ${bmr.batchCode} | DI: ${bmr.diNo}\n"${details}"`
    await notifyRoles(['PLANNING', 'STORE_MANAGER', 'ADMIN', 'PRODUCTION_MANAGER'], {
      title: `⚠ BMR Deviation — ${bmr.productName}`,
      message: msg,
      section: bmr.section,
      link: `/production/${bmr.section.toLowerCase()}/bmr/${id}`,
    })

    return { success: true, data: deviation }
  })

  // ── POST /api/bmr/:id/sample  — create sample with unique ID ─────────────
  // sectionPrefix: FRM | PKG | TECH
  fastify.post('/:id/sample', async (req, reply) => {
    const { id } = req.params
    const bmr = await prisma.bmrRecord.findUnique({ where: { id } })
    if (!bmr) return reply.status(404).send({ success: false, error: 'BMR not found' })

    const { sectionPrefix, process, composition, collectedOn } = req.body
    if (!sectionPrefix) return reply.status(400).send({ success: false, error: 'sectionPrefix required' })

    const sampleId = await genSampleId(id, sectionPrefix)
    const sample = await prisma.bmrSample.create({
      data: {
        bmrId:       id,
        sampleId,
        section:     sectionPrefix,
        process:     process     || null,
        composition: composition || null,
        collectedOn: collectedOn ? new Date(collectedOn) : new Date(),
        sampleStatus: 'COLLECTED',
      }
    })

    return { success: true, data: sample }
  })

  // ── PATCH /api/bmr/:id/sample/:sampleId/send-to-qc  ─────────────────────
  // Section incharge fills composition then clicks Send to QC
  fastify.patch('/:id/sample/:sampleId/send-to-qc', async (req, reply) => {
    const { id, sampleId } = req.params
    const bmr = await prisma.bmrRecord.findUnique({ where: { id } })
    if (!bmr) return reply.status(404).send({ success: false, error: 'BMR not found' })

    const { composition, sentBy } = req.body

    const sample = await prisma.bmrSample.update({
      where: { sampleId },
      data: {
        composition:  composition || null,
        sampleStatus: 'SENT_TO_QC',
        sentToQcAt:   new Date(),
      }
    })

    // Notify QC team
    await notifyRoles(['QC_ANALYST', 'QC_MANAGER'], {
      title:   `New Sample for QC — ${bmr.productName}`,
      message: `Sample ${sampleId} from Batch ${bmr.batchCode} | DI: ${bmr.diNo} | Section: ${bmr.section} has been sent to QC by ${sentBy || 'Section'}.\nComposition: ${composition || '—'}`,
      link: `/qc/samples/${sampleId}`,
    })

    await logEvent('BMR_COA_SUBMITTED', { bmrId: id, planId: bmr.planId, payload: { sampleId } })
    return { success: true, data: sample }
  })

  // ── PATCH /api/bmr/:id/sample/:sampleId/verify  — QC marks verified ──────
  fastify.patch('/:id/sample/:sampleId/verify', async (req, reply) => {
    const { id, sampleId } = req.params
    const bmr = await prisma.bmrRecord.findUnique({ where: { id } })
    if (!bmr) return reply.status(404).send({ success: false, error: 'BMR not found' })

    const { verifiedBy, result } = req.body

    const sample = await prisma.bmrSample.update({
      where: { sampleId },
      data: {
        sampleStatus:    'VERIFIED',
        verifiedAt:      new Date(),
        verifiedBy:      verifiedBy || null,
      }
    })

    // Notify section incharge
    await notify({
      title:   `Sample Verified — ${sampleId}`,
      message: `QC has verified Sample ${sampleId} for Batch ${bmr.batchCode}. Result: ${result || 'See COA'}.`,
      section: bmr.section,
      link: `/production/${bmr.section.toLowerCase()}/bmr/${id}`,
    })

    await logEvent('BMR_COA_APPROVED', { bmrId: id, planId: bmr.planId, payload: { sampleId, verifiedBy } })
    return { success: true, data: sample }
  })

  // ── GET /api/bmr/notifications  — list in-app notifications ──────────────
  fastify.get('/notifications/list', async (req) => {
    const { role, section, unreadOnly } = req.query
    const where = {}
    if (role) where.role = role
    if (section) where.section = section
    if (unreadOnly === 'true') where.read = false

    const notifs = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: notifs }
  })

  // ── PATCH /api/bmr/notifications/:notifId/read  ───────────────────────────
  fastify.patch('/notifications/:notifId/read', async (req) => {
    await prisma.notification.update({
      where: { id: req.params.notifId },
      data: { read: true, readAt: new Date() }
    })
    return { success: true }
  })

  // ── PATCH /api/bmr/notifications/read-all  ────────────────────────────────
  fastify.patch('/notifications/read-all', async (req) => {
    const { role, section } = req.body || {}
    const where = { read: false }
    if (role)    where.role    = role
    if (section) where.section = section
    await prisma.notification.updateMany({ where, data: { read: true, readAt: new Date() } })
    return { success: true }
  })
}
