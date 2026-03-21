import mongoose from "mongoose";

const webhookEventSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ["mpesa", "stripe", "paypal", "unknown"], default: "unknown" },
    eventType: { type: String, default: "" },
    externalId: { type: String, default: "" },
    status: { type: String, enum: ["received", "processed", "failed"], default: "received" },
    errorMessage: { type: String, default: "" },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

webhookEventSchema.index({ provider: 1, createdAt: -1 });
webhookEventSchema.index({ status: 1, createdAt: -1 });
webhookEventSchema.index({ externalId: 1 }, { unique: false });

const webhookEventModel =
  mongoose.models.webhookEvent || mongoose.model("webhookEvent", webhookEventSchema);

export default webhookEventModel;

