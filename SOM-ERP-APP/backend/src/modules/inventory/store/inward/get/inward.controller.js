import prisma from "../../../../../db.js";
import { generatePackBatch } from "../../../../../services/pack-generator.js";
import { generateLabelBuffer, generateBatchLabelBuffer } from "../../../../../services/label-service.js";

export const getPendingInwardGroups = async (req, res) => {
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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}

export const getNextLotNumber = async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const existing = await prisma.lotSequence.findUnique({
      where: { itemCode_year: { itemCode: req.params.itemCode, year } },
    });
    const nextSeq = (existing?.seq || 0) + 1;
    return res.json({ success: true, data: { lotNo: `${year}-${String(nextSeq).padStart(3, "0")}` } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}

export const listPacks = async (req, res) => {
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
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}

export const getPackById = async (req, res) => {
  try {
    const pack = await prisma.printMaster.findUnique({ where: { packId: decodeURIComponent(req.params.packId) } });
    if (!pack) return res.status(404).json({ success: false, error: "Pack not found", code: 'NOT_FOUND' });
    return res.json({ success: true, data: pack });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}

export const getPackLabel = async (req, res) => {
  try {
    const pack = await prisma.printMaster.findUnique({ where: { packId: decodeURIComponent(req.params.packId) } });
    if (!pack) return res.status(404).json({ success: false, error: "Pack not found", code: 'NOT_FOUND' });
    const buf = await generateLabelBuffer(pack);
    const safeName = (pack.itemName || pack.itemCode).replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
    const filename = `${safeName}-${pack.itemCode}-${pack.lotNo}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    return res.send(buf);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}

export const getBatchLabels = async (req, res) => {
  try {
    const packs = await prisma.printMaster.findMany({
      where: { itemCode: req.params.itemCode, lotNo: decodeURIComponent(req.params.lotNo) },
      orderBy: { bagNo: "asc" },
    });
    if (!packs.length) return res.status(404).json({ success: false, error: "No packs found", code: 'NOT_FOUND' });
    const buf = await generateBatchLabelBuffer(packs);
    const sample = packs[0];
    const safeName = (sample.itemName || sample.itemCode).replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
    const filename = `labels-${safeName}-${sample.itemCode}-${sample.lotNo}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    return res.send(buf);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}

export const generatePacks = async (req, res) => {
  try {
    const { itemCode, itemName, numberOfBags, packQty, uom, supplier, invoiceNo, receivedDate } = req.body;
    if (!itemCode || !itemName || !numberOfBags || !packQty || !uom)
      return res.status(400).json({ success: false, error: "itemCode, itemName, numberOfBags, packQty, uom are required", code: 'VALIDATION_ERROR' });
    const result = await generatePackBatch({ itemCode, itemName, numberOfBags: parseInt(numberOfBags), packQty: parseFloat(packQty), uom, supplier, invoiceNo, receivedDate });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}

export const listInward = async (req, res) => {
  try {
    const { itemCode, page = 1, limit = 50 } = req.query
    const where = itemCode ? { itemCode } : {}
    const [total, records] = await Promise.all([
      prisma.inward.count({ where }),
      prisma.inward.findMany({ where, orderBy: { inwardTime: 'desc' }, skip: (page - 1) * limit, take: parseInt(limit) })
    ])
    return res.json({ success: true, data: records, total })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const listActiveSessions = async (req, res) => {
  try {
    const sessions = await prisma.inwardSession.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' }
    })
    return res.json({ success: true, data: sessions })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getSession = async (req, res) => {
  try {
    const session = await prisma.inwardSession.findUnique({ where: { sessionId: req.params.sessionId } })
    if (!session) return res.status(404).json({ success: false, error: 'Session not found', code: 'NOT_FOUND' })
    const allPacks = await prisma.printMaster.findMany({
      where: { itemCode: session.itemCode, lotNo: session.lotNo },
      orderBy: { bagNo: 'asc' }
    })
    const pendingPackIds = allPacks.filter(p => !session.scannedPackIds.includes(p.packId)).map(p => p.packId)
    return res.json({ success: true, data: { ...session, pendingPackIds } })
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}
