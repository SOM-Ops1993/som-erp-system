import prisma from '../db.js'

export async function generateLotNo(itemCode, year) {
  const y = year || new Date().getFullYear()

  // Pure Prisma approach - no raw SQL function needed
  let seq = 1
  const existing = await prisma.lotSequence.findUnique({
    where: { itemCode_year: { itemCode, year: y } }
  })

  if (existing) {
    const updated = await prisma.lotSequence.update({
      where: { itemCode_year: { itemCode, year: y } },
      data: { seq: { increment: 1 } }
    })
    seq = updated.seq
  } else {
    try {
      const created = await prisma.lotSequence.create({
        data: { itemCode, year: y, seq: 1 }
      })
      seq = created.seq
    } catch {
      // Race condition - another request created it first
      const updated = await prisma.lotSequence.update({
        where: { itemCode_year: { itemCode, year: y } },
        data: { seq: { increment: 1 } }
      })
      seq = updated.seq
    }
  }

  return `${y}-${String(seq).padStart(3, '0')}`
}

export async function generateBatchNo(productCode, year) {
  const y = year || new Date().getFullYear()
  const prefix = productCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

  // Count existing indents for this product this year
  const count = await prisma.indentMaster.count({
    where: {
      productCode,
      createdAt: {
        gte: new Date(`${y}-01-01`),
        lt: new Date(`${y + 1}-01-01`)
      }
    }
  })
  const seq = count + 1
  return `${prefix}-${y}-${String(seq).padStart(3, '0')}`
}
