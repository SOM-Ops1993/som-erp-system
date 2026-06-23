import { Router } from "express";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  actionNotification,
  getUnreadCount,
  getAllNotificationsAdmin,
  getDeliveryLog,
  authenticate,
  authorize,
} from "./notification.controller.js";

const router = Router();

router.get("/", authenticate, getMyNotifications);
router.get("/unread-count", authenticate, getUnreadCount);
router.get("/admin/all", authorize(["admin"]), getAllNotificationsAdmin);
router.get("/delivery-log", authorize(["admin", "store_manager"]), getDeliveryLog);
router.patch("/read-all", authenticate, markAllNotificationsRead);
router.patch("/:id/read", authenticate, markNotificationRead);
router.patch("/:id/action", authenticate, actionNotification);

export default router;
