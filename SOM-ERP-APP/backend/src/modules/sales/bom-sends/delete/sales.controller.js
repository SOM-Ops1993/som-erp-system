import prisma from "../../../../db.js";

// DELETE /api/bom-sends/:id
const deleteBomSend = async (req, res) => {
  try {
    await prisma.bomSend.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
};

export { deleteBomSend };
