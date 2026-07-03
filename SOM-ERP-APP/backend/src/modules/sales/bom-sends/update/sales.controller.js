import prisma from "../../../../db.js";

//  -------------------  Controller -------------------

// PATCH /api/bom-sends/:id/status
const updateBomSendStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const allowed = [
      "PENDING",
      "PICKED",
      "READY_TO_ISSUE",
      "ISSUED",
      "CANCELLED",
    ];
    if (!allowed.includes(status))
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${allowed.join(", ")}`,
      });

    const data = { status };
    if (remarks !== undefined) data.remarks = remarks;
    if (status === "PICKED") data.pickedAt = new Date();
    if (status === "ISSUED") data.issuedAt = new Date();

    const send = await prisma.bomSend.update({
      where: { id: req.params.id },
      data,
    });
    return res.json({ success: true, data: send });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
};

export { updateBomSendStatus };
