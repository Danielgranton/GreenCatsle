import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/allowRoles.js";
import { getMyBusinessStats, getPlatformStats } from "../controllers/statsLedgerController.js";

const router = express.Router();

router.get("/platform", authMiddleware, allowRoles("superadmin"), getPlatformStats);
router.get("/my-business", authMiddleware, allowRoles("admin", "superadmin"), getMyBusinessStats);

export default router;
