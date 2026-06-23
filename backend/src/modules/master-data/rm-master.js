import { Router } from "express";
import prisma from "../../db.js";

const rmMasterRouter = Router();

// GET /api/rm
rmMasterRouter.get("/", async (req, res) => {
  const { search } = req.query;
  const where = search
    ? {
        OR: [
          { itemCode: { contains: search, mode: "insensitive" } },
          { itemName: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};
  const items = await prisma.rmMaster.findMany({
    where,
    orderBy: { itemName: "asc" },
  });
  return res.json({ success: true, data: items });
});

// NOTE: static paths like /meta/warehouses MUST come before /:itemCode
// otherwise Express matches "meta" as the itemCode param
// GET /api/rm/meta/warehouses
rmMasterRouter.get("/meta/warehouses", async (req, res) => {
  const rows = await prisma.inward.findMany({
    distinct: ["warehouse"],
    select: { warehouse: true },
  });
  return res.json({ success: true, data: rows.map((r) => r.warehouse) });
});

// GET /api/rm/:itemCode
rmMasterRouter.get("/:itemCode", async (req, res) => {
  const item = await prisma.rmMaster.findUnique({
    where: { itemCode: req.params.itemCode },
  });
  if (!item)
    return res.status(404).json({ success: false, error: "RM not found" });
  return res.json({ success: true, data: item });
});

// POST /api/rm
rmMasterRouter.post("/", async (req, res) => {
  const { itemCode, itemName, uom, trackingType } = req.body;
  if (!itemCode || !itemName || !uom)
    return res
      .status(400)
      .json({
        success: false,
        error: "itemCode, itemName and uom are required",
      });
  const existing = await prisma.rmMaster.findFirst({
    where: { OR: [{ itemCode }, { itemName }] },
  });
  if (existing)
    return res
      .status(409)
      .json({ success: false, error: "Item code or name already exists" });
  const item = await prisma.rmMaster.create({
    data: { itemCode, itemName, uom, trackingType: trackingType || "PACK" },
  });
  return res.status(201).json({ success: true, data: item });
});

// PUT /api/rm/:itemCode
rmMasterRouter.put("/:itemCode", async (req, res) => {
  const { itemName, uom, trackingType } = req.body;
  const data = { itemName, uom };
  if (trackingType) data.trackingType = trackingType;
  const item = await prisma.rmMaster.update({
    where: { itemCode: req.params.itemCode },
    data,
  });
  return res.json({ success: true, data: item });
});

// DELETE /api/rm/:itemCode
rmMasterRouter.delete("/:itemCode", async (req, res) => {
  await prisma.rmMaster.delete({ where: { itemCode: req.params.itemCode } });
  return res.json({ success: true, message: "Deleted" });
});

export default rmMasterRouter;
