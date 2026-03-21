import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getUnreadCount,
  listMyNotifications,
  markAllRead,
  markNotificationRead,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", authMiddleware, listMyNotifications);
router.get("/unread-count", authMiddleware, getUnreadCount);
router.post("/read-all", authMiddleware, markAllRead);
router.post("/:id/read", authMiddleware, markNotificationRead);

export default router;

