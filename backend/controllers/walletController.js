import Wallet from "../models/walletModel.js";
import WalletTx from "../models/walletTransactionModel.js";
import { getOrCreateBusinessWallet, getOrCreateSystemWallet } from "../services/walletService.js";

const canAccessWallet = ({ user, wallet }) => {
  if (!user || !wallet) return false;
  if (wallet.ownerType === "system") return user.role === "superadmin";
  if (wallet.ownerType === "business") {
    return user.role === "superadmin" || String(user.businessId) === String(wallet.businessId);
  }
  return false;
};

export const getSystemWallet = async (req, res) => {
  try {
    const wallet = await getOrCreateSystemWallet({ currency: "KES" });
    res.status(200).json({ success: true, wallet });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch system wallet" });
  }
};

export const getMyBusinessWallet = async (req, res) => {
  try {
    if (!req.user?.businessId) {
      return res.status(404).json({ success: false, message: "No business linked to this account" });
    }

    const wallet = await getOrCreateBusinessWallet({ businessId: req.user.businessId, currency: "KES" });
    res.status(200).json({ success: true, wallet });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch business wallet" });
  }
};

export const listWalletTransactions = async (req, res) => {
  try {
    const { walletId } = req.params;
    const limitRaw = req.query?.limit;
    const limit = Math.min(200, Math.max(1, Number(limitRaw || 50)));

    const wallet = await Wallet.findById(walletId);
    if (!wallet) return res.status(404).json({ success: false, message: "Wallet not found" });
    if (!canAccessWallet({ user: req.user, wallet })) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const txs = await WalletTx.find({ walletId }).sort({ createdAt: -1 }).limit(limit);
    res.status(200).json({ success: true, transactions: txs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to list transactions" });
  }
};

