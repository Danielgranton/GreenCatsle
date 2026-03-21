import Notification from "../models/notificationModel.js";

const toInt = (value, fallback) => {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

export const listMyNotifications = async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, toInt(req.query?.limit, 30)));
    const includeRead = req.query?.includeRead === "true";

    const filter = { recipientUserId: req.user.id };
    if (!includeRead) filter.readAt = null;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipientUserId: req.user.id,
      readAt: null,
    });
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch unread count" });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Notification.findOneAndUpdate(
      { _id: id, recipientUserId: req.user.id },
      { readAt: new Date() },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Notification not found" });
    res.status(200).json({ success: true, notification: doc });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to mark read" });
  }
};

export const markAllRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipientUserId: req.user.id, readAt: null },
      { $set: { readAt: new Date() } }
    );
    res.status(200).json({ success: true, modifiedCount: result.modifiedCount || 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to mark all read" });
  }
};

