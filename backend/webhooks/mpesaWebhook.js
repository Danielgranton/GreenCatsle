import Payment from "../models/paymentModel.js";
import Order from "../models/orderModel.js";
import { settleOrderPaymentAtomic } from "../services/walletService.js";
import WebhookEvent from "../models/webhookEventModel.js";
import { creditSystemOnlyPaymentAtomic } from "../services/walletService.js";
import { activateAdvertAfterPayment } from "../controllers/advertController.js";
import Advert from "../models/advertModel.js";
import { stkQuery } from "../services/mpesaService.js";

const amountsMatch = (a, b) => {
  const x = Number(a);
  const y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  return Math.abs(x - y) < 0.01;
};

export const mpesaWebhook = async (req , res) => {

    try {
        const hook = await WebhookEvent.create({
          provider: "mpesa",
          eventType: "stkCallback",
          externalId: req.body?.Body?.stkCallback?.CheckoutRequestID || "",
          status: "received",
        });

        const data = req.body;

        const callback = data?.Body?.stkCallback;
        const checkoutId = callback?.CheckoutRequestID;
        const resultCode = callback?.ResultCode;

        if (!checkoutId) {
          await WebhookEvent.findByIdAndUpdate(hook._id, {
            status: "failed",
            errorMessage: "Missing CheckoutRequestID",
          });
          return res.sendStatus(400);
        }

        const payment = await Payment.findOne({ transactionId: checkoutId });
        if (!payment) return res.sendStatus(404);

        if (resultCode === 0) {
            // Idempotency for webhook retries.
            if (payment.status === "successful") {
              await WebhookEvent.findByIdAndUpdate(hook._id, {
                status: "processed",
                meta: { paymentId: String(payment._id), idempotent: true },
              });
              return res.sendStatus(200);
            }

            payment.status = "successful";

            if (payment.purpose === "order") {
                if (!payment.orderId) {
                  await WebhookEvent.findByIdAndUpdate(hook._id, {
                    status: "failed",
                    errorMessage: "Order payment missing orderId",
                    meta: { paymentId: String(payment._id) },
                  });
                  payment.status = "failed";
                }
                const order = await Order.findById(payment.orderId);
                if (order) {
                    // Verify with Mpesa STK query (defense against spoofed callbacks).
                    try {
                      const q = await stkQuery(checkoutId);
                      if (Number(q?.ResultCode) !== 0) {
                        await WebhookEvent.findByIdAndUpdate(hook._id, {
                          status: "failed",
                          errorMessage: `STK query not successful: ${q?.ResultDesc || ""}`.trim(),
                          meta: { paymentId: String(payment._id), stkQuery: q },
                        });
                        payment.status = "failed";
                      }
                    } catch (e) {
                      await WebhookEvent.findByIdAndUpdate(hook._id, {
                        status: "failed",
                        errorMessage: `STK query failed: ${String(e?.message || e)}`,
                        meta: { paymentId: String(payment._id) },
                      });
                      payment.status = "failed";
                    }

                    if (!amountsMatch(payment.amount, order.totalAmount)) {
                      await WebhookEvent.findByIdAndUpdate(hook._id, {
                        status: "failed",
                        errorMessage: "Payment amount does not match order totalAmount",
                        meta: {
                          paymentId: String(payment._id),
                          orderId: String(order._id),
                          paymentAmount: payment.amount,
                          orderTotalAmount: order.totalAmount,
                        },
                      });
                      payment.status = "failed";
                    } else if (payment.status === "successful") {
                    order.paymentStatus = "paid";
                    await order.save();
                    await settleOrderPaymentAtomic({ order, payment });
                    }
                }
            } else if (payment.purpose === "ad_fee") {
                if (!payment.advertId) {
                  await WebhookEvent.findByIdAndUpdate(hook._id, {
                    status: "failed",
                    errorMessage: "Advert fee payment missing advertId",
                    meta: { paymentId: String(payment._id) },
                  });
                  payment.status = "failed";
                } else {
                const advert = await Advert.findById(payment.advertId);
                if (!advert) {
                  await WebhookEvent.findByIdAndUpdate(hook._id, {
                    status: "failed",
                    errorMessage: "Advert not found for advert fee payment",
                    meta: { paymentId: String(payment._id), advertId: String(payment.advertId) },
                  });
                  payment.status = "failed";
                } else if (!amountsMatch(payment.amount, advert.priceAmount)) {
                  await WebhookEvent.findByIdAndUpdate(hook._id, {
                    status: "failed",
                    errorMessage: "Payment amount does not match advert priceAmount",
                    meta: {
                      paymentId: String(payment._id),
                      advertId: String(advert._id),
                      paymentAmount: payment.amount,
                      advertPriceAmount: advert.priceAmount,
                    },
                  });
                  payment.status = "failed";
                } else {
                await creditSystemOnlyPaymentAtomic({
                    amount: payment.amount,
                    currency: "KES",
                    kind: "ad_fee_in",
                    payment,
                    businessId: payment.businessId || null,
                    note: "Advert fee payment",
                });
                await activateAdvertAfterPayment({ payment });
                }
                }
            } else {
                await WebhookEvent.findByIdAndUpdate(hook._id, {
                  status: "failed",
                  errorMessage: `Unknown payment purpose: ${payment.purpose}`,
                  meta: { paymentId: String(payment._id) },
                });
                payment.status = "failed";
            }
        } else {
            payment.status = "failed";
        }

        await payment.save();
        await WebhookEvent.findByIdAndUpdate(hook._id, {
          status: payment.status === "successful" ? "processed" : "failed",
          meta: { paymentId: String(payment._id) },
        });
        res.sendStatus(200);
    } catch (error) {
        console.error("Mpesa webhook error:", error);
        try {
          await WebhookEvent.create({
            provider: "mpesa",
            eventType: "stkCallback",
            status: "failed",
            errorMessage: String(error?.message || error),
          });
        } catch {}
        res.sendStatus(500);
    }
}
