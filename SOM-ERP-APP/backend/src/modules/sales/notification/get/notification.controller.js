import prisma from "../../../../db.js";

function userNotifWhere(user) {
  return {
    OR: [
      { targetUserId: user.user_id },
      { targetRole: user.role },
    ],
  };
}

export const getMyNotifications = async (req, res) => {
  try {
    const { unread_only, limit = 50, offset = 0 } = req.query;
    const where = { ...userNotifWhere(req.user) };
    if (unread_only === "true") where.isRead = false;

    const [data, unreadCount] = await Promise.all([
      prisma.erpNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.erpNotification.count({
        where: { ...userNotifWhere(req.user), isRead: false },
      }),
    ]);
    return res.json({ success: true, data, unread_count: unreadCount });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}

export const getUnreadCount = async (req, res) => {
  try {
    const count = await prisma.erpNotification.count({
      where: { ...userNotifWhere(req.user), isRead: false },
    });
    return res.json({ success: true, count });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}

export const getAllNotificationsAdmin = async (req, res) => {
  try {
    const { notif_type, is_actioned, limit = 100, offset = 0 } = req.query;
    const where = {};
    if (notif_type) where.notifType = notif_type;
    if (is_actioned !== undefined) where.isActioned = is_actioned === "true";

    const rows = await prisma.erpNotification.findMany({
      where,
      include: { targetUser: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: Number(offset),
    });
    const data = rows.map((n) => ({
      ...n,
      target_user_name: n.targetUser?.fullName ?? null,
      targetUser: undefined,
    }));
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}

export const getDeliveryLog = async (req, res) => {
  try {
    const { notif_id, limit = 50, offset = 0 } = req.query;
    const where = {};
    if (notif_id) where.notifId = notif_id;

    const rows = await prisma.notificationDeliveryLog.findMany({
      where,
      include: { notification: { select: { title: true, notifType: true } } },
      orderBy: { sentAt: "desc" },
      take: Number(limit),
      skip: Number(offset),
    });
    const data = rows.map((d) => ({
      ...d,
      title: d.notification?.title ?? null,
      notif_type: d.notification?.notifType ?? null,
      notification: undefined,
    }));
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}
