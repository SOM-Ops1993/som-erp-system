import prisma from '../../../db.js';
import { getMeta, buildWhere } from '../get/admin_panel.controller.js';

export const updateRecord = async (req, res) => {
  const meta = getMeta(req.params.resource);
  if (!meta) return res.status(404).json({ success: false, error: 'Unknown resource', code: 'NOT_FOUND' });
  try {
    const where  = buildWhere(meta, req.params);
    const record = await prisma[meta.model].update({ where, data: req.body });
    return res.json({ success: true, data: record });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, code: 'VALIDATION_ERROR' });
  }
}
