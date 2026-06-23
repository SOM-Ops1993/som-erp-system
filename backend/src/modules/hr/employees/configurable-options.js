// Manages dropdown lists: CARRIER, PRIMARY_PACK, SECONDARY_PACK
import express from "express";
import prisma from "../../../db.js";

const router = express.Router();

// GET /api/config-options?category=CARRIER  (or omit for all)
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    const where = category ? { category, isActive: true } : { isActive: true };
    const options = await prisma.configurableOption.findMany({
      where,
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { value: "asc" }],
    });
    res.json({ success: true, data: options });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/config-options — add new option
router.post("/", async (req, res) => {
  try {
    const { category, value } = req.body;
    if (!category?.trim() || !value?.trim())
      return res.status(400).json({ success: false, error: "category and value required" });

    const validCategories = ["CARRIER", "PRIMARY_PACK", "SECONDARY_PACK"];
    if (!validCategories.includes(category.toUpperCase()))
      return res.status(400).json({
        success: false,
        error: `category must be one of: ${validCategories.join(", ")}`,
      });

    const existing = await prisma.configurableOption.findUnique({
      where: { category_value: { category: category.toUpperCase(), value: value.trim() } },
    });
    if (existing) {
      if (!existing.isActive) {
        const updated = await prisma.configurableOption.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
        return res.json({ success: true, data: updated });
      }
      return res.status(409).json({ success: false, error: "Option already exists" });
    }

    const maxOrder = await prisma.configurableOption.aggregate({
      where: { category: category.toUpperCase() },
      _max: { sortOrder: true },
    });

    const option = await prisma.configurableOption.create({
      data: {
        category: category.toUpperCase(),
        value: value.trim(),
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
    res.json({ success: true, data: option });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT /api/config-options/:id — rename value
router.put("/:id", async (req, res) => {
  try {
    const existing = await prisma.configurableOption.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: "Not found" });

    const updated = await prisma.configurableOption.update({
      where: { id: req.params.id },
      data: {
        value: req.body.value ? req.body.value.trim() : existing.value,
        sortOrder:
          req.body.sortOrder !== undefined ? parseInt(req.body.sortOrder) : existing.sortOrder,
      },
    });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/config-options/:id — soft delete
router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.configurableOption.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: "Not found" });
    await prisma.configurableOption.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
