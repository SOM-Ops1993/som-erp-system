/**
 * QR Label PDF Generator
 *
 * Label Size: 100mm × 50mm (283.46pt × 141.73pt)
 * 1 mm = 2.8346 points
 *
 * Layout:
 *  Top:          PACK_ID (large bold)
 *  Left column:  Item Name, Pack Qty + UOM, Received Date
 *  Right column: Large QR Code (~45% width)
 *  Bottom:       Item Code | Lot No | Bag No
 */

import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'

const MM = 2.8346  // 1mm in points

const LABEL_W = 100 * MM  // 283.46pt
const LABEL_H = 50  * MM  // 141.73pt
const MARGIN  = 2   * MM  // 5.67pt safe margin

/**
 * Generate a single label PDF buffer for one pack.
 * @param {object} pack - PrintMaster record
 * @returns {Promise<Buffer>}
 */
export async function generateLabelBuffer(pack) {
  return new Promise(async (resolve, reject) => {
    const chunks = []

    const doc = new PDFDocument({
      size: [LABEL_W, LABEL_H],
      margin: 0,
      autoFirstPage: true,
    })

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    await drawLabel(doc, pack, 0, 0)

    doc.end()
  })
}

/**
 * Generate a multi-label PDF (one per page) for a batch of packs.
 * @param {object[]} packs - Array of PrintMaster records
 * @returns {Promise<Buffer>}
 */
export async function generateBatchLabelBuffer(packs) {
  return new Promise(async (resolve, reject) => {
    const chunks = []

    const doc = new PDFDocument({
      size: [LABEL_W, LABEL_H],
      margin: 0,
      autoFirstPage: false,
    })

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    for (let i = 0; i < packs.length; i++) {
      doc.addPage({ size: [LABEL_W, LABEL_H], margin: 0 })
      await drawLabel(doc, packs[i], 0, 0)
    }

    doc.end()
  })
}

/**
 * Draw a single label on the document at position (x, y).
 */
async function drawLabel(doc, pack, x, y) {
  const W = LABEL_W
  const H = LABEL_H
  const M = MARGIN

  // Background
  doc.rect(x, y, W, H).fillColor('white').fill()

  // Border
  doc.rect(x, y, W, H).strokeColor('#333333').lineWidth(0.5).stroke()

  // ── Generate QR code PNG buffer ──────────────────────────────
  const qrBuffer = await QRCode.toBuffer(pack.packId, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 200,
    color: { dark: '#000000', light: '#FFFFFF' },
  })

  // ── LAYOUT AREAS ─────────────────────────────────────────────
  const qrSize  = H - (2 * M) - (8 * MM)   // QR occupies right side, minus top header and bottom
  const qrX     = W - M - qrSize            // QR right-aligned
  const qrY     = y + M + (10 * MM)         // Below header
  const leftW   = qrX - M - (1 * MM)        // Left text column width

  // ── PACK ID HEADER (top, bold, large) ───────────────────────
  const headerH = 10 * MM
  doc.rect(x, y, W, headerH).fillColor('#1a1a2e').fill()

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('white')
    .text(pack.packId, x + M, y + M, {
      width: W - (2 * M),
      align: 'center',
      lineBreak: false,
    })

  // ── LEFT SECTION: Item details ───────────────────────────────
  let textY = y + headerH + (2 * MM)

  // Item Name
  doc
    .font('Helvetica-Bold')
    .fontSize(7)
    .fillColor('#1a1a2e')
    .text('ITEM', x + M, textY, { continued: false })

  textY += 4.5 * MM

  // Truncate long item names
  const itemNameDisplay = pack.itemName.length > 28
    ? pack.itemName.slice(0, 26) + '…'
    : pack.itemName

  doc
    .font('Helvetica')
    .fontSize(6.5)
    .fillColor('#000000')
    .text(itemNameDisplay, x + M, textY, {
      width: leftW,
      lineBreak: false,
    })

  textY += 5 * MM

  // Qty + UOM
  doc
    .font('Helvetica-Bold')
    .fontSize(7)
    .fillColor('#1a1a2e')
    .text('QTY', x + M, textY)

  textY += 4.5 * MM

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#000000')
    .text(`${Number(pack.packQty)} ${pack.uom}`, x + M, textY)

  textY += 6 * MM

  // Received Date (if available)
  if (pack.receivedDate) {
    const dateStr = new Date(pack.receivedDate).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
    doc
      .font('Helvetica-Bold')
      .fontSize(6)
      .fillColor('#1a1a2e')
      .text('RCVD', x + M, textY)
    textY += 3.5 * MM
    doc
      .font('Helvetica')
      .fontSize(6)
      .fillColor('#333333')
      .text(dateStr, x + M, textY)
  }

  // ── QR CODE (right section) ──────────────────────────────────
  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize })

  // ── BOTTOM STRIP: Item Code | Lot No | Bag No ────────────────
  const bottomY  = y + H - (7 * MM)
  const stripH   = 7 * MM

  doc.rect(x, bottomY, W, stripH).fillColor('#f0f0f0').fill()
  doc.rect(x, bottomY, W, stripH).strokeColor('#cccccc').lineWidth(0.3).stroke()

  // Dividers
  doc.moveTo(x + W / 3, bottomY).lineTo(x + W / 3, y + H).strokeColor('#cccccc').lineWidth(0.3).stroke()
  doc.moveTo(x + (2 * W) / 3, bottomY).lineTo(x + (2 * W) / 3, y + H).strokeColor('#cccccc').lineWidth(0.3).stroke()

  const bottomFontSize = 5.5
  const bottomLabelY = bottomY + 0.8 * MM
  const bottomValY   = bottomY + 3.2 * MM

  doc.font('Helvetica-Bold').fontSize(bottomFontSize).fillColor('#666666')
    .text('ITEM CODE', x + M, bottomLabelY, { width: W / 3 - M, align: 'center' })
    .text('LOT NO', x + W / 3 + M, bottomLabelY, { width: W / 3 - M, align: 'center' })
    .text('BAG NO', x + (2 * W) / 3 + M, bottomLabelY, { width: W / 3 - M, align: 'center' })

  doc.font('Helvetica').fontSize(bottomFontSize + 0.5).fillColor('#000000')
    .text(pack.itemCode, x + M, bottomValY, { width: W / 3 - M, align: 'center' })
    .text(pack.lotNo, x + W / 3 + M, bottomValY, { width: W / 3 - M, align: 'center' })
    .text(String(pack.bagNo).padStart(3, '0'), x + (2 * W) / 3 + M, bottomValY, { width: W / 3 - M, align: 'center' })
}
