import WebhookEvent from "../models/webhookEventModel.js";
import PayoutRequest from "../models/payoutRequestModel.js";
import Wallet from "../models/walletModel.js";
import { postWalletTransaction } from "../services/walletService.js";

const parseMpesaResult = (body) => {
  const result = body?.Result || body?.result || null;
  if (!result) return null;
  const originatorConversationId =
    result.OriginatorConversationID || result.originatorConversationId || result.ConversationID || "";
  const resultCode = Number(result.ResultCode ?? result.resultCode);
  const resultDesc = result.ResultDesc ?? result.resultDesc ?? "";
  const transactionId = result.TransactionID ?? result.transactionId ?? "";
  return { originatorConversationId, resultCode, resultDesc, transactionId, raw: result };
};

export const mpesaB2CWebhook = async (req, res) => {
  try {
    const parsed = parseMpesaResult(req.body);
    const hook = await WebhookEvent.create({
      provider: "mpesa",
      eventType: "b2cResult",
      externalId: parsed?.originatorConversationId || "",
      status: "received",
    });

    if (!parsed?.originatorConversationId) {
      await WebhookEvent.findByIdAndUpdate(hook._id, { status: "failed", errorMessage: "Missing conversation id" });
      return res.sendStatus(400);
    }

    const pr = await PayoutRequest.findOne({ providerRef: parsed.originatorConversationId });
    if (!pr) {
      await WebhookEvent.findByIdAndUpdate(hook._id, {
        status: "failed",
        errorMessage: "PayoutRequest not found for providerRef",
        meta: { parsed },
      });
      return res.sendStatus(404);
    }

    const ok = parsed.resultCode === 0;
    pr.status = ok ? "paid" : "failed";
    pr.providerMeta = { ...(pr.providerMeta || {}), b2cResult: parsed.raw, transactionId: parsed.transactionId };
    pr.executedAt = pr.executedAt || new Date();
    await pr.save();

    if (!ok && pr.walletExternalRef) {
      const wallet =
        pr.ownerType === "system"
          ? await Wallet.findOne({ ownerType: "system" })
          : await Wallet.findOne({ ownerType: "business", businessId: pr.businessId });
      if (wallet) {
        await postWalletTransaction({
          walletId: wallet._id,
          direction: "credit",
          balance: "available",
          amount: pr.amount,
          currency: pr.currency,
          kind: pr.ownerType === "system" ? "system_withdrawal_reversal" : "payout_reversal",
          externalRef: `${pr.walletExternalRef}:reversal`,
          businessId: pr.businessId,
          note: `Payout reversed after provider failure: ${String(parsed.resultDesc || "")}`.trim(),
          meta: { provider: "mpesa", providerRef: pr.providerRef, resultCode: parsed.resultCode },
        });
      }
    }

    await WebhookEvent.findByIdAndUpdate(hook._id, { status: "processed", meta: { payoutRequestId: String(pr._id) } });
    return res.sendStatus(200);
  } catch (error) {
    console.error("Mpesa B2C webhook error:", error);
    try {
      await WebhookEvent.create({
        provider: "mpesa",
        eventType: "b2cResult",
        status: "failed",
        errorMessage: String(error?.message || error),
      });
    } catch {}
    return res.sendStatus(500);
  }
};

