import { Router } from "express";
import { authenticate, authorize } from "../../../middleware/auth.js";
import {
  getMyNotifications,
  getUnreadCount,
  getAllNotificationsAdmin,
  getDeliveryLog,
} from "./get/notification.controller.js";
import {
  markNotificationRead,
  markAllNotificationsRead,
  actionNotification,
} from "./update/notification.controller.js";

const router = Router();

router.get("/", authenticate, getMyNotifications);
router.get("/unread-count", authenticate, getUnreadCount);
router.get("/admin/all", authorize(["admin"]), getAllNotificationsAdmin);
router.get("/delivery-log", authorize(["admin", "store"]), getDeliveryLog);
router.patch("/read-all", authenticate, markAllNotificationsRead);
router.patch("/:id/read", authenticate, markNotificationRead);
router.patch("/:id/action", authenticate, actionNotification);

export default router;
