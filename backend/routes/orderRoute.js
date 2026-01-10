import express from "express";
import { getOrders, placeOrder, mpesaCallback, getOrderStats, deleteOrder } from "../controllers/orderController.js";
import authMiddleware from "../middleware/auth.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const orderRouter = express.Router();

// Admin routes
orderRouter.get("/get", verifyAdmin, getOrders);
orderRouter.get("/stats", verifyAdmin, getOrderStats);
orderRouter.delete("/:id", verifyAdmin,deleteOrder);

// User routes
orderRouter.post("/place", authMiddleware, placeOrder);

// Payment callback (public)
orderRouter.post("/callback", mpesaCallback);

export default orderRouter;
