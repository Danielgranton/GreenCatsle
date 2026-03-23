import express from "express";
import multer from "multer";
import { applyForDriver } from "../controllers/driverApplicationController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("license"), applyForDriver);

export default router;
