import mongoose from "mongoose";

const menuCategorySchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "business", required: true },
    menuType: { type: String, enum: ["cooked", "noncooked"], required: true },
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

menuCategorySchema.index({ businessId: 1, menuType: 1, sortOrder: 1 });
menuCategorySchema.index({ businessId: 1, name: 1 }, { unique: false });

const menuCategoryModel =
  mongoose.models.menuCategory || mongoose.model("menuCategory", menuCategorySchema);

export default menuCategoryModel;

