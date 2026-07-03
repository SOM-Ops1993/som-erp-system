import prisma from "../../../../db.js";

// GET /api/customer-profiles
const getCustomerProfiles = async (req, res) => {
  try {
    const profiles = await prisma.customerProfile.findMany({
      orderBy: [{ orderCount: "desc" }, { customerName: "asc" }],
    });
    return res.json({ success: true, data: profiles });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
};

// GET /api/customer-profiles/cp-profiles?customer=NAME
const getCpProfiles = async (req, res) => {
  try {
    const { customer } = req.query;
    if (!customer) return res.json({ success: true, data: [] });

    const profiles = await prisma.customerProductProfile.findMany({
      where: { customerName: customer.trim().toUpperCase() },
      orderBy: { orderCount: "desc" },
    });
    return res.json({ success: true, data: profiles });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
};

export { getCustomerProfiles, getCpProfiles };
