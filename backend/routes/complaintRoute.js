import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/allowRoles.js";
import {
  adminListAllComplaints,
  createComplaint,
  listBusinessComplaints,
  listMyComplaints,
  updateComplaintStatus,
} from "../controllers/complaintController.js";

const router = express.Router();

router.post("/", authMiddleware, createComplaint);
router.get("/my", authMiddleware, listMyComplaints);
router.get("/business", authMiddleware, allowRoles("admin", "superadmin"), listBusinessComplaints);
router.get("/all", authMiddleware, allowRoles("superadmin"), adminListAllComplaints);
router.put("/:complaintId", authMiddleware, updateComplaintStatus);

export default router;

