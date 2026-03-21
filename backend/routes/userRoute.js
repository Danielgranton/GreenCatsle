import express from "express";
import {
  loginUser,
  registerUser,
  getUsers,
  deleteUser,
  updateUser,
  getCurrentUser,
  changeMyPassword,
  logoutAllSessions,
  updateNotificationPrefs,
} from "../controllers/userController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/allowRoles.js";
import multer from "multer";
import { uploadAvatar } from "../controllers/profileController.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { validateBody } from "../middleware/validate.js";

const userRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public routes
userRouter.post("/login", rateLimit({ windowMs: 60_000, max: 10 }), loginUser);
userRouter.post(
  "/register",
  rateLimit({ windowMs: 60_000, max: 5 }),
  validateBody({
    name: { type: "nonEmptyString" },
    email: { type: "nonEmptyString" },
    password: { type: "nonEmptyString" },
  }),
  registerUser
);

// Admin-only routes
userRouter.get("/users", authMiddleware, allowRoles("admin", "superadmin"), getUsers);
userRouter.delete(
  "/delete/:id",
  authMiddleware,
  allowRoles("admin", "superadmin"),
  deleteUser
);

userRouter.put("/update/:id", authMiddleware,updateUser);
userRouter.put("/me", authMiddleware, updateUser);

userRouter.get("/me", authMiddleware, getCurrentUser);
userRouter.put("/me/avatar", authMiddleware, upload.single("image"), uploadAvatar);
userRouter.post("/me/change-password", authMiddleware, changeMyPassword);
userRouter.post("/me/logout-all", authMiddleware, logoutAllSessions);
userRouter.patch("/me/notification-prefs", authMiddleware, updateNotificationPrefs);

export default userRouter;
