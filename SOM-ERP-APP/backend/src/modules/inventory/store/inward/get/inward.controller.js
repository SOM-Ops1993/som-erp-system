import prisma from "../../../../../db.js";
import { generatePackBatch } from "../../../../../services/pack-generator.js";
import { generateLabelBuffer, generateBatchLabelBuffer } from "../../../../../services/label-service.js";

export async function getPendingInwardGroups(req, res) {
  try {
    const groups = await prisma.printMaster.groupBy({
      by: ["itemCode", "itemName", "lotNo"],
      where: { status: "AWAITING_INWARD" },
      _count: { packId: true },
    });
    return res.json({
      success: true,
      data: groups.map((g) => ({ itemCode: g.itemCode, itemName: g.itemName, lotNo: g.lotNo, bagCount: g._count.packId })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getNextLotNumber(req, res) {
  try {
    const year = new Date().getFullYear();
    const existing = await prisma.lotSequence.findUnique({
      where: { itemCode_year: { itemCode: req.params.itemCode, year } },
    });
    const nextSeq = (existing?.seq || 0) + 1;
    return res.json({ success: true, data: { lotNo: `${year}-${String(nextSeq).padStart(3, "0")}` } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function listPacks(req, res) {
  try {
    const { itemCode, lotNo, status, page = 1, limit = 50 } = req.query;
    const where = {};
    if (itemCode) where.itemCode = itemCode;
    if (lotNo) where.lotNo = lotNo;
    if (status) where.status = status;
    const [total, packs] = await Promise.all([
      prisma.printMaster.count({ where }),
      prisma.printMaster.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: parseInt(limit) }),
    ]);
    return res.json({ success: true, data: packs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getPackById(req, res) {
  try {
    const pack = await prisma.printMaster.findUnique({ where: { packId: decodeURIComponent(req.params.packId) } });
    if (!pack) return res.status(404).json({ success: false, error: "Pack not found" });
    return res.json({ success: true, data: pack });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getPackLabel(req, res) {
  try {
    const pack = await prisma.printMaster.findUnique({ where: { packId: decodeURIComponent(req.params.packId) } });
    if (!pack) return res.status(404).json({ success: false, error: "Pack not found" });
    const buf = await generateLabelBuffer(pack);
    const safeName = (pack.itemName || pack.itemCode).replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
    const filename = `${safeName}-${pack.itemCode}-${pack.lotNo}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    return res.send(buf);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getBatchLabels(req, res) {
  try {
    const packs = await prisma.printMaster.findMany({
      where: { itemCode: req.params.itemCode, lotNo: decodeURIComponent(req.params.lotNo) },
      orderBy: { bagNo: "asc" },
    });
    if (!packs.length) return res.status(404).json({ success: false, error: "No packs found" });
    const buf = await generateBatchLabelBuffer(packs);
    const sample = packs[0];
    const safeName = (sample.itemName || sample.itemCode).replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
    const filename = `labels-${safeName}-${sample.itemCode}-${sample.lotNo}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    return res.send(buf);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function generatePacks(req, res) {
  try {
    const { itemCode, itemName, numberOfBags, packQty, uom, supplier, invoiceNo, receivedDate } = req.body;
    if (!itemCode || !itemName || !numberOfBags || !packQty || !uom)
      return res.status(400).json({ success: false, error: "itemCode, itemName, numberOfBags, packQty, uom are required" });
    const result = await generatePackBatch({ itemCode, itemName, numberOfBags: parseInt(numberOfBags), packQty: parseFloat(packQty), uom, supplier, invoiceNo, receivedDate });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
