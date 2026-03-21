import express from "express";
import multer from "multer";
import authMiddleware from "../middleware/authMiddleware.js";
import { createJob, listJobs, uploadJobImage } from "../controllers/jobController.js";

const jobRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

jobRouter.get("/", listJobs);
jobRouter.post("/", authMiddleware, createJob);
jobRouter.put("/:jobId/image", authMiddleware, upload.single("image"), uploadJobImage);

export default jobRouter;

