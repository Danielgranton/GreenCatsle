import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
  {
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: "wallet", required: true },
    direction: { type: String, enum: ["credit", "debit"], required: true },
    status: { type: String, enum: ["posted", "reversed"], default: "posted" },

    balance: { type: String, enum: ["available", "pending"], default: "available" },

    amount: { type: Number, required: true }, // major units
    currency: { type: String, default: "KES" },

    kind: { type: String, default: "generic" }, // e.g. payment_settlement, platform_fee, refund
    externalRef: { type: String, default: "" }, // idempotency key (unique when set)

    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "business", default: null },

    note: { type: String, default: "" },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ walletId: 1, createdAt: -1 });
walletTransactionSchema.index(
  { externalRef: 1 },
  { unique: true, partialFilterExpression: { externalRef: { $type: "string", $ne: "" } } }
);

const walletTransactionModel =
  mongoose.models.walletTransaction || mongoose.model("walletTransaction", walletTransactionSchema);

export default walletTransactionModel;
