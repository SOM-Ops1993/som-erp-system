import prisma from "../../../../db.js";

// ── PUT /api/erp/sales-orders/:id  ───────────────────────────────────────
// Updates header-level fields only (not line items)

const updateSalesOrder = async (req, res) => {
  const {
    company,
    diNo,
    customerName,
    orderType,
    orderReceivedDate,
    priority,
    estimatedDispatchDate,
    invoiceNo,
    invoiceDate,
    transportName,
    salesStaff,
    dispatchedBy,
    remarks,
  } = req.body;

  try {
    const order = await prisma.salesOrder.update({
      where: { id: req.params.id },
      data: {
        ...(company             !== undefined && { company }),
        ...(diNo                !== undefined && { diNo }),
        ...(customerName        !== undefined && { customerName }),
        ...(orderType           !== undefined && { orderType }),
        ...(priority            !== undefined && { priority }),
        ...(orderReceivedDate   !== undefined && { orderReceivedDate: new Date(orderReceivedDate) }),
        ...(estimatedDispatchDate !== undefined && { estimatedDispatchDate: new Date(estimatedDispatchDate) }),
        ...(invoiceNo           !== undefined && { invoiceNo:     invoiceNo     || null }),
        ...(invoiceDate         !== undefined && { invoiceDate:   invoiceDate   ? new Date(invoiceDate) : null }),
        ...(transportName       !== undefined && { transportName: transportName || null }),
        ...(salesStaff          !== undefined && { salesStaff:    salesStaff    || null }),
        ...(dispatchedBy        !== undefined && { dispatchedBy:  dispatchedBy  || null }),
        ...(remarks             !== undefined && { remarks:       remarks       || null }),
      },
      include: { items: { orderBy: { lineNo: "asc" } } },
    });
    return res.json({ success: true, data: order });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ── PATCH /api/erp/sales-orders/item/:itemId  ────────────────────────────
// Updates a single line item (including status progression)

const updateSalesOrderItem = async (req, res) => {
  const allowed = [
    "customerProductName",
    "inhouseProductName",
    "inhouseProductCode",
    "activeSpecs",
    "activeIngredient",
    "carrier",
    "batchNo",
    "sectionName",
    "totalQty",
    "totalUom",
    "unitQty",
    "unitUom",
    "unitPackType",
    "packingType",
    "totalCS",
    "labelType",
    "mrp",
    "mfgDate",
    "expDate",
    "status",
  ];

  const data = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      if (["totalQty", "unitQty", "mrp"].includes(key) && req.body[key] !== null)
        data[key] = parseFloat(req.body[key]);
      else if (key === "totalCS" && req.body[key] !== null)
        data[key] = parseInt(req.body[key]);
      else if (["mfgDate", "expDate"].includes(key))
        data[key] = req.body[key] ? new Date(req.body[key]) : null;
      else
        data[key] = req.body[key] || null;
    }
  }

  try {
    const item = await prisma.salesOrderItem.update({
      where: { id: req.params.itemId },
      data,
    });
    return res.json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ── PATCH /api/erp/sales-orders/cancel/:id  ──────────────────────────────
// Marks all items on an order as CANCELLED (soft cancel — order row stays)

const cancelOrder = async (req, res) => {
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
    });
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });

    await prisma.salesOrderItem.updateMany({
      where:  { salesOrderId: req.params.id },
      data:   { status: "CANCELLED" },
    });

    return res.json({ success: true, message: "Order items marked as cancelled" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ── PATCH /api/erp/sales-orders/dispatch/:id  ────────────────────────────
// Records dispatch details when an order is shipped out

const dispatchOrder = async (req, res) => {
  const {
    invoiceNo,
    invoiceDate,
    transportName,
    salesStaff,
    dispatchedBy,
    dispatchRemarks,
  } = req.body;

  try {
    const order = await prisma.salesOrder.update({
      where: { id: req.params.id },
      data: {
        ...(invoiceNo       !== undefined && { invoiceNo:     invoiceNo     || null }),
        ...(invoiceDate     !== undefined && { invoiceDate:   invoiceDate   ? new Date(invoiceDate) : null }),
        ...(transportName   !== undefined && { transportName: transportName || null }),
        ...(salesStaff      !== undefined && { salesStaff:    salesStaff    || null }),
        ...(dispatchedBy    !== undefined && { dispatchedBy:  dispatchedBy  || null }),
        ...(dispatchRemarks !== undefined && { remarks:       dispatchRemarks || null }),
      },
      include: { items: { orderBy: { lineNo: "asc" } } },
    });
    return res.json({ success: true, data: order });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export { updateSalesOrder, updateSalesOrderItem, cancelOrder, dispatchOrder };
