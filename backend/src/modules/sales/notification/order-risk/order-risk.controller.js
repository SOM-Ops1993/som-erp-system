import prisma from '../../../../db.js'

export async function getAtRiskOrders(req, res) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const data = await prisma.erpSalesOrder.findMany({
      where: {
        etd: { gte: today, lte: sevenDaysOut },
        status: { notIn: ['dispatched', 'cancelled'] },
      },
      orderBy: [{ etd: 'asc' }, { priority: 'desc' }],
    })

    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
