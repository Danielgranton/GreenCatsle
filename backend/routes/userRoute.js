import express from "express";
import {
  loginUser,
  registerUser,
  getUsers,
  deleteUser,
} from "../controllers/userController.js";

import authMiddleware from "../middleware/auth.js";
import adminOnly from "../middleware/adminOnly.js";

const userRouter = express.Router();

// Public routes
userRouter.post("/login", loginUser);
userRouter.post("/register", registerUser);

// Admin-only routes
userRouter.get("/users", authMiddleware, adminOnly, getUsers);
userRouter.delete("/delete/:id", authMiddleware, adminOnly, deleteUser);

export default userRouter;
