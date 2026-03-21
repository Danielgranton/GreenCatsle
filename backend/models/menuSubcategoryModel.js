import mongoose from "mongoose";

const menuSubcategorySchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "business", required: true },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "menuCategory",
      required: true,
    },
    name: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    image: {
      key: { type: String, default: null },
      provider: { type: String, enum: ["local", "s3"], default: "local" },
    },
  },
  { timestamps: true }
);

menuSubcategorySchema.index({ businessId: 1, categoryId: 1, sortOrder: 1 });
menuSubcategorySchema.index({ businessId: 1, name: 1 }, { unique: false });

const menuSubcategoryModel =
  mongoose.models.menuSubcategory || mongoose.model("menuSubcategory", menuSubcategorySchema);

export default menuSubcategoryModel;

