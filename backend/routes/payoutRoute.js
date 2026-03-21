import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/allowRoles.js";
import {
  adminApprovePayout,
  adminExecutePayout,
  adminListPayouts,
  adminRejectPayout,
  listMyPayouts,
  requestPayout,
  requestSystemPayout,
} from "../controllers/payoutController.js";

const router = express.Router();

router.post("/request", authMiddleware, requestPayout);
router.get("/my", authMiddleware, listMyPayouts);

router.get("/", authMiddleware, allowRoles("superadmin"), adminListPayouts);
router.post("/:payoutRequestId/approve", authMiddleware, allowRoles("superadmin"), adminApprovePayout);
router.post("/:payoutRequestId/reject", authMiddleware, allowRoles("superadmin"), adminRejectPayout);
router.post("/:payoutRequestId/execute", authMiddleware, allowRoles("superadmin"), adminExecutePayout);

// Superadmin system-wallet withdrawals.
router.post("/system/request", authMiddleware, allowRoles("superadmin"), requestSystemPayout);

export default router;
