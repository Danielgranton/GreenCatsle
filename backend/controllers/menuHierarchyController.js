import Business from "../models/businessModel.js";
import MenuCategory from "../models/menuCategoryModel.js";
import MenuSubcategory from "../models/menuSubcategoryModel.js";
import MenuItem from "../models/menuModel.js";
import { deleteObject, makeObjectKey, putObject } from "../services/storageService.js";

const assertOwner = async ({ businessId, user }) => {
  const business = await Business.findById(businessId);
  if (!business) return { error: { status: 404, message: "Business not found" } };
  if (!user || !user._id?.equals(business.ownerId)) {
    return { error: { status: 403, message: "Access denied" } };
  }
  return { business };
};

export const createMenuCategory = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { menuType, name, sortOrder } = req.body;
    const { error } = await assertOwner({ businessId, user: req.user });
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    if (!menuType || !["cooked", "noncooked"].includes(menuType)) {
      return res.status(400).json({ success: false, message: "menuType must be cooked or noncooked" });
    }
    if (!name) return res.status(400).json({ success: false, message: "name is required" });

    const category = await MenuCategory.create({
      businessId,
      menuType,
      name,
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
    });

    res.status(201).json({ success: true, category });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create category" });
  }
};

export const listMenuCategories = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { menuType } = req.query;

    const filter = { businessId };
    if (menuType) filter.menuType = menuType;

    const categories = await MenuCategory.find(filter).sort({ sortOrder: 1, name: 1 });
    res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch categories" });
  }
};

export const updateMenuCategory = async (req, res) => {
  try {
    const { businessId, categoryId } = req.params;
    const { error } = await assertOwner({ businessId, user: req.user });
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const updates = {};
    if (typeof req.body?.name === "string") updates.name = req.body.name;
    if (req.body?.menuType && ["cooked", "noncooked"].includes(req.body.menuType)) updates.menuType = req.body.menuType;
    if (req.body?.sortOrder != null && Number.isFinite(Number(req.body.sortOrder))) updates.sortOrder = Number(req.body.sortOrder);
    if (typeof req.body?.isActive === "boolean") updates.isActive = req.body.isActive;

    const category = await MenuCategory.findOneAndUpdate(
      { _id: categoryId, businessId },
      updates,
      { new: true }
    );
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    res.status(200).json({ success: true, category });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update category" });
  }
};

export const deleteMenuCategory = async (req, res) => {
  try {
    const { businessId, categoryId } = req.params;
    const { error } = await assertOwner({ businessId, user: req.user });
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const category = await MenuCategory.findOne({ _id: categoryId, businessId });
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    // Soft constraint: prevent delete if items exist.
    const itemsCount = await MenuItem.countDocuments({ businessId, categoryId });
    if (itemsCount > 0) {
      return res.status(409).json({
        success: false,
        message: "Category has items; move/delete items first",
      });
    }

    const subsCount = await MenuSubcategory.countDocuments({ businessId, categoryId });
    if (subsCount > 0) {
      return res.status(409).json({
        success: false,
        message: "Category has subcategories; delete subcategories first",
      });
    }

    const imageKey = category.image?.key;
    await category.deleteOne();
    if (imageKey) await deleteObject({ key: imageKey });

    res.status(200).json({ success: true, message: "Category deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to delete category" });
  }
};

export const uploadMenuCategoryImage = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "image is required" });
    }

    const { businessId, categoryId } = req.params;
    const { error } = await assertOwner({ businessId, user: req.user });
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const category = await MenuCategory.findOne({ _id: categoryId, businessId });
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    const key = makeObjectKey({ folder: "menu/categories", originalName: req.file.originalname });
    const result = await putObject({ buffer: req.file.buffer, contentType: req.file.mimetype, key });

    const oldKey = category.image?.key;
    category.image = { key: result.key, provider: result.provider };
    await category.save();
    if (oldKey) await deleteObject({ key: oldKey });

    res.status(200).json({ success: true, imageKey: category.image.key });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to upload category image" });
  }
};

export const createMenuSubcategory = async (req, res) => {
  try {
    const { businessId, categoryId } = req.params;
    const { name, sortOrder } = req.body;
    const { error } = await assertOwner({ businessId, user: req.user });
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    if (!name) return res.status(400).json({ success: false, message: "name is required" });

    const category = await MenuCategory.findOne({ _id: categoryId, businessId });
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    const subcategory = await MenuSubcategory.create({
      businessId,
      categoryId,
      name,
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
    });

    res.status(201).json({ success: true, subcategory });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create subcategory" });
  }
};

export const listMenuSubcategories = async (req, res) => {
  try {
    const { businessId, categoryId } = req.params;
    const subs = await MenuSubcategory.find({ businessId, categoryId }).sort({ sortOrder: 1, name: 1 });
    res.status(200).json({ success: true, subcategories: subs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch subcategories" });
  }
};

export const updateMenuSubcategory = async (req, res) => {
  try {
    const { businessId, subcategoryId } = req.params;
    const { error } = await assertOwner({ businessId, user: req.user });
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const updates = {};
    if (typeof req.body?.name === "string") updates.name = req.body.name;
    if (req.body?.sortOrder != null && Number.isFinite(Number(req.body.sortOrder))) updates.sortOrder = Number(req.body.sortOrder);
    if (typeof req.body?.isActive === "boolean") updates.isActive = req.body.isActive;

    const sub = await MenuSubcategory.findOneAndUpdate(
      { _id: subcategoryId, businessId },
      updates,
      { new: true }
    );
    if (!sub) return res.status(404).json({ success: false, message: "Subcategory not found" });
    res.status(200).json({ success: true, subcategory: sub });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update subcategory" });
  }
};

export const deleteMenuSubcategory = async (req, res) => {
  try {
    const { businessId, subcategoryId } = req.params;
    const { error } = await assertOwner({ businessId, user: req.user });
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const sub = await MenuSubcategory.findOne({ _id: subcategoryId, businessId });
    if (!sub) return res.status(404).json({ success: false, message: "Subcategory not found" });

    const itemsCount = await MenuItem.countDocuments({ businessId, subcategoryId });
    if (itemsCount > 0) {
      return res.status(409).json({
        success: false,
        message: "Subcategory has items; move/delete items first",
      });
    }

    const imageKey = sub.image?.key;
    await sub.deleteOne();
    if (imageKey) await deleteObject({ key: imageKey });

    res.status(200).json({ success: true, message: "Subcategory deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to delete subcategory" });
  }
};

export const uploadMenuSubcategoryImage = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "image is required" });
    }

    const { businessId, subcategoryId } = req.params;
    const { error } = await assertOwner({ businessId, user: req.user });
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const sub = await MenuSubcategory.findOne({ _id: subcategoryId, businessId });
    if (!sub) return res.status(404).json({ success: false, message: "Subcategory not found" });

    const key = makeObjectKey({ folder: "menu/subcategories", originalName: req.file.originalname });
    const result = await putObject({ buffer: req.file.buffer, contentType: req.file.mimetype, key });

    const oldKey = sub.image?.key;
    sub.image = { key: result.key, provider: result.provider };
    await sub.save();
    if (oldKey) await deleteObject({ key: oldKey });

    res.status(200).json({ success: true, imageKey: sub.image.key });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to upload subcategory image" });
  }
};

export const getMenuTree = async (req, res) => {
  try {
    const { businessId } = req.params;

    const categories = await MenuCategory.find({ businessId, isActive: true }).sort({ sortOrder: 1, name: 1 });
    const subcategories = await MenuSubcategory.find({ businessId, isActive: true }).sort({ sortOrder: 1, name: 1 });
    const items = await MenuItem.find({ businessId }).sort({ name: 1 });

    const subsByCategory = new Map();
    for (const sub of subcategories) {
      const key = String(sub.categoryId);
      const arr = subsByCategory.get(key) || [];
      arr.push(sub);
      subsByCategory.set(key, arr);
    }

    const itemsByCategory = new Map();
    const itemsBySubcategory = new Map();
    for (const item of items) {
      if (item.subcategoryId) {
        const key = String(item.subcategoryId);
        const arr = itemsBySubcategory.get(key) || [];
        arr.push(item);
        itemsBySubcategory.set(key, arr);
      } else if (item.categoryId) {
        const key = String(item.categoryId);
        const arr = itemsByCategory.get(key) || [];
        arr.push(item);
        itemsByCategory.set(key, arr);
      }
    }

    const cooked = [];
    const noncooked = [];

    for (const cat of categories) {
      const catId = String(cat._id);
      const subs = subsByCategory.get(catId) || [];
      const node = {
        category: cat,
        items: itemsByCategory.get(catId) || [],
        subcategories: subs.map((s) => ({
          subcategory: s,
          items: itemsBySubcategory.get(String(s._id)) || [],
        })),
      };
      if (cat.menuType === "cooked") cooked.push(node);
      else noncooked.push(node);
    }

    res.status(200).json({ success: true, tree: { cooked, noncooked } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to build menu tree" });
  }
};

