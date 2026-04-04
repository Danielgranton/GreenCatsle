import mongoose from "mongoose";

const advertSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "business", required: true },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },

    mediaType: { type: String, enum: ["image", "video"], required: true },
    media: {
      key: { type: String, required: true },
      provider: { type: String, enum: ["local", "s3"], default: "local" },
      contentType: { type: String, default: "" },
    },

    durationSeconds: { type: Number, default: 10 }, // client should display for 10s
    durationDays: { type: Number, default: 5 }, // how long the advert runs in the feed once activated

    currency: { type: String, default: "KES" },
    priceAmount: { type: Number, default: 5000 },
    status: { type: String, enum: ["pending_payment", "active", "expired", "rejected", "archived"], default: "pending_payment" },

    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null },
    paidAt: { type: Date, default: null },
    activatedAt: { type: Date, default: null },
    activationSource: { type: String, enum: ["trial", "paid"], default: null },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },

    pendingRenewalDays: { type: Number, default: null },

    title: { type: String, default: "" },
    note: { type: String, default: "" },

    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

advertSchema.index({ businessId: 1, createdAt: -1 });
advertSchema.index({ status: 1, createdAt: -1 });

const advertModel = mongoose.models.advert || mongoose.model("advert", advertSchema);

export default advertModel;
