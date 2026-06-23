import prisma from "../../../db.js";

// GET /api/tracker
export async function listTrackerIndents(req, res) {
  try {
    const { diNo, page = 1, limit = 200 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where =
      diNo && diNo.trim()
        ? { diNo: { contains: diNo.trim(), mode: "insensitive" } }
        : {};

    const [indents, total] = await Promise.all([
      prisma.indentMaster.findMany({
        where,
        select: {
          indentId: true,
          productCode: true,
          productName: true,
          batchNo: true,
          batchSize: true,
          diNo: true,
          status: true,
          plant: true,
          equipment: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.indentMaster.count({ where }),
    ]);

    return res.json({ success: true, data: indents, total });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/tracker/detail?indentId=
export async function getTrackerDetail(req, res) {
  try {
    const { indentId } = req.query;
    if (!indentId)
      return res.status(400).json({ success: false, error: "indentId required" });

    const indent = await prisma.indentMaster.findUnique({
      where: { indentId },
      include: { details: true },
    });
    if (!indent)
      return res.status(404).json({ success: false, error: "Indent not found" });

    const sfg = await prisma.sfgMaster.findFirst({ where: { indentId } });

    const outwardRecords = await prisma.outward.findMany({
      where: { indentId },
      orderBy: { timestamp: "asc" },
    });

    const packIds = [
      ...new Set(outwardRecords.map((o) => o.sourceId).filter(Boolean)),
    ];
    const packs =
      packIds.length > 0
        ? await prisma.printMaster.findMany({ where: { packId: { in: packIds } } })
        : [];
    const packMap = Object.fromEntries(packs.map((p) => [p.packId, p]));

    const rmHistory = indent.details.map((d) => {
      const txns = outwardRecords
        .filter((o) => o.rmCode === d.rmCode)
        .map((o) => ({
          outwardId: o.id,
          packId: o.sourceId,
          qtyIssued: o.qtyIssued,
          timestamp: o.timestamp,
          sourceType: o.sourceType,
          remarks: o.remarks,
          packDetails: packMap[o.sourceId] || null,
        }));

      const totalIssued = txns.reduce((s, t) => s + Number(t.qtyIssued), 0);
      return {
        rmCode: d.rmCode,
        rmName: d.rmName,
        requiredQty: d.requiredQty,
        issuedQty: d.issuedQty,
        balanceQty: d.balanceQty,
        fullyIssued: Number(d.balanceQty) <= 0,
        transactions: txns,
        totalIssued,
      };
    });

    const fullyIssuedRms = rmHistory.filter((r) => r.fullyIssued).length;

    return res.json({
      success: true,
      data: {
        indent: {
          indentId: indent.indentId,
          productCode: indent.productCode,
          productName: indent.productName,
          diNo: indent.diNo,
          batchNo: indent.batchNo,
          batchSize: indent.batchSize,
          plant: indent.plant,
          equipment: indent.equipment,
          status: indent.status,
          createdAt: indent.createdAt,
        },
        sfg,
        rmHistory,
        summary: {
          totalRms: indent.details.length,
          fullyIssuedRms,
          totalOutwardTxns: outwardRecords.length,
          formulatedQty: sfg?.formulatedQty || 0,
          packedQty: sfg?.packedQty || 0,
          sfgBalance: sfg?.sfgQty || 0,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
