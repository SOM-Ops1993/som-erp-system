import prisma from '../../../../db.js'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'

const MM = 2.8346
const W  = 100 * MM
const H  =  50 * MM
const M  =   3 * MM

async function qrBuffer(text) {
  const dataUrl = await QRCode.toDataURL(text, { width: 200, margin: 1, errorCorrectionLevel: 'M' })
  return Buffer.from(dataUrl.split(',')[1], 'base64')
}

export async function listContainers(req, res) {
  try {
    const { itemCode } = req.query
    const where = itemCode ? { itemCode } : {}
    const containers = await prisma.containerMaster.findMany({ where, orderBy: { itemName: 'asc' } })
    return res.json({ success: true, data: containers })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getContainer(req, res) {
  try {
    const id = decodeURIComponent(req.params.containerId)
    const container = await prisma.containerMaster.findUnique({ where: { containerId: id } })
    if (!container) return res.status(404).json({ success: false, error: 'Container not found' })
    return res.json({ success: true, data: container })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createContainer(req, res) {
  try {
    const { itemCode, itemName, capacity, uom } = req.body
    if (!itemCode || !itemName || !capacity || !uom)
      return res.status(400).json({ success: false, error: 'itemCode, itemName, capacity, uom are required' })
    const alreadyExists = await prisma.containerMaster.findUnique({ where: { itemCode } })
    if (alreadyExists) return res.status(409).json({ success: false, error: `Container already exists for ${itemCode}: ${alreadyExists.containerId}` })
    const lbl = itemName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()
    const containerId = `CONT-${lbl}-${itemCode}`
    const container = await prisma.containerMaster.create({
      data: { containerId, itemCode, itemName, capacity: parseFloat(capacity), currentQty: 0, uom }
    })
    return res.status(201).json({ success: true, data: container })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function fillContainer(req, res) {
  const { containerId } = req.params
  const { packId, qty } = req.body
  if (!packId || !qty)
    return res.status(400).json({ success: false, error: 'packId and qty required' })
  try {
    const container = await prisma.containerMaster.findUnique({ where: { containerId: decodeURIComponent(containerId) } })
    if (!container) return res.status(404).json({ success: false, error: 'Container not found' })

    const packBalance = await prisma.packBalance.findUnique({ where: { packId } })
    if (!packBalance) return res.status(404).json({ success: false, error: 'Pack not found or not yet inwarded' })

    const fill = parseFloat(qty)
    if (fill <= 0) return res.status(400).json({ success: false, error: 'Qty must be positive' })
    if (fill > packBalance.remainingQty)
      return res.status(400).json({ success: false, error: `Qty exceeds pack balance (${packBalance.remainingQty})` })

    const spaceLeft = container.capacity - container.currentQty
    if (fill > spaceLeft)
      return res.status(400).json({ success: false, error: `Container only has ${spaceLeft.toFixed(3)} space remaining (capacity: ${container.capacity})` })

    await prisma.$transaction(async (tx) => {
      await tx.packBalance.update({
        where: { packId },
        data: { remainingQty: packBalance.remainingQty - fill }
      })
      await tx.containerMaster.update({
        where: { containerId: container.containerId },
        data: { currentQty: { increment: fill } }
      })
      await tx.outward.create({
        data: { sourceId: packId, sourceType: 'PACK_REDUCTION', rmCode: container.itemCode, qtyIssued: fill }
      })
      const prevLedger = await tx.stockLedger.findFirst({
        where: { itemCode: container.itemCode }, orderBy: { timestamp: 'desc' }
      })
      await tx.stockLedger.create({
        data: {
          itemCode: container.itemCode, sourceId: container.containerId,
          transactionType: 'PACK_TO_CONTAINER', inQty: fill, outQty: 0,
          balance: prevLedger?.balance || 0,
          reference: `Pack ${packId} → Container ${container.containerId}`
        }
      })
    })

    const updated = await prisma.containerMaster.findUnique({ where: { containerId: container.containerId } })
    return res.json({ success: true, data: updated, filled: fill })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function issueFromContainer(req, res) {
  const { containerId } = req.params
  const { qty, indentId, remarks } = req.body
  if (!qty) return res.status(400).json({ success: false, error: 'qty required' })
  try {
    const container = await prisma.containerMaster.findUnique({ where: { containerId: decodeURIComponent(containerId) } })
    if (!container) return res.status(404).json({ success: false, error: 'Container not found' })

    const issue = parseFloat(qty)
    if (issue <= 0) return res.status(400).json({ success: false, error: 'Qty must be positive' })
    if (issue > container.currentQty)
      return res.status(400).json({ success: false, error: `Qty exceeds container balance (${container.currentQty})` })

    await prisma.$transaction(async (tx) => {
      await tx.containerMaster.update({
        where: { containerId: container.containerId },
        data: { currentQty: { decrement: issue } }
      })

      if (indentId) {
        const detail = await tx.indentDetails.findFirst({
          where: { indentId, rmCode: container.itemCode }
        })
        if (detail) {
          await tx.indentDetails.update({
            where: { id: detail.id },
            data: {
              issuedQty: { increment: issue },
              balanceQty: Math.max(0, detail.balanceQty - issue)
            }
          })
        }
      }

      await tx.outward.create({
        data: {
          indentId: indentId || null,
          sourceId: container.containerId,
          sourceType: 'CONTAINER_ISSUE',
          rmCode: container.itemCode,
          qtyIssued: issue,
          remarks: remarks || null
        }
      })

      const prevLedger = await tx.stockLedger.findFirst({
        where: { itemCode: container.itemCode }, orderBy: { timestamp: 'desc' }
      })
      await tx.stockLedger.create({
        data: {
          itemCode: container.itemCode, sourceId: container.containerId,
          transactionType: 'CONTAINER_ISSUE', inQty: 0, outQty: issue,
          balance: (prevLedger?.balance || 0) - issue,
          reference: `Container ${container.containerId}${indentId ? ` → Indent ${indentId}` : ' → Plant'}`
        }
      })
    })

    const updated = await prisma.containerMaster.findUnique({ where: { containerId: container.containerId } })
    return res.json({ success: true, data: updated, issued: issue })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getContainerLabel(req, res) {
  try {
    const container = await prisma.containerMaster.findUnique({
      where: { containerId: decodeURIComponent(req.params.containerId) }
    })
    if (!container) return res.status(404).json({ success: false, error: 'Container not found' })

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
    return res.status(500).json({ success: false, error: err.message })
  }
}
