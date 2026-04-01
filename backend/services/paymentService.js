import Payment from "../models/paymentModel.js";
import { payWithMpesa } from "./mpesaService.js";
import { payWithPaypal } from "./paypalService.js";
import { payWithCard } from "./cardService.js";

export const makePayment = async ({ userId, orderId, amount, method, phone }) => {
  let paymentResult;

  // validate method
  const validMethods = ["mpesa", "paypal", "card", "cash"];
  if (!validMethods.includes(method)) {
    throw new Error("Invalid payment method");
  }

  // create a payment object (not saved yet)
  const payment = new Payment({
    userId,
    orderId,
    amount,
    method,
    phone,
    purpose: "order",
  });

  // call the right service
  if (method === "mpesa") paymentResult = await payWithMpesa(amount, phone);
  else if (method === "paypal") paymentResult = await payWithPaypal(amount);
  else if (method === "card") paymentResult = await payWithCard(amount);
  else if (method === "cash") paymentResult = { status: "pending", transactionId: "CASH_ON_DELIVERY" };

  payment.status = paymentResult.status;
  payment.transactionId = paymentResult.transactionId;

  await payment.save();

  return payment;
};