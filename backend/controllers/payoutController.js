import PayoutRequest from "../models/payoutRequestModel.js";
import Wallet from "../models/walletModel.js";
import { getOrCreateBusinessWallet, getOrCreateSystemWallet, postWalletTransaction } from "../services/walletService.js";
import userModel from "../models/userModel.js";
import { createNotification } from "../services/notificationService.js";
import { executePayout } from "../services/payoutService.js";

const toNumber = (v) => {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
};

export const requestPayout = async (req, res) => {
  try {
    if (!req.user?.businessId) {
      return res.status(403).json({ success: false, message: "No business linked to this account" });
    }

    const amount = toNumber(req.body?.amount);
    const method = req.body?.method || "mpesa";
    const destination = req.body?.destination || {};

    if (amount == null || amount <= 0) {
      return res.status(400).json({ success: false, message: "amount must be positive" });
    }

    const wallet = await getOrCreateBusinessWallet({ businessId: req.user.businessId, currency: "KES" });
    if (wallet.availableBalance < amount) {
      return res.status(409).json({ success: false, message: "Insufficient wallet balance" });
    }

    const pr = await PayoutRequest.create({
      ownerType: "business",
      businessId: req.user.businessId,
      requestedByUserId: req.user.id,
      amount,
      currency: wallet.currency,
      method,
      destination,
      status: "pending",
    });

    // Notify all superadmins.
    const superadmins = await userModel.find({ role: "superadmin" }).select("_id");
    await Promise.all(
      superadmins.map((u) =>
        createNotification({
          recipientUserId: u._id,
          type: "payout_request",
          title: "New payout request",
          message: `Business ${req.user.businessId} requested payout of ${amount}`,
          data: { payoutRequestId: String(pr._id), businessId: String(req.user.businessId), amount },
        })
      )
    );

    res.status(201).json({ success: true, payoutRequest: pr });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to request payout" });
  }
};

export const requestSystemPayout = async (req, res) => {
  try {
    const amount = toNumber(req.body?.amount);
    const method = req.body?.method || "mpesa";
    const destination = req.body?.destination || {};

    if (amount == null || amount <= 0) {
      return res.status(400).json({ success: false, message: "amount must be positive" });
    }

    const systemWallet = await getOrCreateSystemWallet({ currency: "KES" });
    if (systemWallet.availableBalance < amount) {
      return res.status(409).json({ success: false, message: "Insufficient system wallet balance" });
    }

    const pr = await PayoutRequest.create({
      ownerType: "system",
      businessId: null,
      requestedByUserId: req.user.id,
      amount,
      currency: systemWallet.currency,
      method,
      destination,
      status: "pending",
    });

    res.status(201).json({ success: true, payoutRequest: pr });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to request system payout" });
  }
};

export const listMyPayouts = async (req, res) => {
  try {
    if (!req.user?.businessId) {
      return res.status(403).json({ success: false, message: "No business linked to this account" });
    }
    const payouts = await PayoutRequest.find({ ownerType: "business", businessId: req.user.businessId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, payouts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch payouts" });
  }
};

export const adminListPayouts = async (req, res) => {
  try {
    const { status } = req.query;
    const ownerType = req.query?.ownerType;
    const filter = {};
    if (status) filter.status = status;
    if (ownerType) filter.ownerType = ownerType;
    const payouts = await PayoutRequest.find(filter).sort({ createdAt: -1 }).limit(500);
    res.status(200).json({ success: true, payouts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to list payouts" });
  }
};

export const adminApprovePayout = async (req, res) => {
  try {
    const { payoutRequestId } = req.params;
    const pr = await PayoutRequest.findById(payoutRequestId);
    if (!pr) return res.status(404).json({ success: false, message: "Payout request not found" });
    if (pr.status !== "pending") return res.status(409).json({ success: false, message: "Not pending" });

    const wallet =
      pr.ownerType === "system"
        ? await Wallet.findOne({ ownerType: "system" })
        : await Wallet.findOne({ ownerType: "business", businessId: pr.businessId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: pr.ownerType === "system" ? "System wallet not found" : "Business wallet not found",
      });
    }
    if (wallet.availableBalance < pr.amount) {
      return res.status(409).json({ success: false, message: "Insufficient wallet balance" });
    }

    const externalRef = `payout:${pr._id}:debit`;
    await postWalletTransaction({
      walletId: wallet._id,
      direction: "debit",
      balance: "available",
      amount: pr.amount,
      currency: pr.currency,
      kind: pr.ownerType === "system" ? "system_withdrawal" : "payout",
      externalRef,
      businessId: pr.businessId,
      note:
        pr.ownerType === "system"
          ? "System withdrawal approved (funds debited from system wallet)"
          : "Payout approved (funds debited from business wallet)",
      meta: { method: pr.method, destination: pr.destination },
    });

    pr.status = "approved";
    pr.reviewedByUserId = req.user.id;
    pr.reviewedAt = new Date();
    pr.walletExternalRef = externalRef;
    pr.rejectionReason = "";
    await pr.save();

    // Notify requester (mainly useful for business payouts).
    await createNotification({
      recipientUserId: pr.requestedByUserId,
      type: "payout_request",
      title: "Payout approved",
      message: `Your payout request of ${pr.amount} was approved.`,
      data: { payoutRequestId: String(pr._id), amount: pr.amount, status: "approved" },
    });

    res.status(200).json({ success: true, payoutRequest: pr });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to approve payout" });
  }
};

export const adminRejectPayout = async (req, res) => {
  try {
    const { payoutRequestId } = req.params;
    const reason = typeof req.body?.reason === "string" ? req.body.reason : "";
    const pr = await PayoutRequest.findById(payoutRequestId);
    if (!pr) return res.status(404).json({ success: false, message: "Payout request not found" });
    if (pr.status !== "pending") return res.status(409).json({ success: false, message: "Not pending" });

    pr.status = "rejected";
    pr.reviewedByUserId = req.user.id;
    pr.reviewedAt = new Date();
    pr.rejectionReason = reason;
    await pr.save();

    await createNotification({
      recipientUserId: pr.requestedByUserId,
      type: "payout_request",
      title: "Payout rejected",
      message: reason ? `Reason: ${reason}` : "Your payout request was rejected.",
      data: { payoutRequestId: String(pr._id), amount: pr.amount, status: "rejected" },
    });

    res.status(200).json({ success: true, payoutRequest: pr });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to reject payout" });
  }
};

export const adminExecutePayout = async (req, res) => {
  try {
    const { payoutRequestId } = req.params;
    const pr = await PayoutRequest.findById(payoutRequestId);
    if (!pr) return res.status(404).json({ success: false, message: "Payout request not found" });

    if (pr.status === "paid") return res.status(200).json({ success: true, payoutRequest: pr });
    if (pr.status !== "approved" && pr.status !== "processing") {
      return res.status(409).json({ success: false, message: `Cannot execute payout in status '${pr.status}'` });
    }

    const wallet =
      pr.ownerType === "system"
        ? await Wallet.findOne({ ownerType: "system" })
        : await Wallet.findOne({ ownerType: "business", businessId: pr.businessId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: pr.ownerType === "system" ? "System wallet not found" : "Business wallet not found",
      });
    }

    // Ensure funds are debited (legacy behavior: debit on approve). If missing, debit now.
    if (!pr.walletExternalRef) {
      const externalRef = `payout:${pr._id}:debit`;
      await postWalletTransaction({
        walletId: wallet._id,
        direction: "debit",
        balance: "available",
        amount: pr.amount,
        currency: pr.currency,
        kind: pr.ownerType === "system" ? "system_withdrawal" : "payout",
        externalRef,
        businessId: pr.businessId,
        note: pr.ownerType === "system" ? "System withdrawal (debited)" : "Payout (debited)",
        meta: { method: pr.method, destination: pr.destination },
      });
      pr.walletExternalRef = externalRef;
      await pr.save();
    }

    const result = await executePayout({
      method: pr.method,
      amount: pr.amount,
      currency: pr.currency,
      destination: pr.destination,
      payoutRequestId: pr._id,
    });

    pr.providerRef = result.providerRef || pr.providerRef;
    pr.providerMeta = result.providerMeta || pr.providerMeta;
    pr.executedAt = new Date();
    pr.status = result.status === "paid" ? "paid" : "processing";
    await pr.save();

    await createNotification({
      recipientUserId: pr.requestedByUserId,
      type: "payout_request",
      title: pr.ownerType === "system" ? "System payout initiated" : "Payout initiated",
      message:
        pr.status === "paid"
          ? `Payout of ${pr.amount} completed.`
          : `Payout of ${pr.amount} is processing.`,
      data: { payoutRequestId: String(pr._id), amount: pr.amount, status: pr.status, providerRef: pr.providerRef },
    });

    res.status(200).json({ success: true, payoutRequest: pr });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error?.message || "Failed to execute payout" });
  }
};
