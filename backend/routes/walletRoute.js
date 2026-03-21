import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/allowRoles.js";
import {
  getMyBusinessWallet,
  getSystemWallet,
  listWalletTransactions,
} from "../controllers/walletController.js";

const router = express.Router();

router.get("/system", authMiddleware, allowRoles("superadmin"), getSystemWallet);
router.get("/me", authMiddleware, getMyBusinessWallet);
router.get("/:walletId/transactions", authMiddleware, listWalletTransactions);

export default router;

