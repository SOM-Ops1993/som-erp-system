import prisma from "../../../../db.js";

const getIssuedQty = async (sendId, rmCode) => {
  const rows = await prisma.stockLedger.findMany({
    where: {
      transactionType: "BOM_ISSUANCE",
      reference: { contains: sendId },
      itemCode: rmCode,
    },
  });
  return rows.reduce((s, r) => s + (r.outQty || 0), 0);
};

export default getIssuedQty;
