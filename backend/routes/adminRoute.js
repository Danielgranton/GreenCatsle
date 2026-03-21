import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/allowRoles.js";
import {
  approveBusinessApplication,
  listBusinessApplications,
  rejectBusinessApplication,
} from "../controllers/adminApplicationController.js";

const router = express.Router();

router.get("/applications", authMiddleware, allowRoles("superadmin"), listBusinessApplications);
router.post(
  "/applications/:applicationId/approve",
  authMiddleware,
  allowRoles("superadmin"),
  approveBusinessApplication
);
router.post(
  "/applications/:applicationId/reject",
  authMiddleware,
  allowRoles("superadmin"),
  rejectBusinessApplication
);

export default router;

