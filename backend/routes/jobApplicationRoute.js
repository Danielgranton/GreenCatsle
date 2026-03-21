import express from "express";
import multer from "multer";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/allowRoles.js";
import { applyForJob, listJobApplications } from "../controllers/jobApplicationController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("resume"), applyForJob);
router.get("/", authMiddleware, allowRoles("admin", "superadmin"), listJobApplications);

export default router;
