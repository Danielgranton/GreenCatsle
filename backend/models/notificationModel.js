import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    type: { type: String, default: "generic" },
    title: { type: String, default: "" },
    message: { type: String, default: "" },
    data: { type: Object, default: {} },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientUserId: 1, createdAt: -1 });
notificationSchema.index({ recipientUserId: 1, readAt: 1, createdAt: -1 });

const notificationModel =
  mongoose.models.notification || mongoose.model("notification", notificationSchema);

export default notificationModel;

