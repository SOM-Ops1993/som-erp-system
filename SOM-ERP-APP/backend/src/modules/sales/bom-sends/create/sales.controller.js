import prisma from "../../../../db.js";
import getIssuedQty from "../utils/utils.js";

const nextSendId = async () => {
  const yymm = new Date().toISOString().slice(2, 7).replace("-", "");
  const prefix = `BOM-${yymm}-`;
  const last = await prisma.bomSend.findFirst({
    where: { sendId: { startsWith: prefix } },
    orderBy: { sendId: "desc" },
  });
  const seq = last ? parseInt(last.sendId.slice(-3)) + 1 : 1;
  return prefix + String(seq).padStart(3, "0");
};

// ------------------------ Controller ------------------------

// POST /api/bom-sends
const createBomSend = async (req, res) => {
  try {
    const {
      indentId,
      planId,
      productCode,
      productName,
      batchNo,
      diNo,
      sectionType,
      bomType,
      totalQty,
      uom,
      sentBy,
      remarks,
    } = req.body;

    if (!planId || !productName || !diNo || !bomType || !totalQty)
      return res.status(400).json({
        success: false,
        error: "planId, productName, diNo, bomType, totalQty are required", code: 'VALIDATION_ERROR' });

    const sendId = await nextSendId();
    const send = await prisma.bomSend.create({
      data: {
        sendId,
        indentId: indentId || null,
        planId,
        productCode: productCode || "",
        productName,
        batchNo: batchNo || "",
        diNo,
        sectionType: sectionType || null,
        bomType,
        totalQty: parseFloat(totalQty),
        uom: uom || "KG",
        status: "PENDING",
        sentBy: sentBy || null,
        remarks: remarks || null,
      },
    });
    return res.json({ success: true, data: send });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
};

// POST /api/bom-sends/:id/issue-pack
const issuePackToBomSend = async (req, res) => {
  try {
    const send = await prisma.bomSend.findUnique({
      where: { id: req.params.id },
    });
    if (!send)
      return res.status(404).json({ success: false, error: "BOM not found", code: 'NOT_FOUND' });
    if (["ISSUED", "CANCELLED"].includes(send.status))
      return res
        .status(400)
        .json({ success: false, error: `BOM already ${send.status}` });

    const { rmCode, packId, qty } = req.body;
    if (!rmCode || !packId)
      return res
        .status(400)
        .json({ success: false, error: "rmCode and packId are required" });

    const pack = await prisma.packBalance.findUnique({ where: { packId } });
    if (!pack)
      return res
        .status(404)
        .json({ success: false, error: `Pack not found: ${packId}` });
    if (pack.itemCode.toUpperCase() !== rmCode.toUpperCase())
      return res.status(400).json({
        success: false,
        error: `Pack item (${pack.itemCode}) does not match RM (${rmCode})`,
      });
    if (pack.remainingQty <= 0)
      return res
        .status(400)
        .json({ success: false, error: "Pack is empty (no remaining qty)" });

    const recipe = await prisma.recipeDb.findFirst({
      where: { productCode: send.productCode, rmCode },
    });
    if (!recipe)
      return res.status(404).json({
        success: false,
        error: `RM ${rmCode} not found in recipe for ${send.productCode}`,
      });

    const requiredQty = parseFloat(
      (recipe.qtyPerUnit * send.totalQty).toFixed(3),
    );
    const issuedSoFar = await getIssuedQty(send.sendId, rmCode);
    const remainingNeeded = parseFloat(
      Math.max(0, requiredQty - issuedSoFar).toFixed(3),
    );

    if (remainingNeeded <= 0)
      return res.status(400).json({
        success: false,
        error: "This material is already fully issued", code: 'VALIDATION_ERROR' });

    const requested = qty ? parseFloat(qty) : null;
    const deduct = parseFloat(
      Math.min(
        requested ?? pack.remainingQty,
        pack.remainingQty,
        remainingNeeded,
      ).toFixed(3),
    );

    if (deduct <= 0)
      return res
        .status(400)
        .json({ success: false, error: "Nothing to deduct" });

    await prisma.$transaction(async (tx) => {
      await tx.packBalance.update({
        where: { packId },
        data: {
          remainingQty: parseFloat((pack.remainingQty - deduct).toFixed(3)),
        },
      });

      const prevLedger = await tx.stockLedger.findFirst({
        where: { itemCode: rmCode },
        orderBy: { timestamp: "desc" },
      });
      await tx.stockLedger.create({
        data: {
          itemCode: rmCode,
          sourceId: packId,
          transactionType: "BOM_ISSUANCE",
          outQty: deduct,
          balance: parseFloat(((prevLedger?.balance ?? 0) - deduct).toFixed(3)),
          reference: `${send.sendId} | ${send.productName} | DI:${send.diNo}`,
        },
      });
    });

    const allRecipe = await prisma.recipeDb.findMany({
      where: { productCode: send.productCode },
    });
    let allDone = true,
      anyDone = false;
    for (const r of allRecipe) {
      const rqty = parseFloat((r.qtyPerUnit * send.totalQty).toFixed(3));
      const iss = await getIssuedQty(send.sendId, r.rmCode);
      if (iss > 0) anyDone = true;
      if (iss < rqty * 0.999) allDone = false;
    }

    await prisma.bomSend.update({
      where: { id: send.id },
      data: {
        status: allDone ? "ISSUED" : anyDone ? "PICKED" : "PENDING",
        issuedAt: allDone ? new Date() : undefined,
        pickedAt:
          anyDone && !allDone ? (send.pickedAt ?? new Date()) : undefined,
      },
    });

    const newItemRemaining = parseFloat(
      Math.max(0, remainingNeeded - deduct).toFixed(3),
    );
    const newPackRemaining = parseFloat(
      (pack.remainingQty - deduct).toFixed(3),
    );

    return res.json({
      success: true,
      deducted: deduct,
      packRemaining: newPackRemaining,
      itemRemaining: newItemRemaining,
      itemFullyDone: newItemRemaining <= 0,
      bomFullyDone: allDone,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
};

export { createBomSend, issuePackToBomSend };
