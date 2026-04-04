import Payment from "../models/paymentModel.js";
import Order from "../models/orderModel.js";

import { payWithMpesa } from "../services/mpesaService.js";
import { capturePaypalOrder, payWithPaypal } from "../services/paypalService.js";
import { payWithCard } from "../services/cardService.js";
import { creditSystemOnlyPaymentAtomic, settleOrderPaymentAtomic } from "../services/walletService.js";
import { activateAdvertAfterPayment } from "./advertController.js";
import Advert from "../models/advertModel.js";

// main payment handler
import { makePayment } from "../services/paymentService.js";

 const processPayment = async (req, res) => {
  try {
    const { orderId, method, phone } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const payment = await makePayment({ userId: req.user.id, orderId, amount: order.totalAmount, method, phone });

    if (payment.status === "failed") {
        return res.status(400).json({ success: false, message: "Payment initiation failed. Please check your details and try again." });
    }

    if (payment.status === "successful") {
      order.paymentStatus = "paid";
      await order.save();
    }

    res.status(200).json({ success: true, payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error processing payment" });
  }
};
const refundPayment = async (req , res) => {
    try {
        const { paymentId } = req.body;

        const payment = await Payment.findById(paymentId);

        if (!payment) {
            return res.status(404).json({
                succsess : false,
                message : "Payment not found"
            })
        }

        // Only superadmin or the user who initiated the payment can refund it.
        if (String(payment.userId) !== String(req.user.id) && req.user.role !== "superadmin") {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        payment.status = "refunded";

        await payment.save();

        res.status(200).json({
            success : true,
            message : "Payment refunded",
            payment

        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success : false,
            message : "Error refunding payment"
        })
    }
}

export { processPayment , refundPayment };

export const capturePaypalPayment = async (req, res) => {
  try {
    const { paymentId, paypalOrderId,  } = req.body;

    let payment = null;
    if (paymentId) payment = await Payment.findById(paymentId);
    else if (paypalOrderId) payment = await Payment.findOne({ transactionId: paypalOrderId });

    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
    if (payment.method !== "paypal") return res.status(400).json({ success: false, message: "Not a PayPal payment" });
    if (payment.status === "successful") return res.status(200).json({ success: true, payment });

    // Basic ownership check: only the user who initiated payment can capture it.
    if (String(payment.userId) !== String(req.user.id) && req.user.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const result = await capturePaypalOrder(payment.transactionId);
    if (result.status !== "COMPLETED") {
      return res.status(409).json({ success: false, message: `PayPal capture status: ${result.status}` });
    }

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
      if (!advert) return res.status(404).json({ success: false, message: "Advert not found for this payment" });
      // Best-effort amount validation.
      if (Number(payment.amount) !== Number(advert.priceAmount)) {
        return res.status(409).json({ success: false, message: "Payment amount does not match advert price" });
      }
      await creditSystemOnlyPaymentAtomic({
        amount: payment.amount,
        currency: advert.currency || "KES",
        kind: "ad_fee_in",
        payment,
        businessId: payment.businessId || null,
        note: "Advert fee payment (PayPal)",
      });
      await activateAdvertAfterPayment({ payment });
    }

    res.status(200).json({ success: true, payment, capture: { id: result.id, status: result.status } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to capture PayPal payment" });
  }
};
