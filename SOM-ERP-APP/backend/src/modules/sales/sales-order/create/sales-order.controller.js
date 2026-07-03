import prisma from "../../../../db.js";

const nextSoId = async () => {
  const year = new Date().getFullYear();
  const seq = await prisma.soSequence.upsert({
    where: { year },
    create: { year, seq: 1 },
    update: { seq: { increment: 1 } },
  });
  return `SO-${year}-${String(seq.seq).padStart(4, "0")}`;
}

// ── POST /api/erp/sales-orders  ──────────────────────────────────────────

const createSalesOrder = async (req, res) => {
  try {
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
      items,
    } = req.body;

    if (!company || !diNo || !customerName || !orderType)
      return res.status(400).json({
        success: false,
        error: "company, diNo, customerName, orderType are required",
        code: 'VALIDATION_ERROR',
      });

    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({
        success: false,
        error: "At least one order item is required",
        code: 'VALIDATION_ERROR',
      });

    // Validate each item has required fields
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.customerProductName?.trim())
        return res.status(400).json({
          success: false,
          error: `Line ${i + 1}: Customer Product Name is required`,
          code: 'VALIDATION_ERROR',
        });
      if (!it.totalQty || isNaN(parseFloat(it.totalQty)))
        return res.status(400).json({
          success: false,
          error: `Line ${i + 1}: Total Qty is required`,
          code: 'VALIDATION_ERROR',
        });
    }

    const soId = await nextSoId();

    const order = await prisma.salesOrder.create({
      data: {
        soId,
        company,
        diNo,
        customerName,
        orderType,
        orderReceivedDate: orderReceivedDate ? new Date(orderReceivedDate) : new Date(),
        priority: priority || "MODERATE",
        estimatedDispatchDate: estimatedDispatchDate
          ? new Date(estimatedDispatchDate)
          : orderReceivedDate
            ? new Date(orderReceivedDate)
            : new Date(),
        invoiceNo:     invoiceNo     || null,
        invoiceDate:   invoiceDate   ? new Date(invoiceDate) : null,
        transportName: transportName || null,
        salesStaff:    salesStaff    || null,
        dispatchedBy:  dispatchedBy  || null,
        remarks:       remarks       || null,
        items: {
          create: items.map((item, idx) => ({
            lineNo:              idx + 1,
            customerProductName: item.customerProductName.trim(),
            // inhouseProductName is NOT NULL in schema — fall back to customer name
            inhouseProductName:  item.inhouseProductName?.trim() || item.customerProductName.trim(),
            inhouseProductCode:  item.inhouseProductCode  || null,
            activeSpecs:         item.activeSpecs         || null,
            activeIngredient:    item.activeIngredient    || null,
            carrier:             item.carrier             || null,
            batchNo:             item.batchNo             || null,
            sectionName:         item.sectionName         || null,
            totalQty:            parseFloat(item.totalQty),
            totalUom:            item.totalUom            || "KG",
            unitQty:             item.unitQty    ? parseFloat(item.unitQty)  : null,
            unitUom:             item.unitUom               || null,
            unitPackType:        item.unitPackType          || null,
            packingType:         item.packingType           || null,
            unitsPerCS:          item.unitsPerCS ? parseInt(item.unitsPerCS) : null,
            totalCS:             item.totalCS    ? parseInt(item.totalCS)    : null,
            labelType:           item.labelType             || null,
            mrp:                 item.mrp        ? parseFloat(item.mrp)      : null,
            mfgDate:             item.mfgDate    ? new Date(item.mfgDate)    : null,
            expDate:             item.expDate    ? new Date(item.expDate)    : null,
            status:              "PENDING",
          })),
        },
      },
      include: { items: true },
    });

    return res.status(201).json({ success: true, data: order });
  } catch (err) {
    console.error('[createSalesOrder]', err);
    // Unique constraint on diNo
    if (err.code === 'P2002' && err.meta?.target?.includes('di_no'))
      return res.status(409).json({ success: false, error: `DI Number "${req.body.diNo}" already exists`, code: 'DUPLICATE' });
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
};

// ── POST /api/erp/sales-orders/companies  ────────────────────────────────

const addCompany = async (req, res) => {
  try {
    const { code, name } = req.body;
    if (!code || !name)
      return res.status(400).json({ success: false, error: "code and name are required", code: 'VALIDATION_ERROR' });

    const company = await prisma.companyMaster.upsert({
      where:  { code: code.trim().toUpperCase() },
      create: { code: code.trim().toUpperCase(), name: name.trim() },
      update: { name: name.trim(), isActive: true },
    });
    return res.json({ success: true, data: company });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
};

export { createSalesOrder, addCompany };
