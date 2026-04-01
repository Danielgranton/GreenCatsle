import mongoose from "mongoose";
import Wallet from "../models/walletModel.js";
import WalletTx from "../models/walletTransactionModel.js";
import Business from "../models/businessModel.js";
import { isBusinessInFreeTrial } from "./trialService.js";

const toNumber = (value) => {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
};

const getCommissionRate = () => {
  // Backward compatible: PLATFORM_FEE_RATE -> COMMISSION_RATE.
  const rate =
    toNumber(process.env.COMMISSION_RATE) ??
    toNumber(process.env.PLATFORM_FEE_RATE) ??
    0.05; // default 5%
  return Math.max(0, rate);
};

const getEffectiveCommissionRate = ({ business, platformFeeRate = null }) => {
  if (platformFeeRate != null) return Math.max(0, Number(platformFeeRate));
  if (isBusinessInFreeTrial(business)) return 0;
  return getCommissionRate();
};

export const getOrCreateSystemWallet = async ({ currency = "KES", session } = {}) => {
  const existing = await Wallet.findOne({ ownerType: "system" }).session(session || null);
  if (existing) return existing;
  const created = await Wallet.create([{ ownerType: "system", currency }], { session });
  return created[0];
};

export const getOrCreateBusinessWallet = async ({ businessId, currency = "KES", session } = {}) => {
  const existing = await Wallet.findOne({ ownerType: "business", businessId }).session(session || null);
  if (existing) return existing;
  const created = await Wallet.create(
    [{ ownerType: "business", businessId, currency }],
    { session }
  );
  return created[0];
};

export const postWalletTransaction = async ({
  walletId,
  direction,
  balance = "available",
  amount,
  currency = "KES",
  kind = "generic",
  externalRef = "",
  orderId = null,
  paymentId = null,
  businessId = null,
  note = "",
  meta = {},
  session,
}) => {
  const amt = toNumber(amount);
  if (amt == null || amt <= 0) {
    const err = new Error("amount must be a positive number");
    err.code = "INVALID_AMOUNT";
    throw err;
  }

  // Idempotency: if externalRef is provided and already exists, return it.
  if (externalRef) {
    const existing = await WalletTx.findOne({ externalRef }).session(session || null);
    if (existing) return existing;
  }

  const tx = await WalletTx.create(
    [
      {
        walletId,
        direction,
        balance,
        amount: amt,
        currency,
        kind,
        externalRef,
        orderId,
        paymentId,
        businessId,
        note,
        meta,
      },
    ],
    { session }
  );

  const inc = direction === "credit" ? amt : -amt;
  await Wallet.updateOne(
    { _id: walletId },
    {
      $inc:
        balance === "pending"
          ? { pendingBalance: inc }
          : { availableBalance: inc },
    },
    { session }
  );

  return tx[0];
};

export const escrowOrderPayment = async ({
  order,
  payment,
  platformFeeRate = null,
  session,
}) => {
  const total = toNumber(order?.totalAmount);
  if (total == null || total <= 0) {
    const err = new Error("order.totalAmount is invalid");
    err.code = "INVALID_ORDER_TOTAL";
    throw err;
  }

  const businessId = order.businessId;
  const business = await Business.findById(businessId).session(session || null);
  if (!business) {
    const err = new Error("Business not found for order");
    err.code = "BUSINESS_NOT_FOUND";
    throw err;
  }

  const feeRate = getEffectiveCommissionRate({ business, platformFeeRate });

  const fee = Math.max(0, Math.round(total * feeRate * 100) / 100);
  const businessNet = Math.max(0, Math.round((total - fee) * 100) / 100);

  const currency = payment?.currency || order?.currency || "KES";

  const systemWallet = await getOrCreateSystemWallet({ currency, session });
  const businessWallet = await getOrCreateBusinessWallet({ businessId, currency, session });

  // Idempotency is keyed off paymentId.
  const paymentId = payment?._id || null;
  const orderId = order?._id || null;

  await postWalletTransaction({
    walletId: businessWallet._id,
    direction: "credit",
    balance: "pending",
    amount: businessNet,
    currency,
    kind: "payment_escrow",
    externalRef: paymentId ? `payment:${paymentId}:business_net_pending` : "",
    orderId,
    paymentId,
    businessId,
    note: "Order payment held in escrow (pending)",
    session,
  });

  if (fee > 0) {
    await postWalletTransaction({
      walletId: systemWallet._id,
      direction: "credit",
      balance: "pending",
      amount: fee,
      currency,
      kind: "platform_fee_escrow",
      externalRef: paymentId ? `payment:${paymentId}:platform_fee_pending` : "",
      orderId,
      paymentId,
      businessId,
      note: "Platform fee held in escrow (pending)",
      session,
    });
  }

  return { fee, businessNet, currency };
};

export const escrowOrderPaymentAtomic = async ({ order, payment }) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await escrowOrderPayment({ order, payment, session });
    });
    return result;
  } finally {
    session.endSession();
  }
};

// New primary flow: system collects gross, keeps commission, pays out net to business wallet.
export const settleOrderPaymentAtomic = async ({ order, payment }) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const businessId = order.businessId;
      const business = await Business.findById(businessId).session(session);
      if (!business) throw new Error("Business not found for order");

      const total = toNumber(order?.totalAmount);
      if (total == null || total <= 0) throw new Error("order.totalAmount is invalid");

      const feeRate = getEffectiveCommissionRate({ business });
      const fee = Math.max(0, Math.round(total * feeRate * 100) / 100);
      const businessNet = Math.max(0, Math.round((total - fee) * 100) / 100);

      const currency = payment?.currency || order?.currency || "KES";

      const systemWallet = await getOrCreateSystemWallet({ currency, session });
      const businessWallet = await getOrCreateBusinessWallet({ businessId, currency, session });

      const paymentId = payment?._id || null;
      const orderId = order?._id || null;

      // 1) Collect gross into system wallet.
      await postWalletTransaction({
        walletId: systemWallet._id,
        direction: "credit",
        balance: "available",
        amount: total,
        currency,
        kind: "payment_gross_in",
        externalRef: paymentId ? `payment:${paymentId}:gross_in` : "",
        orderId,
        paymentId,
        businessId,
        note: "Collect gross payment into system wallet",
        session,
        meta: {
          method: payment?.method || "unknown",
        },
      });

      // 2) Payout business net from system -> business wallet.
      if (businessNet > 0) {
        await postWalletTransaction({
          walletId: systemWallet._id,
          direction: "debit",
          balance: "available",
          amount: businessNet,
          currency,
          kind: "business_payout",
          externalRef: paymentId ? `payment:${paymentId}:payout_out` : "",
          orderId,
          paymentId,
          businessId,
          note: "Payout business net amount",
          session,
          meta: { fee, method: payment?.method || "unknown" },
        });

        await postWalletTransaction({
          walletId: businessWallet._id,
          direction: "credit",
          balance: "available",
          amount: businessNet,
          currency,
          kind: "business_payout_in",
          externalRef: paymentId ? `payment:${paymentId}:payout_in` : "",
          orderId,
          paymentId,
          businessId,
          note: "Receive business net amount",
          session,
          meta: { fee, method: payment?.method || "unknown" },
        });
      }

      // System effectively retains `fee` (gross in - payout out).
      result = { fee, businessNet, currency };
    });
    return result;
  } finally {
    session.endSession();
  }
};

export const creditSystemOnlyPaymentAtomic = async ({
  amount,
  currency = "KES",
  kind = "system_income",
  payment,
  businessId = null,
  note = "",
}) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const total = toNumber(amount);
      if (total == null || total <= 0) throw new Error("amount must be positive");
      const systemWallet = await getOrCreateSystemWallet({ currency, session });
      const paymentId = payment?._id || null;

      await postWalletTransaction({
        walletId: systemWallet._id,
        direction: "credit",
        balance: "available",
        amount: total,
        currency,
        kind,
        externalRef: paymentId ? `payment:${paymentId}:${kind}` : "",
        paymentId,
        businessId,
        note: note || `System income: ${kind}`,
        session,
        meta: { method: payment?.method || "unknown" },
      });

      result = { total, currency };
    });
    return result;
  } finally {
    session.endSession();
  }
};
