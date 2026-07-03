import prisma from "../../../../db.js";
import { writeAudit, auditUser } from "../../../../middleware/audit.js";

function userNotifWhere(user) {
  return {
    OR: [
      { targetUserId: user.user_id },
      { targetRole: user.role },
    ],
  };
}

export const markNotificationRead = async (req, res) => {
  try {
    await prisma.erpNotification.update({
      where: { notifId: req.params.id },
      data: { isRead: true },
    });
    return res.json({ success: true });
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ success: false, error: "Notification not found", code: 'NOT_FOUND' });
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}

export const markAllNotificationsRead = async (req, res) => {
  try {
    await prisma.erpNotification.updateMany({
      where: { ...userNotifWhere(req.user), isRead: false },
      data: { isRead: true },
    });
    return res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}

export const actionNotification = async (req, res) => {
  try {
    await prisma.erpNotification.update({
      where: { notifId: req.params.id },
      data: {
        isActioned: true,
        actionedAt: new Date(),
        actionedBy: req.user.user_id,
        isRead: true,
      },
    });
    await writeAudit({
      ...auditUser(req),
      action: "ACTION",
      tableName: "notifications",
      recordId: req.params.id,
    });
    return res.json({ success: true });
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ success: false, error: "Notification not found", code: 'NOT_FOUND' });
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}
