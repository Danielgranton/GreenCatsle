import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    ownerType: { type: String, enum: ["system", "business"], required: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "business", default: null },
    currency: { type: String, default: "KES" },

    // Cached balances in "major units" (Number). If you later need stronger guarantees,
    // migrate to minor-unit integers.
    availableBalance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

walletSchema.index({ ownerType: 1 }, { unique: false });
walletSchema.index(
  { ownerType: 1, businessId: 1 },
  { unique: true, partialFilterExpression: { ownerType: "business" } }
);

const walletModel = mongoose.models.wallet || mongoose.model("wallet", walletSchema);

export default walletModel;

