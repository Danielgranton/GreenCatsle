import express from "express";
import { placeOrder, updateOrderStatus, getUserOrders, getBusinessOrders } from "../controllers/orderController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { validateBody } from "../middleware/validate.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  validateBody({
    businessId: { type: "objectIdLike" },
    deliveryAddress: { type: "nonEmptyString" },
    totalAmount: { type: "number" },
  }),
  placeOrder
);
router.patch("/:orderId", authMiddleware, updateOrderStatus);
router.get("/user", authMiddleware, getUserOrders);
router.get("/business/:businessId", authMiddleware, getBusinessOrders);

export default router;
