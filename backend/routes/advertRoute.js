import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { validateBody } from "../middleware/validate.js";
import {
  advertUpload,
  createAdvert,
  getAdsFeed,
  listMyBusinessAdverts,
  payAdvertFee,
} from "../controllers/advertController.js";

const router = express.Router();

// Public ads feed for clients (returns signed URLs).
router.get("/feed", getAdsFeed);

// Business owner endpoints.
router.get("/business/:businessId", authMiddleware, listMyBusinessAdverts);
router.post("/business/:businessId", authMiddleware, advertUpload, createAdvert);
router.post(
  "/business/:businessId/:advertId/pay",
  authMiddleware,
  validateBody({
    method: { type: "nonEmptyString" },
    phone: { type: "string", optional: true },
  }),
  payAdvertFee
);

export default router;
