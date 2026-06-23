import prisma from '../../../db.js'

function periodStart(period) {
  const now = new Date()
  if (period === 'today') {
    const s = new Date(now); s.setHours(0, 0, 0, 0); return s
  }
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  if (period === 'year')  return new Date(now.getFullYear(), 0, 1)
  return null
}

export async function getDashboardStats(req, res) {
  try {
    const { period = 'month' } = req.query
    const from = periodStart(period)

    const cAt = from ? { gte: from } : undefined  // createdAt filter
    const cw  = cAt ? { createdAt: cAt } : {}     // where block for createdAt fields

    const [
      // ── Raw Materials ──────────────────────────────────────────────────
      totalRm,
      rmInStock,

      // ── Gate ───────────────────────────────────────────────────────────
      gateInTotal,
      gateInPending,
      gateInApproved,
      gateOutTotal,

      // ── Print Master (packs generated) ─────────────────────────────────
      packsGenerated,
      packsAwaiting,

      // ── Store Inward ───────────────────────────────────────────────────
      inwardCount,

      // ── Store Outward ──────────────────────────────────────────────────
      outwardCount,
      outwardQtyAgg,

      // ── Indents ────────────────────────────────────────────────────────
      indentTotal,
      indentOpen,
      indentClosed,

      // ── Production Batches ─────────────────────────────────────────────
      batchTotal,
      batchCompleted,
      batchInProgress,

      // ── Sales Orders ───────────────────────────────────────────────────
      soTotal,
      soItemPending,
      soItemDispatched,

      // ── Dispatch ───────────────────────────────────────────────────────
      dispatchTotal,
    ] = await Promise.all([
      // Total RM items (all time — master data)
      prisma.rmMaster.count(),

      // Items with stock (current snapshot — no period filter)
      prisma.packBalance.groupBy({
        by: ['itemCode'],
        where: { remainingQty: { gt: 0 } },
      }).then(r => r.length),

      // Gate inward
      prisma.gateInward.count({ where: cw }),
      prisma.gateInward.count({ where: { status: 'pending', ...cw } }),
      prisma.gateInward.count({ where: { status: { in: ['approved', 'received', 'completed'] }, ...cw } }),

      // Gate outward
      prisma.gateOutward.count({ where: cw }),

      // Packs generated (PrintMaster)
      prisma.printMaster.count({ where: cAt ? { createdAt: cAt } : {} }),
      // Packs awaiting inward (current state)
      prisma.printMaster.count({ where: { status: 'AWAITING_INWARD' } }),

      // Inward transactions
      prisma.inward.count({ where: cAt ? { inwardTime: cAt } : {} }),

      // Outward transactions
      prisma.outward.count({ where: cAt ? { timestamp: cAt } : {} }),
      prisma.outward.aggregate({
        _sum: { qtyIssued: true },
        where: cAt ? { timestamp: cAt } : {},
      }),

      // Indents
      prisma.indentMaster.count({ where: cw }),
      prisma.indentMaster.count({ where: { status: 'OPEN', ...cw } }),
      prisma.indentMaster.count({ where: { status: 'CLOSED', ...cw } }),

      // Production batches
      prisma.productionBatch.count({ where: cw }),
      prisma.productionBatch.count({ where: { status: 'COMPLETED', ...cw } }),
      prisma.productionBatch.count({ where: { status: { in: ['IN_PROGRESS', 'IN_PROCESS'] }, ...cw } }),

      // Sales orders
      prisma.salesOrder.count({ where: cw }),
      prisma.salesOrderItem.count({ where: { status: 'PENDING', ...cw } }),
      prisma.salesOrderItem.count({ where: { status: 'DISPATCHED', ...cw } }),

      // Dispatches (OrderDispatch model from ErpSalesOrder)
      prisma.orderDispatch.count({ where: cAt ? { createdAt: cAt } : {} }),
    ])

    return res.json({
      success: true,
      period,
      from: from?.toISOString() ?? null,
      data: {
        rawMaterials: {
          totalItems:  totalRm,
          inStock:     rmInStock,
          outOfStock:  totalRm - rmInStock,
        },
        gate: {
          inwardTotal:    gateInTotal,
          inwardPending:  gateInPending,
          inwardApproved: gateInApproved,
          outwardTotal:   gateOutTotal,
        },
        store: {
          packsGenerated:      packsGenerated,
          packsAwaiting:       packsAwaiting,
          packsInwarded:       inwardCount,
          outwardTransactions: outwardCount,
          totalQtyIssued:      Number(outwardQtyAgg._sum?.qtyIssued ?? 0),
        },
        production: {
          totalIndents:       indentTotal,
          openIndents:        indentOpen,
          closedIndents:      indentClosed,
          totalBatches:       batchTotal,
          completedBatches:   batchCompleted,
          inProgressBatches:  batchInProgress,
        },
        salesOrders: {
          total:          soTotal,
          pendingItems:   soItemPending,
          dispatchedItems: soItemDispatched,
        },
        dispatch: {
          total: dispatchTotal,
        },
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
