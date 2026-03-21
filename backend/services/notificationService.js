import Notification from "../models/notificationModel.js";
import { getIO } from "../realtime/io.js";

export const createNotification = async ({
  recipientUserId,
  type = "generic",
  title = "",
  message = "",
  data = {},
}) => {
  const doc = await Notification.create({
    recipientUserId,
    type,
    title,
    message,
    data,
  });

  const io = getIO();
  if (io) {
    io.to(`user:${String(recipientUserId)}`).emit("notification", {
      id: String(doc._id),
      type: doc.type,
      title: doc.title,
      message: doc.message,
      data: doc.data,
      createdAt: doc.createdAt,
      readAt: doc.readAt,
    });
  }

  return doc;
};

