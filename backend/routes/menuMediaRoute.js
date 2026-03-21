import express from "express";
import multer from "multer";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/allowRoles.js";
import { uploadMenuItemImage } from "../controllers/menuServiceMediaController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware, allowRoles("admin", "superadmin"));

router.put("/business/:businessId/items/:menuItemId/image", upload.single("image"), uploadMenuItemImage);

export default router;

