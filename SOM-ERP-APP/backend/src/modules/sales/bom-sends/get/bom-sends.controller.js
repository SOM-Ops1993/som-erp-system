import prisma from "../../../../db.js";
import getIssuedQty from "../utils/utils.js";

const getFifoPacks = async (rmCode) => {
  const packs = await prisma.packBalance.findMany({
    where: { itemCode: rmCode, remainingQty: { gt: 0 } },
  });
  if (!packs.length) return [];

  const packIds = packs.map((p) => p.packId);
  const masters = await prisma.printMaster.findMany({
    where: { packId: { in: packIds } },
  });
  const pmMap = Object.fromEntries(masters.map((p) => [p.packId, p]));

  return packs
    .map((p) => ({
      packId: p.packId,
      remainingQty: p.remainingQty,
      totalQty: p.totalQty,
      lotNo: pmMap[p.packId]?.lotNo || "",
      bagNo: pmMap[p.packId]?.bagNo || 0,
      supplier: pmMap[p.packId]?.supplier || "",
      receivedDate: pmMap[p.packId]?.receivedDate || null,
      uom: pmMap[p.packId]?.uom || "KG",
    }))
    .sort((a, b) => {
      if (a.receivedDate && b.receivedDate)
        return new Date(a.receivedDate) - new Date(b.receivedDate);
      return a.packId < b.packId ? -1 : 1;
    });
}

// ------------------- Controller -------------------

// GET /api/bom-sends
const getBomSends = async (req, res) => {
  try {
    const { status, planId, section } = req.query;
    const where = {};
    if (status && status !== "ALL") where.status = status;
    if (planId) where.planId = planId;
    if (section) where.sectionType = section;

    const sends = await prisma.bomSend.findMany({
      where,
      orderBy: { sentAt: "desc" },
    });

    const enriched = await Promise.all(
      sends.map(async (s) => {
        try {
          const plan = await prisma.productionPlan.findUnique({
            where: { id: s.planId },
            select: { plannedDate: true, planId: true },
          });
          return {
            ...s,
            plannedDate: plan?.plannedDate || null,
            planCode: plan?.planId || null,
          };
        } catch {
          return s;
        }
      }),
    );

    return res.json({ success: true, data: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}

// GET /api/bom-sends/:id
const getBomSend = async (req, res) => {
  try {
    const send = await prisma.bomSend.findUnique({
      where: { id: req.params.id },
    });
    if (!send)
      return res.status(404).json({ success: false, error: "BOM not found", code: 'NOT_FOUND' });

    let plannedDate = null,
      planCode = null;
    try {
      const plan = await prisma.productionPlan.findUnique({
        where: { id: send.planId },
        select: { plannedDate: true, planId: true },
      });
      plannedDate = plan?.plannedDate || null;
      planCode = plan?.planId || null;
    } catch {}

    const recipe = await prisma.recipeDb.findMany({
      where: { productCode: send.productCode },
      orderBy: { roleType: "asc" },
    });

    const lines = await Promise.all(
      recipe.map(async (r) => {
        const requiredQty = parseFloat(
          (r.qtyPerUnit * send.totalQty).toFixed(3),
        );
        const issuedQty = parseFloat(
          (await getIssuedQty(send.sendId, r.rmCode)).toFixed(3),
        );
        const remainingQty = parseFloat(
          Math.max(0, requiredQty - issuedQty).toFixed(3),
        );
        const fifoPacks = await getFifoPacks(r.rmCode);
        const totalAvail = parseFloat(
          fifoPacks.reduce((s, p) => s + p.remainingQty, 0).toFixed(3),
        );
        const shortage = totalAvail < remainingQty;

        return {
          rmCode: r.rmCode,
          rmName: r.rmName,
          roleType: r.roleType,
          uom: r.uom,
          qtyPerUnit: r.qtyPerUnit,
          requiredQty,
          issuedQty,
          remainingQty,
          totalAvail,
          shortage,
          status:
            remainingQty <= 0
              ? "ISSUED"
              : issuedQty > 0
                ? "PARTIAL"
                : shortage && totalAvail === 0
                  ? "STOCKOUT"
                  : shortage
                    ? "SHORT"
                    : "PENDING",
          fifoPacks,
        };
      }),
    );

    return res.json({
      success: true,
      data: { ...send, plannedDate, planCode, lines },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}

export { getBomSends, getBomSend };
