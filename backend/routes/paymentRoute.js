import express from "express";
import {capturePaypalPayment, processPayment , refundPayment } from "../controllers/paymentController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { validateBody } from "../middleware/validate.js";

const router = express.Router();

router.post(
  "/payment",
  authMiddleware,
  validateBody({
    orderId: { type: "objectIdLike" },
    method: { type: "nonEmptyString" },
    phone: { type: "string", optional: true },
  }),
  processPayment
);
router.post("/refund", authMiddleware, refundPayment);
router.post(
  "/paypal/capture",
  authMiddleware,
  validateBody({
    paymentId: { type: "objectIdLike", optional: true },
    paypalOrderId: { type: "nonEmptyString", optional: true },
  }),
  capturePaypalPayment
);

export default router;
