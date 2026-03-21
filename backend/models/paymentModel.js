import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  // Order payment: orderId is set when purpose === "order".
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: false,
    default: null
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  method: {
    type: String,
    enum: ["mpesa", "paypal", "card", "cash"],
    required: true
  },

  purpose: {
    type: String,
    enum: ["order", "ad_fee"],
    default: "order"
  },

  advertId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "advert",
    default: null
  },

  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "business",
    default: null
  },

  status: {
    type: String,
    enum: ["pending", "successful", "failed", "refunded"],
    default: "pending"
  },

  transactionId: {
    type: String
  },

  phone: String,

  createdAt: {
    type: Date,
    default: Date.now
  }

});

const Payment =
  mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

export default Payment;
