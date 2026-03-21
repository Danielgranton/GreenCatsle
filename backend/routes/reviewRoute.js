import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/allowRoles.js";
import { createReview, listBusinessReviews, listMyBusinessReviews } from "../controllers/reviewController.js";

const router = express.Router();

router.post("/", authMiddleware, createReview);
router.get("/business/:businessId", listBusinessReviews);
router.get("/my-business", authMiddleware, allowRoles("admin", "superadmin"), listMyBusinessReviews);

export default router;
