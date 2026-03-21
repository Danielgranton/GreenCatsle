import mongoose from "mongoose";

const jobApplicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "job",
      required: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "business",
      required: true,
    },
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
    coverLetter: {
      type: String,
      trim: true,
    },
    resume: {
      key: String,
      provider: String,
      originalName: String,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const jobApplicationModel =
  mongoose.models.jobApplication || mongoose.model("jobApplication", jobApplicationSchema);

export default jobApplicationModel;
