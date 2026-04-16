/**
 * Bulk Location Routes
 * ---------------------
 * Handles location master (create / list / QR label) and
 * bulk inward (receive a lot into a location) and
 * bulk outward (issue from a lot at a location).
 */

import prisma from '../db.js'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'

const MM = 2.8346
const W  = 100 * MM   // 283 pt  (10 cm label)
const H  =  50 * MM   // 142 pt  ( 5 cm label)
const M  =   3 * MM   //   8.5 pt margin

// ── helpers ──────────────────────────────────────────────────────────────────

async function qrBuffer(text) {
  const dataUrl = await QRCode.toDataURL(text, { width: 200, margin: 1, errorCorrectionLevel: 'M' })
  return Buffer.from(dataUrl.split(',')[1], 'base64')
}

async function nextBulkLotNo(itemCode) {
  const year = new Date().getFullYear()
  const result = await prisma.$executeRaw`
    INSERT INTO bulk_lot_sequence (item_code, year, seq)
    VALUES (${itemCode}, ${year}, 1)
    ON CONFLICT (item_code, year)
    DO UPDATE SET seq = bulk_lot_sequence.seq + 1
    RETURNING seq
  `
  // Fetch the updated seq
  const row = await prisma.bulkLotSequence.findUnique({ where: { itemCode_year: { itemCode, year } } })
  const seq = String(row.seq).padStart(3, '0')
  return `BULK-${itemCode}-${year}-${seq}`
}

// ── routes ───────────────────────────────────────────────────────────────────

export default async function bulkLocationRoutes(fastify) {

  // ── LOCATION MASTER ───────────────────────────────────────────────────────

  // List all locations (optionally filter by itemCode)
  fastify.get('/', async (req) => {
    const { itemCode } = req.query
    const where = itemCode ? { itemCode } : {}
    const locs = await prisma.bulkLocation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        lotEntries: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'asc' },
        }
      }
    })
    return { success: true, data: locs }
  })

  // Get a single location by ID (used when scanning a location QR)
  fastify.get('/:locationId', async (req, reply) => {
    const loc = await prisma.bulkLocation.findUnique({
      where: { locationId: req.params.locationId },
      include: {
        lotEntries: {
          orderBy: { createdAt: 'asc' },
        }
      }
    })
    if (!loc) return reply.status(404).send({ success: false, error: 'Location not found' })
    return { success: true, data: loc }
  })

  // Create a new location
  fastify.post('/', async (req, reply) => {
    const { locationId, locationName, itemCode, itemName, uom } = req.body
    if (!locationId || !locationName || !itemCode || !itemName)
      return reply.status(400).send({ success: false, error: 'locationId, locationName, itemCode, itemName required' })

    const existing = await prisma.bulkLocation.findUnique({ where: { locationId } })
    if (existing) return reply.status(409).send({ success: false, error: 'Location ID already exists' })

    const loc = await prisma.bulkLocation.create({
      data: { locationId, locationName, itemCode, itemName, uom: uom || 'KG' }
    })
    return reply.status(201).send({ success: true, data: loc })
  })

  // Delete a location (only if no active lot entries)
  fastify.delete('/:locationId', async (req, reply) => {
    const active = await prisma.bulkLotEntry.count({
      where: { locationId: req.params.locationId, status: 'ACTIVE', remainingQty: { gt: 0 } }
    })
    if (active > 0) return reply.status(400).send({ success: false, error: 'Cannot delete location with active stock' })
    await prisma.bulkLocation.delete({ where: { locationId: req.params.locationId } })
    return { success: true, message: 'Deleted' }
  })

  // ── LOCATION QR LABEL ─────────────────────────────────────────────────────

  fastify.get('/:locationId/label', async (req, reply) => {
    const loc = await prisma.bulkLocation.findUnique({
      where: { locationId: req.params.locationId },
      include: { lotEntries: { where: { status: 'ACTIVE' } } }
    })
    if (!loc) return reply.status(404).send({ success: false, error: 'Location not found' })

    const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: true })
    const chunks = []
    doc.on('data', c => chunks.push(c))

    await new Promise(async (resolve, reject) => {
      doc.on('end', resolve)
      doc.on('error', reject)

      // Header stripe
      const headerH = 14 * MM
      doc.rect(0, 0, W, headerH).fill('#0d5c3a')
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
      doc.text('BULK LOCATION — SOM PHYTOPHARMA', M, 3 * MM, { width: W - 2 * M, align: 'center' })

      // QR code
      const qrSize = 22 * MM
      const qrX = W - qrSize - M
      const qrY = headerH + M
      const qrImg = await qrBuffer(`LOC:${loc.locationId}`)
      doc.image(qrImg, qrX, qrY, { width: qrSize, height: qrSize })

      // Left content
      let curY = headerH + M
      const leftW = qrX - M - 2 * MM

      doc.fillColor('#444444').fontSize(7).font('Helvetica-Bold')
      doc.text('LOCATION ID', M, curY)
      curY += 8
      doc.fillColor('#0d5c3a').fontSize(13).font('Helvetica-Bold')
      doc.text(loc.locationId, M, curY, { width: leftW })
      curY += 16

      doc.fillColor('#444444').fontSize(7).font('Helvetica-Bold')
      doc.text('ITEM', M, curY)
      curY += 8
      doc.fillColor('#111111').fontSize(9).font('Helvetica-Bold')
      doc.text(loc.itemName, M, curY, { width: leftW, lineBreak: true })
      curY += 13

      doc.fillColor('#777777').fontSize(7).font('Helvetica')
      doc.text(loc.locationName, M, curY, { width: leftW })

      // Footer
      const footerH = 6 * MM
      const footerY = H - footerH
      doc.rect(0, footerY, W, footerH).fill('#e8f5ee')
      doc.fillColor('#0d5c3a').fontSize(7).font('Helvetica-Bold')
      doc.text(`LOC: ${loc.locationId}  |  ITEM: ${loc.itemCode}  |  UOM: ${loc.uom}`,
        M, footerY + 1.5 * MM, { width: W - 2 * M, align: 'left' })

      doc.end()
    })

    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `inline; filename="LOC-${loc.locationId}.pdf"`)
    return reply.send(Buffer.concat(chunks))
  })

  // ── BULK INWARD ───────────────────────────────────────────────────────────

  // Receive a lot into a location
  fastify.post('/inward', async (req, reply) => {
    const { locationId, supplier, invoiceNo, receivedDate, receivedQty } = req.body
    if (!locationId || !receivedQty)
      return reply.status(400).send({ success: false, error: 'locationId and receivedQty required' })

    const loc = await prisma.bulkLocation.findUnique({ where: { locationId } })
    if (!loc) return reply.status(404).send({ success: false, error: 'Location not found' })

    const lotNo = await nextBulkLotNo(loc.itemCode)

    const entry = await prisma.bulkLotEntry.create({
      data: {
        locationId,
        itemCode: loc.itemCode,
        itemName: loc.itemName,
        lotNo,
        supplier: supplier || null,
        invoiceNo: invoiceNo || null,
        receivedDate: receivedDate ? new Date(receivedDate) : null,
        receivedQty: parseFloat(receivedQty),
        remainingQty: parseFloat(receivedQty),
        uom: loc.uom,
        status: 'ACTIVE',
      }
    })

    // Record in stock ledger
    const currentTotal = await prisma.bulkLotEntry.aggregate({
      where: { itemCode: loc.itemCode, status: 'ACTIVE' },
      _sum: { remainingQty: true }
    })
    await prisma.stockLedger.create({
      data: {
        itemCode: loc.itemCode,
        sourceId: entry.id,
        transactionType: 'BULK_INWARD',
        inQty: parseFloat(receivedQty),
        outQty: 0,
        balance: Number(currentTotal._sum.remainingQty || 0),
        reference: `LOT: ${lotNo} | LOC: ${locationId}`,
      }
    })

    return reply.status(201).send({ success: true, data: entry })
  })

  // ── BULK OUTWARD ──────────────────────────────────────────────────────────

  // Issue from a specific lot entry (indentId optional)
  fastify.post('/outward', async (req, reply) => {
    const { lotEntryId, qtyToIssue, indentId, rmCode, remarks } = req.body
    if (!lotEntryId || !qtyToIssue)
      return reply.status(400).send({ success: false, error: 'lotEntryId and qtyToIssue required' })

    const entry = await prisma.bulkLotEntry.findUnique({ where: { id: lotEntryId } })
    if (!entry) return reply.status(404).send({ success: false, error: 'Lot entry not found' })
    if (entry.status === 'EXHAUSTED')
      return reply.status(400).send({ success: false, error: 'This lot is already exhausted' })

    const qty = parseFloat(qtyToIssue)
    if (qty > entry.remainingQty)
      return reply.status(400).send({
        success: false,
        error: `Cannot issue ${qty} — only ${entry.remainingQty} remaining in this lot`
      })

    const newRemaining = parseFloat((entry.remainingQty - qty).toFixed(4))
    const newStatus = newRemaining <= 0 ? 'EXHAUSTED' : 'ACTIVE'

    await prisma.bulkLotEntry.update({
      where: { id: lotEntryId },
      data: { remainingQty: newRemaining, status: newStatus }
    })

    // If linked to indent, update indent detail issuedQty
    if (indentId && rmCode) {
      const detail = await prisma.indentDetails.findFirst({
        where: { indentId, rmCode: rmCode }
      })
      if (detail) {
        const newIssued = Number(detail.issuedQty) + qty
        const newBalance = Math.max(0, Number(detail.balanceQty) - qty)
        await prisma.indentDetails.update({
          where: { id: detail.id },
          data: { issuedQty: newIssued, balanceQty: newBalance }
        })

        // Check if all issued → update indent status
        const allDetails = await prisma.indentDetails.findMany({ where: { indentId } })
        const allComplete = allDetails.every(d => Number(d.balanceQty) <= 0)
        if (allComplete) {
          await prisma.indentMaster.update({
            where: { indentId },
            data: { status: 'COMPLETE' }
          })
        } else if (allDetails.some(d => Number(d.issuedQty) > 0)) {
          await prisma.indentMaster.update({
            where: { indentId },
            data: { status: 'PARTIAL' }
          })
        }
      }
    }

    // Record in outward
    await prisma.outward.create({
      data: {
        indentId: indentId || null,
        sourceId: lotEntryId,
        sourceType: 'BULK',
        rmCode: entry.itemCode,
        qtyIssued: qty,
        remarks: remarks || `Bulk issue from LOT: ${entry.lotNo}`,
      }
    })

    // Stock ledger
    const currentTotal = await prisma.bulkLotEntry.aggregate({
      where: { itemCode: entry.itemCode, status: 'ACTIVE' },
      _sum: { remainingQty: true }
    })
    const packTotal = await prisma.packBalance.aggregate({
      where: { itemCode: entry.itemCode, remainingQty: { gt: 0 } },
      _sum: { remainingQty: true }
    })
    const totalBalance = Number(currentTotal._sum.remainingQty || 0) + Number(packTotal._sum.remainingQty || 0)

    await prisma.stockLedger.create({
      data: {
        itemCode: entry.itemCode,
        sourceId: lotEntryId,
        transactionType: 'BULK_OUTWARD',
        inQty: 0,
        outQty: qty,
        balance: totalBalance,
        reference: `LOT: ${entry.lotNo} | ${indentId ? `Indent: ${indentId}` : 'Direct issue'}`,
      }
    })

    return {
      success: true,
      data: {
        lotEntryId,
        lotNo: entry.lotNo,
        issued: qty,
        remaining: newRemaining,
        status: newStatus,
      }
    }
  })

  // Summary: total bulk stock by item
  fastify.get('/stock/summary', async (req) => {
    const rows = await prisma.bulkLotEntry.groupBy({
      by: ['itemCode', 'itemName'],
      where: { status: 'ACTIVE', remainingQty: { gt: 0 } },
      _sum: { remainingQty: true },
    })
    return { success: true, data: rows.map(r => ({
      itemCode: r.itemCode,
      itemName: r.itemName,
      totalQty: r._sum.remainingQty,
    })) }
  })
}
