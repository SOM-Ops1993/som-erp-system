import prisma from "../../../../db.js";

// POST /api/customer-profiles/upsert
const upsertCustomerProfile = async (req, res) => {
  try {
    const { customerName, company, orderType } = req.body;
    if (!customerName?.trim())
      return res
        .status(400)
        .json({ success: false, error: "customerName required" });

    const name = customerName.trim().toUpperCase();
    const existing = await prisma.customerProfile.findUnique({
      where: { customerName: name },
    });

    if (existing) {
      await prisma.customerProfile.update({
        where: { customerName: name },
        data: {
          company:    company   || existing.company,
          orderType:  orderType || existing.orderType,
          orderCount: { increment: 1 },
        },
      });
    } else {
      await prisma.customerProfile.create({
        data: {
          customerName: name,
          company:   company   || "",
          orderType: orderType || "DOMESTIC",
          orderCount: 1,
        },
      });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
};

export { upsertCustomerProfile };
