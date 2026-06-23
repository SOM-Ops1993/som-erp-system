// Secret token for Google Sheets webhook (set SHEET_WEBHOOK_SECRET in .env)
const WEBHOOK_SECRET =
  process.env.SHEET_WEBHOOK_SECRET || "som-sheet-sync-2024";

// ── POST /api/erp/sales-orders/sheet-import  ─────────────────────────────

// Called by Google Apps Script webhook OR manual trigger from frontend.
// Body: { secret, trigger, rows: [ { diNo, company, customerName, ... } ] }
// Each row represents ONE line item. Rows with same diNo are grouped into
// one SalesOrder. Fully idempotent — re-sending same row is a no-op.

const sheetImport = async (req, reply) => {
  const { secret, trigger = "WEBHOOK", rows } = req.body || {};

  // ── Auth ────────────────────────────────────────────────────────────────
  if (secret !== WEBHOOK_SECRET)
    return reply
      .status(401)
      .send({ success: false, error: "Invalid webhook secret" });

  // MANUAL trigger with empty rows = just a ping / log-only sync
  if (!Array.isArray(rows) || rows.length === 0) {
    if (trigger === "MANUAL") {
      await prisma.sheetSyncLog
        .create({
          data: { trigger, rowsIn: 0, imported: 0, skipped: 0, errors: null },
        })
        .catch(() => {});
      return {
        success: true,
        imported: 0,
        skipped: 0,
        message:
          "Manual sync logged (no rows — configure Apps Script to push rows for automatic import)",
      };
    }
    return reply
      .status(400)
      .send({ success: false, error: "rows array is required" });
  }

  let imported = 0,
    skipped = 0;
  const errors = [];

  for (const row of rows) {
    try {
      const {
        diNo,
        company,
        customerName,
        orderType = "DOMESTIC",
        orderDate,
        etd,
        priority = "MODERATE",
        customerProductName,
        inhouseProductName,
        inhouseProductCode,
        activeSpecs,
        activeIngredient,
        carrier,
        sectionName,
        totalQty,
        totalUom = "KG",
        unitQty,
        unitUom,
        unitPackType,
        packingType,
        totalCS,
        labelType,
        mrp,
        salesStaff,
        remarks,
      } = row;

      // Validate required fields
      if (
        !diNo ||
        !company ||
        !customerName ||
        !etd ||
        !customerProductName ||
        !inhouseProductName ||
        !totalQty
      ) {
        errors.push({
          row: diNo || "?",
          error:
            "Missing required fields (diNo, company, customerName, etd, customerProductName, inhouseProductName, totalQty)",
        });
        skipped++;
        continue;
      }

      // ── Find or create SalesOrder by diNo ──────────────────────────────
      let order = await prisma.salesOrder.findFirst({
        where: { diNo: diNo.trim() },
      });

      if (!order) {
        const soId = await nextSoId();
        order = await prisma.salesOrder.create({
          data: {
            soId,
            company: company.trim(),
            diNo: diNo.trim(),
            customerName: customerName.trim(),
            orderType: orderType.trim().toUpperCase(),
            orderReceivedDate: orderDate ? new Date(orderDate) : new Date(),
            priority: priority.trim().toUpperCase(),
            estimatedDispatchDate: new Date(etd),
            salesStaff: salesStaff || null,
            remarks: remarks || null,
          },
        });
      }

      // ── Check if this exact line item already exists (idempotent) ───────
      // Match on customerProductName + inhouseProductName to avoid duplicates
      const existing = await prisma.salesOrderItem.findFirst({
        where: {
          salesOrderId: order.id,
          customerProductName: customerProductName.trim(),
          inhouseProductName: inhouseProductName.trim(),
        },
      });

      if (existing) {
        skipped++;
        continue; // same product already on this order, skip
      }

      // ── Count existing items to assign lineNo ───────────────────────────
      const lineCount = await prisma.salesOrderItem.count({
        where: { salesOrderId: order.id },
      });

      await prisma.salesOrderItem.create({
        data: {
          salesOrderId: order.id,
          lineNo: lineCount + 1,
          customerProductName: customerProductName.trim(),
          inhouseProductName: inhouseProductName.trim(),
          inhouseProductCode: inhouseProductCode || null,
          activeSpecs: activeSpecs || null,
          activeIngredient: activeIngredient || null,
          carrier: carrier || null,
          sectionName: sectionName || null,
          totalQty: parseFloat(totalQty),
          totalUom: totalUom.trim(),
          unitQty: unitQty ? parseFloat(unitQty) : null,
          unitUom: unitUom || null,
          unitPackType: unitPackType || null,
          packingType: packingType || null,
          totalCS: totalCS ? parseInt(totalCS) : null,
          labelType: labelType || null,
          mrp: mrp ? parseFloat(mrp) : null,
          mfgDate: null,
          expDate: null,
          status: "PENDING",
        },
      });
      imported++;
    } catch (ex) {
      errors.push({ row: row.diNo || "?", error: ex.message });
      skipped++;
    }
  }

  await prisma.sheetSyncLog
    .create({
      data: {
        trigger,
        rowsIn: rows.length,
        imported,
        skipped,
        errors: errors.length ? JSON.stringify(errors) : null,
      },
    })
    .catch(() => {});

  return {
    success: true,
    imported,
    skipped,
    errors: errors.length ? errors : undefined,
  };
};
