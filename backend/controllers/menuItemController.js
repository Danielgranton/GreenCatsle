import Business from "../models/businessModel.js";
import MenuItem from "../models/menuModel.js";
import MenuCategory from "../models/menuCategoryModel.js";
import MenuSubcategory from "../models/menuSubcategoryModel.js";
import { deleteObject } from "../services/storageService.js";

const assertOwner = async ({ businessId, user }) => {
  const business = await Business.findById(businessId).select("ownerId menu");
  if (!business) return { error: { status: 404, message: "Business not found" } };
  const isSuper = user?.role === "superadmin";
  const isOwner = user?._id && business.ownerId && user._id.equals(business.ownerId);
  if (!isSuper && !isOwner) return { error: { status: 403, message: "Access denied" } };
  return { business };
};

export const updateMenuItem = async (req, res) => {
  try {
    const { businessId, menuItemId } = req.params;
    const { error } = await assertOwner({ businessId, user: req.user });
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const item = await MenuItem.findById(menuItemId);
    if (!item) return res.status(404).json({ success: false, message: "Menu item not found" });
    if (String(item.businessId) !== String(businessId)) {
      return res.status(403).json({ success: false, message: "Menu item does not belong to business" });
    }

    const updates = {};
    if (typeof req.body?.name === "string") updates.name = req.body.name;
    if (typeof req.body?.description === "string") updates.description = req.body.description;
    if (req.body?.price != null && Number.isFinite(Number(req.body.price))) updates.price = Number(req.body.price);
    if (req.body?.availability && ["available", "unavailable"].includes(req.body.availability)) {
      updates.availability = req.body.availability;
    }

    // Optional move between categories/subcategories.
    if (req.body?.categoryId) {
      const category = await MenuCategory.findOne({ _id: req.body.categoryId, businessId });
      if (!category) return res.status(404).json({ success: false, message: "Menu category not found" });
      updates.categoryId = category._id;
      updates.menuType = category.menuType;
      updates.category = category.name;

      if (req.body?.subcategoryId) {
        const sub = await MenuSubcategory.findOne({
          _id: req.body.subcategoryId,
          businessId,
          categoryId: category._id,
        });
        if (!sub) return res.status(404).json({ success: false, message: "Menu subcategory not found" });
        updates.subcategoryId = sub._id;
      } else if (req.body?.subcategoryId === null || req.body?.subcategoryId === "") {
        updates.subcategoryId = null;
      }
    }

    const updated = await MenuItem.findOneAndUpdate(
      { _id: menuItemId, businessId },
      updates,
      { new: true }
    );
    res.status(200).json({ success: true, menuItem: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update menu item" });
  }
};

export const deleteMenuItem = async (req, res) => {
  try {
    const { businessId, menuItemId } = req.params;
    const { business, error } = await assertOwner({ businessId, user: req.user });
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const item = await MenuItem.findById(menuItemId);
    if (!item) return res.status(404).json({ success: false, message: "Menu item not found" });
    if (String(item.businessId) !== String(businessId)) {
      return res.status(403).json({ success: false, message: "Menu item does not belong to business" });
    }

    const imageKey = item.image?.key;
    await item.deleteOne();
    await Business.updateOne({ _id: business._id }, { $pull: { menu: item._id } });
    if (imageKey) await deleteObject({ key: imageKey });

    res.status(200).json({ success: true, message: "Menu item deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to delete menu item" });
  }
};

