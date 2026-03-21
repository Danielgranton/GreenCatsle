import Stripe from "stripe";
import Payment from "../models/paymentModel.js";
import Order from "../models/orderModel.js";
import { settleOrderPaymentAtomic } from "../services/walletService.js";
import WebhookEvent from "../models/webhookEventModel.js";
import { creditSystemOnlyPaymentAtomic } from "../services/walletService.js";
import { activateAdvertAfterPayment } from "./advertController.js";
import Advert from "../models/advertModel.js";

const stripeSecret =
  process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRETE_KEY;
const stripe = new Stripe(stripeSecret);

export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).json({
      success: false,
      message: "STRIPE_WEBHOOK_SECRET is not set",
    });
  }

  if (!sig) return res.sendStatus(400);

  let event;
  try {
    // rawBody is set by express.json verify hook in server.js
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verify failed:", err?.message || err);
    try {
      await WebhookEvent.create({
        provider: "stripe",
        eventType: "signature_verify",
        status: "failed",
        errorMessage: String(err?.message || err),
      });
    } catch {}
    return res.sendStatus(400);
  }

  try {
    const hook = await WebhookEvent.create({
      provider: "stripe",
      eventType: event.type,
      externalId: event.id,
      status: "received",
    });

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object;
      const payment = await Payment.findOne({ transactionId: pi.id });
      if (payment && payment.status !== "successful") {
        payment.status = "successful";
        await payment.save();

        if (payment.purpose === "order") {
          const order = await Order.findById(payment.orderId);
          if (order) {
            order.paymentStatus = "paid";
            await order.save();
            await settleOrderPaymentAtomic({ order, payment });
          }
        } else if (payment.purpose === "ad_fee") {
          const advert = payment.advertId ? await Advert.findById(payment.advertId) : null;
          if (!advert) throw new Error("Advert not found for ad_fee payment");
          await creditSystemOnlyPaymentAtomic({
            amount: payment.amount,
            currency: "KES",
            kind: "ad_fee_in",
            payment,
            businessId: payment.businessId || null,
            note: "Advert fee payment",
          });
          await activateAdvertAfterPayment({ payment });
        } else {
          throw new Error(`Unknown payment purpose: ${payment.purpose}`);
        }
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object;
      const payment = await Payment.findOne({ transactionId: pi.id });
      if (payment && payment.status !== "failed") {
        payment.status = "failed";
        await payment.save();
      }
    }

    await WebhookEvent.findByIdAndUpdate(hook._id, { status: "processed" });
    res.sendStatus(200);
  } catch (error) {
    console.error("Stripe webhook handler error:", error);
    try {
      await WebhookEvent.create({
        provider: "stripe",
        eventType: event?.type || "",
        externalId: event?.id || "",
        status: "failed",
        errorMessage: String(error?.message || error),
      });
    } catch {}
    res.sendStatus(500);
  }
};
