import prisma from "../../../../db.js";

// ── GET /api/erp/sales-orders ─────────────────────────────────────────────────
// Query params: company, status, priority, diNo, search, from, to, limit, offset

const getSalesOrders = async (req, res) => {
  console.log("Query params:", req.query); // Debug log to check incoming query parameters

  const {
    company,
    status,
    priority,
    diNo,
    search,
    from,
    to,
    limit = 200,
    offset = 0,
  } = req.query;

  const where = {};
  if (company) where.company = company;
  if (priority) where.priority = priority;
  if (diNo) where.diNo = { contains: diNo, mode: "insensitive" };
  if (search) where.customerName = { contains: search, mode: "insensitive" };

  if (from || to) {
    where.estimatedDispatchDate = {};
    if (from) where.estimatedDispatchDate.gte = new Date(from);
    if (to) where.estimatedDispatchDate.lte = new Date(to);
  }

  // status lives on items, not the header — filter orders that have at least one matching item
  if (status) {
    where.items = { some: { status } };
  }

  const [orders, total] = await Promise.all([
    prisma.salesOrder.findMany({
      where,
      include: { items: { orderBy: { lineNo: "asc" } } },
      orderBy: [{ priority: "asc" }, { estimatedDispatchDate: "asc" }],
      take: Number(limit),
      skip: Number(offset),
    }),
    prisma.salesOrder.count({ where }),
  ]);

  return res.json({ success: true, data: orders, total });
};

// ── GET /api/erp/sales-orders/:id  ───────────────────────────────────────

const getSalesOrderById = async (req, res) => {
  console.log("Fetching order with ID:", req.params.id); // Debug log to check incoming order ID

  const order = await prisma.salesOrder.findUnique({
    where: { id: req.params.id },
    include: { items: { orderBy: { lineNo: "asc" } } },
  });

  if (!order)
    return res.status(404).json({ success: false, error: "Order not found", code: 'NOT_FOUND' });

  return res.json({ success: true, data: order });
};

// ── GET /api/erp/sales-orders/summary/dashboard  ─────────────────────────
// Quick counts per status for a dashboard widget

const getDashboardSummary = async (req, res) => {
  console.log("Generating dashboard summary"); // Debug log to indicate this endpoint is hit

  const statuses = [
    "PENDING",
    "PLANNED",
    "UNDER_PRODUCTION",
    "PACKED",
    "IN_INVENTORY",
    "READY_TO_DISPATCH",
    "DISPATCHED",
  ];

  const counts = await Promise.all(
    statuses.map((s) =>
      prisma.salesOrderItem
        .count({ where: { status: s } })
        .then((c) => ({ status: s, count: c })),
    ),
  );

  const urgentPending = await prisma.salesOrder.count({
    where: {
      priority: { in: ["URGENT", "VERY_URGENT"] },
      items: { some: { status: { in: ["PENDING", "PLANNED"] } } },
    },
  });

  return res.json({
    success: true,
    data: { statusCounts: counts, urgentPending },
  });
};

// GET /api/erp/sales-orders/companies
const getCompanies = async (req, res) => {
  console.log("Fetching active companies"); // Debug log to indicate this endpoint is hit

  try {
    const companies = await prisma.companyMaster.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
      select: { code: true, name: true },
    });
    return res.json({ success: true, data: companies });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
};

// ── GET /api/erp/sales-orders/sync-log  ──────────────────────────────────
// Last 20 sheet sync attempts

const getSyncLogs = async (req, res) => {
  console.log("Fetching sync logs"); // Debug log to indicate this endpoint is hit

  const logs = await prisma.sheetSyncLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return res.json({ success: true, data: logs });
};

export {
  getSalesOrders,
  getSalesOrderById,
  getDashboardSummary,
  getSyncLogs,
  getCompanies,
};
