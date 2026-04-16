import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'

const MM = 2.8346
const W = 100 * MM   // 283 pt
const H = 50 * MM    // 142 pt
const M = 3 * MM     // 8.5 pt  (margin)

async function qrBuffer(text) {
  const dataUrl = await QRCode.toDataURL(text, { width: 200, margin: 1, errorCorrectionLevel: 'M' })
  return Buffer.from(dataUrl.split(',')[1], 'base64')
}

// Build the label content for one pack onto the current PDFDoc page
async function drawLabel(doc, pack) {
  // ── HEADER: Pack ID (large, white on navy) ──────────────────────────────
  const headerH = 15 * MM   // 42.5 pt
  doc.rect(0, 0, W, headerH).fill('#1a3a6b')

  // Pack ID — font size auto-scales down for very long IDs
  const packIdText = pack.packId
  const maxFontSize = 18
  let fontSize = maxFontSize
  doc.font('Helvetica-Bold')
  // Rough character width at given size is ~0.55 * fontSize per char
  const availWidth = W - 2 * M
  while (fontSize > 10 && packIdText.length * fontSize * 0.55 > availWidth) fontSize -= 1

  doc.fillColor('#ffffff').fontSize(fontSize)
  const textH = fontSize * 1.2   // approximate line height
  const textY = (headerH - textH) / 2   // vertically center
  doc.text(packIdText, M, textY, { width: availWidth, align: 'center', lineBreak: false })

  // ── QR CODE (right side) ────────────────────────────────────────────────
  const qrSize = 21 * MM   // 59.5 pt — fits in body right column
  const qrX = W - qrSize - M
  const qrY = headerH + M
  const qrImg = await qrBuffer(pack.packId)
  doc.image(qrImg, qrX, qrY, { width: qrSize, height: qrSize })

  // Date received — centred under QR
  const dateStr = pack.receivedDate
    ? new Date(pack.receivedDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'
  const dateY = qrY + qrSize + 1.5 * MM
  doc.fillColor('#444444').fontSize(7).font('Helvetica')
  doc.text(`Rcvd: ${dateStr}`, qrX, dateY, { width: qrSize, align: 'center' })

  // ── LEFT CONTENT AREA ───────────────────────────────────────────────────
  const leftW = qrX - M - 2 * MM
  let curY = headerH + M

  // Item Name — auto-scale font to match item code size, same as header
  // Use same scaling logic: fit within leftW at up to fontSize 14
  const itemNameText = pack.itemName
  doc.font('Helvetica-Bold')
  let itemFontSize = 14
  while (itemFontSize > 8 && itemNameText.length * itemFontSize * 0.52 > leftW) itemFontSize -= 1

  doc.fillColor('#666666').fontSize(7).font('Helvetica-Bold')
  doc.text('ITEM', M, curY)
  curY += 7.5
  doc.fillColor('#111111').fontSize(itemFontSize).font('Helvetica-Bold')
  doc.text(itemNameText, M, curY, { width: leftW, lineBreak: true })
  // Advance curY by number of lines used
  const itemLines = Math.ceil((itemNameText.length * itemFontSize * 0.52) / leftW)
  curY += (itemLines > 1 ? itemFontSize * 2.4 : itemFontSize * 1.4)

  // Pack Qty
  doc.fillColor('#666666').fontSize(7).font('Helvetica-Bold')
  doc.text('PACK QTY', M, curY)
  curY += 7.5
  doc.fillColor('#000000').fontSize(14).font('Helvetica-Bold')
  doc.text(`${pack.packQty} ${pack.uom}`, M, curY, { width: leftW })
  curY += 18

  // Lot No
  doc.fillColor('#666666').fontSize(7).font('Helvetica-Bold')
  doc.text('LOT NO', M, curY)
  curY += 7.5
  doc.fillColor('#222222').fontSize(itemFontSize).font('Helvetica-Bold')
  doc.text(pack.lotNo, M, curY, { width: leftW })

  // ── FOOTER STRIP ───────────────────────────────────────────────────────
  const footerH = 7 * MM   // 19.8 pt
  const footerY = H - footerH
  doc.rect(0, footerY, W, footerH).fill('#d6e4f0')
  doc.fillColor('#1a3a6b').fontSize(8).font('Helvetica-Bold')
  doc.text(`LOT: ${pack.lotNo}`, M, footerY + 1.5 * MM, { width: W - 2 * M, align: 'left' })
}

export async function generateLabelBuffer(pack) {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: true })
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    await drawLabel(doc, pack)
    doc.end()
  })
}

export async function generateBatchLabelBuffer(packs) {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: false })
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    for (const pack of packs) {
      doc.addPage()
      await drawLabel(doc, pack)
    }
    doc.end()
  })
}
