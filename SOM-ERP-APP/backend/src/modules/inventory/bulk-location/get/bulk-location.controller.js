import prisma from '../../../../db.js'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'

const MM = 2.8346
const W  = 100 * MM
const H  =  50 * MM
const M  =   3 * MM

const qrBuffer = async (text) => {
  const dataUrl = await QRCode.toDataURL(text, { width: 200, margin: 1, errorCorrectionLevel: 'M' })
  return Buffer.from(dataUrl.split(',')[1], 'base64')
}

export const listLocations = async (req, res) => {
  try {
    const { itemCode } = req.query
    const where = itemCode ? { itemCode } : {}
    const locs = await prisma.bulkLocation.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { lotEntries: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } } }
    })
    return res.json({ success: true, data: locs })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getLocation = async (req, res) => {
  try {
    const loc = await prisma.bulkLocation.findUnique({
      where: { locationId: req.params.locationId },
      include: { lotEntries: { orderBy: { createdAt: 'asc' } } }
    })
    if (!loc) return res.status(404).json({ success: false, error: 'Location not found', code: 'NOT_FOUND' })
    return res.json({ success: true, data: loc })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getLocationLabel = async (req, res) => {
  try {
    const loc = await prisma.bulkLocation.findUnique({
      where: { locationId: req.params.locationId },
      include: { lotEntries: { where: { status: 'ACTIVE' } } }
    })
    if (!loc) return res.status(404).json({ success: false, error: 'Location not found', code: 'NOT_FOUND' })

    const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: true })
    const chunks = []
    doc.on('data', c => chunks.push(c))

    await new Promise(async (resolve, reject) => {
      doc.on('end', resolve)
      doc.on('error', reject)

      const headerH = 14 * MM
      doc.rect(0, 0, W, headerH).fill('#0d5c3a')
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
      doc.text('BULK LOCATION — SOM PHYTOPHARMA', M, 3 * MM, { width: W - 2 * M, align: 'center' })

      const qrSize = 22 * MM
      const qrX = W - qrSize - M
      const qrY = headerH + M
      const qrImg = await qrBuffer(`LOC:${loc.locationId}`)
      doc.image(qrImg, qrX, qrY, { width: qrSize, height: qrSize })

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

      const footerH = 6 * MM
      const footerY = H - footerH
      doc.rect(0, footerY, W, footerH).fill('#e8f5ee')
      doc.fillColor('#0d5c3a').fontSize(7).font('Helvetica-Bold')
      doc.text(`LOC: ${loc.locationId}  |  ITEM: ${loc.itemCode}  |  UOM: ${loc.uom}`, M, footerY + 1.5 * MM, { width: W - 2 * M, align: 'left' })
      doc.end()
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="LOC-${loc.locationId}.pdf"`)
    return res.send(Buffer.concat(chunks))
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getBulkStockSummary = async (req, res) => {
  try {
    const rows = await prisma.bulkLotEntry.groupBy({
      by: ['itemCode', 'itemName'],
      where: { status: 'ACTIVE', remainingQty: { gt: 0 } },
      _sum: { remainingQty: true },
    })
    return res.json({ success: true, data: rows.map(r => ({ itemCode: r.itemCode, itemName: r.itemName, totalQty: r._sum.remainingQty })) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
