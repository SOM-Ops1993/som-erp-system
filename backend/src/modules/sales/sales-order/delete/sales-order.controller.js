import prisma from "../../../../db.js";

// ── DELETE /api/erp/sales-orders/:id  ────────────────────────────────────
// Permanently deletes an order and all its line items (cascade)

const deleteSalesOrder = async (req, res) => {
  try {
    await prisma.salesOrder.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ── DELETE /api/erp/sales-orders/item/:itemId  ───────────────────────────
// Permanently deletes a single line item from an order

const deleteSalesOrderItem = async (req, res) => {
  try {
    await prisma.salesOrderItem.delete({ where: { id: req.params.itemId } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export { deleteSalesOrder, deleteSalesOrderItem };
