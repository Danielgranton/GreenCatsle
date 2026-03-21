import mongoose from "mongoose";

const payoutRequestSchema = new mongoose.Schema(
  {
    ownerType: { type: String, enum: ["business", "system"], default: "business" },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "business", default: null },
    requestedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },

    amount: { type: Number, required: true }, // major units
    currency: { type: String, default: "KES" },

    method: { type: String, enum: ["mpesa", "bank", "stripe", "paypal", "manual"], default: "mpesa" },
    destination: { type: Object, default: {} }, // { phone } or bank details

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "processing", "paid", "failed"],
      default: "pending",
    },
    reviewedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },

    // Wallet transaction externalRef used for the debit when approved.
    walletExternalRef: { type: String, default: "" },

    providerRef: { type: String, default: "" },
    executedAt: { type: Date, default: null },
    providerMeta: { type: Object, default: {} },
  },
  { timestamps: true }
);

payoutRequestSchema.index({ ownerType: 1, createdAt: -1 });
payoutRequestSchema.index({ businessId: 1, createdAt: -1 });
payoutRequestSchema.index({ status: 1, createdAt: -1 });

const payoutRequestModel =
  mongoose.models.payoutRequest || mongoose.model("payoutRequest", payoutRequestSchema);

export default payoutRequestModel;
