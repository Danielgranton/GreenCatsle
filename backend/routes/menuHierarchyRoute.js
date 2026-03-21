import express from "express";
import multer from "multer";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/allowRoles.js";
import Business from "../models/businessModel.js";
import {
  createMenuCategory,
  deleteMenuCategory,
  getMenuTree,
  listMenuCategories,
  listMenuSubcategories,
  createMenuSubcategory,
  deleteMenuSubcategory,
  updateMenuCategory,
  updateMenuSubcategory,
  uploadMenuCategoryImage,
  uploadMenuSubcategoryImage,
} from "../controllers/menuHierarchyController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const assertOwner = async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const business = await Business.findById(businessId).select("ownerId");
    if (!business) return res.status(404).json({ success: false, message: "Business not found" });
    const isSuper = req.user?.role === "superadmin";
    const isOwner = req.user?._id && business.ownerId && req.user._id.equals(business.ownerId);
    if (!isSuper && !isOwner) return res.status(403).json({ success: false, message: "Access denied" });
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Failed to authorize menu access" });
  }
};

router.use(authMiddleware, allowRoles("admin", "superadmin"));

router.get("/business/:businessId/tree", assertOwner, getMenuTree);

router.post("/business/:businessId/categories", assertOwner, createMenuCategory);
router.get("/business/:businessId/categories", assertOwner, listMenuCategories);
router.patch("/business/:businessId/categories/:categoryId", assertOwner, updateMenuCategory);
router.delete("/business/:businessId/categories/:categoryId", assertOwner, deleteMenuCategory);
router.put(
  "/business/:businessId/categories/:categoryId/image",
  assertOwner,
  upload.single("image"),
  uploadMenuCategoryImage
);

router.post("/business/:businessId/categories/:categoryId/subcategories", assertOwner, createMenuSubcategory);
router.get("/business/:businessId/categories/:categoryId/subcategories", assertOwner, listMenuSubcategories);
router.patch("/business/:businessId/subcategories/:subcategoryId", assertOwner, updateMenuSubcategory);
router.delete("/business/:businessId/subcategories/:subcategoryId", assertOwner, deleteMenuSubcategory);
router.put(
  "/business/:businessId/subcategories/:subcategoryId/image",
  assertOwner,
  upload.single("image"),
  uploadMenuSubcategoryImage
);

export default router;

