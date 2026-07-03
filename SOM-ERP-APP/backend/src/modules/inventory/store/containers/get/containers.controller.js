import prisma from '../../../../../db.js'
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

export const listContainers = async (req, res) => {
  try {
    const { itemCode } = req.query
    const where = itemCode ? { itemCode } : {}
    const containers = await prisma.containerMaster.findMany({ where, orderBy: { itemName: 'asc' } })
    return res.json({ success: true, data: containers })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getContainer = async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.containerId)
    const container = await prisma.containerMaster.findUnique({ where: { containerId: id } })
    if (!container) return res.status(404).json({ success: false, error: 'Container not found', code: 'NOT_FOUND' })
    return res.json({ success: true, data: container })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getContainerLabel = async (req, res) => {
  try {
    const container = await prisma.containerMaster.findUnique({
      where: { containerId: decodeURIComponent(req.params.containerId) }
    })
    if (!container) return res.status(404).json({ success: false, error: 'Container not found', code: 'NOT_FOUND' })

    const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: true })
    const chunks = []
    doc.on('data', c => chunks.push(c))

    await new Promise(async (resolve, reject) => {
      doc.on('end', resolve)
      doc.on('error', reject)

      const headerH = 14 * MM
      doc.rect(0, 0, W, headerH).fill('#e67e22')
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
      doc.text('CONTAINER — SOM PHYTOPHARMA', M, 3 * MM, { width: W - 2 * M, align: 'center' })

      const qrSize = 22 * MM
      const qrX = W - qrSize - M
      const qrY = headerH + M
      const qrImg = await qrBuffer(`CONT:${container.containerId}`)
      doc.image(qrImg, qrX, qrY, { width: qrSize, height: qrSize })

      let curY = headerH + M
      const leftW = qrX - M - 2 * MM

      doc.fillColor('#444444').fontSize(7).font('Helvetica-Bold')
      doc.text('CONTAINER ID', M, curY)
      curY += 8
      doc.fillColor('#e67e22').fontSize(11).font('Helvetica-Bold')
      doc.text(container.containerId, M, curY, { width: leftW })
      curY += 14

      doc.fillColor('#444444').fontSize(7).font('Helvetica-Bold')
      doc.text('ITEM', M, curY)
      curY += 8
      doc.fillColor('#111111').fontSize(9).font('Helvetica-Bold')
      doc.text(container.itemName, M, curY, { width: leftW, lineBreak: true })
      curY += 13

      doc.fillColor('#777777').fontSize(7).font('Helvetica')
      doc.text(`Capacity: ${container.capacity} ${container.uom}  |  Code: ${container.itemCode}`, M, curY, { width: leftW })

      const footerH = 6 * MM
      const footerY = H - footerH
      doc.rect(0, footerY, W, footerH).fill('#fdebd0')
      doc.fillColor('#e67e22').fontSize(7).font('Helvetica-Bold')
      doc.text(
        `CONT: ${container.containerId}  |  ITEM: ${container.itemCode}  |  CAP: ${container.capacity} ${container.uom}`,
        M, footerY + 1.5 * MM, { width: W - 2 * M, align: 'left' }
      )
      doc.end()
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="CONT-${container.containerId}.pdf"`)
    return res.send(Buffer.concat(chunks))
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
