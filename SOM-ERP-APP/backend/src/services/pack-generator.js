import prisma from '../db.js'
import { generateLotNo } from './lot-generator.js'

export function extractLbl(itemName) {
  const alphanum = itemName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return alphanum.slice(0, 3).padEnd(3, 'X')
}

export function buildPackId(lbl, itemCode, year, lotNo, bagNo) {
  const lotSeq = lotNo.split('-').pop()
  const bagStr = String(bagNo).padStart(3, '0')
  return `${lbl}-${itemCode}-${year}-${lotSeq}-${bagStr}`
}

export async function generatePackBatch({ itemCode, itemName, numberOfBags, packQty, uom, supplier, invoiceNo, receivedDate }) {
  const year = new Date().getFullYear()
  const lotNo = await generateLotNo(itemCode, year)
  const lbl = extractLbl(itemName)
  const packs = []
  for (let i = 1; i <= numberOfBags; i++) {
    const packId = buildPackId(lbl, itemCode, year, lotNo, i)
    packs.push({
      packId,
      itemCode,
      itemName,
      lotNo,
      bagNo: i,
      packQty,
      uom,
      supplier: supplier || null,
      invoiceNo: invoiceNo || null,
      receivedDate: receivedDate ? new Date(receivedDate) : null,
      status: 'AWAITING_INWARD',
    })
  }
  await prisma.printMaster.createMany({ data: packs, skipDuplicates: true })
  return { lotNo, packs }
}
