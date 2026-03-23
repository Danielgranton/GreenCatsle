import mongoose from "mongoose";

const driverApplicationSchema = new mongoose.Schema(
  {
    applicantName: {
      type: String,
      required: true,
      trim: true,
    },
    applicantEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    applicantPhone: {
      type: String,
      trim: true,
    },
    vehicleType: {
      type: String,
      trim: true,
    },
    vehiclePlate: {
      type: String,
      trim: true,
    },
    license: {
      key: String,
      provider: String,
      originalName: String,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    rejectionReason: String,
  },
  { timestamps: true }
);

const driverApplicationModel =
  mongoose.models.driverApplication || mongoose.model("driverApplication", driverApplicationSchema);

export default driverApplicationModel;
