import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/allowRoles.js";
import { deleteMenuItem, updateMenuItem } from "../controllers/menuItemController.js";

const router = express.Router();

router.use(authMiddleware, allowRoles("admin", "superadmin"));

router.patch("/business/:businessId/items/:menuItemId", updateMenuItem);
router.delete("/business/:businessId/items/:menuItemId", deleteMenuItem);

export default router;

