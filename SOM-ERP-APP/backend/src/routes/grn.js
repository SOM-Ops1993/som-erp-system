import prisma from '../db.js'

export default async function grnRoutes(fastify) {

  // List all GRN groups — grouped by invoiceNo + supplier from PrintMaster
  fastify.get('/', async (req) => {
    // Aggregate packs by invoiceNo+supplier
    const packs = await prisma.printMaster.findMany({
      where: { invoiceNo: { not: null } },
      orderBy: { createdAt: 'desc' },
    })

    // Also get packs without invoiceNo grouped by receivedDate+supplier
    const packsNoInvoice = await prisma.printMaster.findMany({
      where: { invoiceNo: null },
      orderBy: { createdAt: 'desc' },
    })

    // Group by invoiceNo + supplier
    const groups = {}
    for (const p of packs) {
      const key = `${p.invoiceNo || 'NO-INV'}__${p.supplier || 'Unknown'}`
      if (!groups[key]) {
        groups[key] = {
          grnKey: key,
          invoiceNo: p.invoiceNo || '—',
          supplier: p.supplier || 'Unknown',
          receivedDate: p.receivedDate,
          totalPacks: 0,
          totalQty: 0,
          items: new Set(),
          createdAt: p.createdAt,
        }
      }
      groups[key].totalPacks++
      groups[key].totalQty += Number(p.packQty)
      groups[key].items.add(p.itemName)
      if (!groups[key].receivedDate && p.receivedDate) groups[key].receivedDate = p.receivedDate
    }

    // Convert sets to arrays
    const result = Object.values(groups).map(g => ({
      ...g,
      items: [...g.items],
      uniqueItems: g.items.size,
    }))

    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    return { success: true, data: result }
  })

  // Get full GRN detail for one invoice
  fastify.get('/detail', async (req, reply) => {
    const { invoiceNo, supplier } = req.query
    if (!invoiceNo) return reply.status(400).send({ success: false, error: 'invoiceNo required' })

    const where = { invoiceNo }
    if (supplier) where.supplier = supplier

    const packs = await prisma.printMaster.findMany({
      where,
      orderBy: [{ itemCode: 'asc' }, { bagNo: 'asc' }],
    })

    if (packs.length === 0)
      return reply.status(404).send({ success: false, error: 'No packs found for this invoice' })

    // Aggregate by itemCode for summary table
    const itemMap = {}
    for (const p of packs) {
      if (!itemMap[p.itemCode]) {
        itemMap[p.itemCode] = {
          itemCode: p.itemCode,
          itemName: p.itemName,
          uom: p.uom,
          totalBags: 0,
          totalQty: 0,
          packQty: Number(p.packQty),
          lotNo: p.lotNo,
          receivedDate: p.receivedDate,
        }
      }
      itemMap[p.itemCode].totalBags++
      itemMap[p.itemCode].totalQty += Number(p.packQty)
    }

    return {
      success: true,
      data: {
        invoiceNo,
        supplier: packs[0].supplier || 'Unknown',
        receivedDate: packs[0].receivedDate,
        items: Object.values(itemMap),
        allPacks: packs,
        totalPacks: packs.length,
        totalQty: packs.reduce((s, p) => s + Number(p.packQty), 0),
      }
    }
  })
}
