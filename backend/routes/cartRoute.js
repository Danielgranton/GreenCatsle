import express, { Router } from "express";
import { addToCart,removeFromCart,getCart, clearCart } from "../controllers/cartController.js";
import authMiddleware from "../middleware/authMiddleware.js";


const cartRouter = express.Router();

cartRouter.post("/add", authMiddleware, addToCart);
cartRouter.post("/remove", authMiddleware, removeFromCart);
cartRouter.get("/get", authMiddleware, getCart);
cartRouter.post("/clear", authMiddleware, clearCart);


export default cartRouter;
