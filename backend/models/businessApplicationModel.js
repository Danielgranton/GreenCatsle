import mongoose from "mongoose";

const businessApplicationSchema = new mongoose.Schema(
  {
    applicantUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    businessName: { type: String, required: true },
    category: {
      type: String,
      enum: ["restaurant", "hotel", "cafe", "bar", "resort"],
      required: true,
    },
    address: { type: String, required: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },

    logo: {
      key: { type: String, default: null },
      provider: { type: String, enum: ["local", "s3"], default: "local" },
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: { type: String, default: "" },

    reviewedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    reviewedAt: { type: Date, default: null },

    createdBusinessId: { type: mongoose.Schema.Types.ObjectId, ref: "business", default: null },
  },
  { timestamps: true }
);

businessApplicationSchema.index({ applicantUserId: 1, createdAt: -1 });
businessApplicationSchema.index({ status: 1, createdAt: -1 });

const businessApplicationModel =
  mongoose.models.businessApplication ||
  mongoose.model("businessApplication", businessApplicationSchema);

export default businessApplicationModel;
