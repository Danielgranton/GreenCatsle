import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "business", required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: "" },
  },
  { timestamps: true }
);

reviewSchema.index({ businessId: 1, createdAt: -1 });

const reviewModel = mongoose.models.review || mongoose.model("review", reviewSchema);

export default reviewModel;

