import prisma from '../../../db.js';
import { getMeta, buildWhere } from '../get/admin_panel.controller.js';

export const deleteRecord = async (req, res) => {
  const meta = getMeta(req.params.resource);
  if (!meta) return res.status(404).json({ success: false, error: 'Unknown resource', code: 'NOT_FOUND' });
  try {
    const where = buildWhere(meta, req.params);
    await prisma[meta.model].delete({ where });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, code: 'VALIDATION_ERROR' });
  }
}

export const deleteAllRecords = async (req, res) => {
  const meta = getMeta(req.params.resource);
  if (!meta) return res.status(404).json({ success: false, error: 'Unknown resource', code: 'NOT_FOUND' });
  try {
    const result = await prisma[meta.model].deleteMany({});
    return res.json({ success: true, deleted: result.count });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, code: 'VALIDATION_ERROR' });
  }
}
