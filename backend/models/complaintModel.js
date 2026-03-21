import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "business", required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    type: {
      type: String,
      enum: ["delivery", "quality", "payment", "service", "other"],
      default: "other",
    },
    message: { type: String, required: true },
    status: { type: String, enum: ["open", "in_progress", "resolved", "rejected"], default: "open" },
    resolution: { type: String, default: "" },
    handledByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    handledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

complaintSchema.index({ businessId: 1, createdAt: -1 });
complaintSchema.index({ userId: 1, createdAt: -1 });
complaintSchema.index({ status: 1, createdAt: -1 });

const complaintModel =
  mongoose.models.complaint || mongoose.model("complaint", complaintSchema);

export default complaintModel;

