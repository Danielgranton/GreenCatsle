import express from "express";
import multer from "multer";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/allowRoles.js";
import { updateBusinessSettings, uploadBusinessLogo } from "../controllers/businessSettingsController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware, allowRoles("admin", "superadmin"));

router.patch("/business/:businessId", updateBusinessSettings);
router.put("/business/:businessId/logo", upload.single("image"), uploadBusinessLogo);

export default router;

