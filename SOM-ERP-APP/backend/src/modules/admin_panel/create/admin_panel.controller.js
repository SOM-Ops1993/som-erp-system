import prisma from '../../../db.js';
import { getMeta } from '../get/admin_panel.controller.js';

export const createRecord = async (req, res) => {
  const meta = getMeta(req.params.resource);
  if (!meta) return res.status(404).json({ success: false, error: 'Unknown resource', code: 'NOT_FOUND' });
  try {
    const record = await prisma[meta.model].create({ data: req.body });
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, code: 'VALIDATION_ERROR' });
  }
}
