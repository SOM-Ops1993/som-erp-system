import prisma from '../../../../db.js'
import { normalizeUom, CANONICAL_UNITS } from '../../../../utils/uom.js'

const nextBulkLotNo = async (itemCode) => {
  const year = new Date().getFullYear()
  const row = await prisma.$transaction(async tx => {
    await tx.bulkLotSequence.upsert({
      where: { itemCode_year: { itemCode, year } },
      create: { itemCode, year, seq: 1 },
      update: { seq: { increment: 1 } },
    })
    return tx.bulkLotSequence.findUnique({ where: { itemCode_year: { itemCode, year } } })
  })
  const seq = String(row.seq).padStart(3, '0')
  return `BULK-${itemCode}-${year}-${seq}`
}

export const createLocation = async (req, res) => {
  try {
    const { locationId, locationName, itemCode, itemName, uom } = req.body
    if (!locationId || !locationName || !itemCode || !itemName)
      return res.status(400).json({ success: false, error: 'locationId, locationName, itemCode, itemName required', code: 'VALIDATION_ERROR' })
    const existing = await prisma.bulkLocation.findUnique({ where: { locationId } })
    if (existing) return res.status(409).json({ success: false, error: 'Location ID already exists', code: 'CONFLICT' })
    const canonicalUom = uom ? normalizeUom(uom) : 'KG'
    if (!CANONICAL_UNITS.includes(canonicalUom))
      return res.status(400).json({ success: false, error: `uom must convert to one of ${CANONICAL_UNITS.join(', ')} — got "${uom}"`, code: 'VALIDATION_ERROR' })
    const loc = await prisma.bulkLocation.create({ data: { locationId, locationName, itemCode, itemName, uom: canonicalUom } })
    return res.status(201).json({ success: true, data: loc })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const bulkInward = async (req, res) => {
  try {
    const { locationId, supplier, invoiceNo, receivedDate, receivedQty } = req.body
    if (!locationId || !receivedQty) return res.status(400).json({ success: false, error: 'locationId and receivedQty required', code: 'VALIDATION_ERROR' })
    const loc = await prisma.bulkLocation.findUnique({ where: { locationId } })
    if (!loc) return res.status(404).json({ success: false, error: 'Location not found', code: 'NOT_FOUND' })
    const lotNo = await nextBulkLotNo(loc.itemCode)
    const entry = await prisma.bulkLotEntry.create({
      data: { locationId, itemCode: loc.itemCode, itemName: loc.itemName, lotNo, supplier: supplier || null, invoiceNo: invoiceNo || null, receivedDate: receivedDate ? new Date(receivedDate) : null, receivedQty: parseFloat(receivedQty), remainingQty: parseFloat(receivedQty), uom: loc.uom, status: 'ACTIVE' }
    })
    const currentTotal = await prisma.bulkLotEntry.aggregate({ where: { itemCode: loc.itemCode, status: 'ACTIVE' }, _sum: { remainingQty: true } })
    await prisma.stockLedger.create({ data: { itemCode: loc.itemCode, sourceId: entry.id, transactionType: 'BULK_INWARD', inQty: parseFloat(receivedQty), outQty: 0, balance: Number(currentTotal._sum.remainingQty || 0), reference: `LOT: ${lotNo} | LOC: ${locationId}` } })
    return res.status(201).json({ success: true, data: entry })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const bulkOutward = async (req, res) => {
  try {
    const { lotEntryId, qtyToIssue, indentId, rmCode, remarks } = req.body
    if (!lotEntryId || !qtyToIssue) return res.status(400).json({ success: false, error: 'lotEntryId and qtyToIssue required', code: 'VALIDATION_ERROR' })
    const entry = await prisma.bulkLotEntry.findUnique({ where: { id: lotEntryId } })
    if (!entry) return res.status(404).json({ success: false, error: 'Lot entry not found', code: 'NOT_FOUND' })
    if (entry.status === 'EXHAUSTED') return res.status(400).json({ success: false, error: 'This lot is already exhausted', code: 'VALIDATION_ERROR' })
    const qty = parseFloat(qtyToIssue)
    if (qty > entry.remainingQty) return res.status(400).json({ success: false, error: `Cannot issue ${qty} — only ${entry.remainingQty} remaining` })
    const newRemaining = parseFloat((entry.remainingQty - qty).toFixed(4))
    const newStatus = newRemaining <= 0 ? 'EXHAUSTED' : 'ACTIVE'
    await prisma.bulkLotEntry.update({ where: { id: lotEntryId }, data: { remainingQty: newRemaining, status: newStatus } })
    if (indentId && rmCode) {
      const detail = await prisma.indentDetails.findFirst({ where: { indentId, rmCode } })
      if (detail) {
        const newIssued = Number(detail.issuedQty) + qty
        const newBalance = Math.max(0, Number(detail.balanceQty) - qty)
        await prisma.indentDetails.update({ where: { id: detail.id }, data: { issuedQty: newIssued, balanceQty: newBalance } })
        const allDetails = await prisma.indentDetails.findMany({ where: { indentId } })
        const allComplete = allDetails.every(d => Number(d.balanceQty) <= 0)
        if (allComplete) { await prisma.indentMaster.update({ where: { indentId }, data: { status: 'COMPLETE' } }) }
        else if (allDetails.some(d => Number(d.issuedQty) > 0)) { await prisma.indentMaster.update({ where: { indentId }, data: { status: 'PARTIAL' } }) }
      }
    }
    await prisma.outward.create({ data: { indentId: indentId || null, sourceId: lotEntryId, sourceType: 'BULK', rmCode: entry.itemCode, qtyIssued: qty, remarks: remarks || `Bulk issue from LOT: ${entry.lotNo}` } })
    const currentTotal = await prisma.bulkLotEntry.aggregate({ where: { itemCode: entry.itemCode, status: 'ACTIVE' }, _sum: { remainingQty: true } })
    const packTotal = await prisma.packBalance.aggregate({ where: { itemCode: entry.itemCode, remainingQty: { gt: 0 } }, _sum: { remainingQty: true } })
    const totalBalance = Number(currentTotal._sum.remainingQty || 0) + Number(packTotal._sum.remainingQty || 0)
    await prisma.stockLedger.create({ data: { itemCode: entry.itemCode, sourceId: lotEntryId, transactionType: 'BULK_OUTWARD', inQty: 0, outQty: qty, balance: totalBalance, reference: `LOT: ${entry.lotNo} | ${indentId ? `Indent: ${indentId}` : 'Direct issue'}` } })
    return res.json({ success: true, data: { lotEntryId, lotNo: entry.lotNo, issued: qty, remaining: newRemaining, status: newStatus } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
