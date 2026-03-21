import mongoose from "mongoose";

const orderEventSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    type: { type: String, default: "status_change" },
    fromStatus: { type: String, default: "" },
    toStatus: { type: String, default: "" },
    note: { type: String, default: "" },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

orderEventSchema.index({ orderId: 1, createdAt: -1 });

const orderEventModel = mongoose.models.orderEvent || mongoose.model("orderEvent", orderEventSchema);

export default orderEventModel;

