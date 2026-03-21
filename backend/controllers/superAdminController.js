import mongoose from "mongoose";
import Business from "../models/businessModel.js";
import Order from "../models/orderModel.js";
import Payment from "../models/paymentModel.js";
import Advert from "../models/advertModel.js";
import Review from "../models/reviewModel.js";
import WebhookEvent from "../models/webhookEventModel.js";
import userModel from "../models/userModel.js";
import Complaint from "../models/complaintModel.js";

const toInt = (value, fallback) => {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

const toBool = (value) => value === true || value === "true";

const isObjectIdLike = (value) =>
  typeof value === "string" && mongoose.Types.ObjectId.isValid(value);

export const adminListOrders = async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, toInt(req.query?.limit, 50)));
    const status = req.query?.status;
    const businessId = req.query?.businessId;
    const userId = req.query?.userId;
    const q = String(req.query?.q || "").trim();

    const filter = {};
    if (status) filter.status = status;
    if (businessId && isObjectIdLike(businessId)) filter.businessId = businessId;
    if (userId && isObjectIdLike(userId)) filter.userId = userId;
    if (q && isObjectIdLike(q)) filter._id = q;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "name email phone")
      .populate("businessId", "name category address");

    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to list orders" });
  }
};

export const adminGetOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId)
      .populate("userId", "name email phone")
      .populate("businessId", "name category address ownerId");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch order" });
  }
};

export const adminListPayments = async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, toInt(req.query?.limit, 50)));
    const status = req.query?.status;
    const method = req.query?.method;
    const purpose = req.query?.purpose;
    const q = String(req.query?.q || "").trim();
    const includeRefs = toBool(req.query?.includeRefs);

    const filter = {};
    if (status) filter.status = status;
    if (method) filter.method = method;
    if (purpose) filter.purpose = purpose;
    if (q && isObjectIdLike(q)) filter._id = q;

    let query = Payment.find(filter).sort({ createdAt: -1 }).limit(limit);
    if (includeRefs) {
      query = query
        .populate("userId", "name email")
        .populate("businessId", "name category")
        .populate("orderId", "status totalAmount createdAt")
        .populate("advertId", "status title");
    }
    const payments = await query;

    res.status(200).json({ success: true, payments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to list payments" });
  }
};

export const adminListAdverts = async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, toInt(req.query?.limit, 50)));
    const status = req.query?.status;
    const businessId = req.query?.businessId;
    const filter = {};
    if (status) filter.status = status;
    if (businessId && isObjectIdLike(businessId)) filter.businessId = businessId;

    const adverts = await Advert.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("businessId", "name category")
      .populate("createdByUserId", "name email")
      .populate("paymentId", "status method amount createdAt");

    res.status(200).json({ success: true, adverts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to list adverts" });
  }
};

export const adminSetAdvertStatus = async (req, res) => {
  try {
    const { advertId } = req.params;
    const { status } = req.body;
    const allowed = ["pending_payment", "active", "rejected", "archived"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const advert = await Advert.findById(advertId);
    if (!advert) return res.status(404).json({ success: false, message: "Advert not found" });
    advert.status = status;
    await advert.save();
    res.status(200).json({ success: true, advert });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update advert" });
  }
};

export const adminListBusinesses = async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, toInt(req.query?.limit, 50)));
    const status = req.query?.status;
    const category = req.query?.category;
    const q = String(req.query?.q || "").trim();

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (q) filter.$text = { $search: q };

    const businesses = await Business.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("ownerId", "name email role status");

    res.status(200).json({ success: true, businesses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to list businesses" });
  }
};

export const adminListBusinessesManagement = async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, toInt(req.query?.limit, 100)));
    const status = req.query?.status;
    const category = req.query?.category;
    const q = String(req.query?.q || "").trim();

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (q) filter.$text = { $search: q };

    const businessesDocs = await Business.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("ownerId", "name email phone role status");

    const businesses = businessesDocs.map((b) => (typeof b.toObject === "function" ? b.toObject() : b));
    const businessIds = businesses.map((b) => b?._id).filter(Boolean);
    if (businessIds.length === 0) return res.status(200).json({ success: true, businesses: [] });

    const reviewAgg = await Review.aggregate([
      { $match: { businessId: { $in: businessIds } } },
      { $group: { _id: "$businessId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      { $project: { _id: 0, businessId: "$_id", avg: 1, count: 1 } },
    ]);
    const reviewsMap = new Map(
      reviewAgg.map((r) => [String(r.businessId), { averageRating: r.avg ?? 0, ratingCount: r.count ?? 0 }])
    );

    const complaintsAgg = await Complaint.aggregate([
      { $match: { businessId: { $in: businessIds } } },
      { $group: { _id: { businessId: "$businessId", status: "$status" }, count: { $sum: 1 } } },
      { $project: { _id: 0, businessId: "$_id.businessId", status: "$_id.status", count: 1 } },
    ]);
    const complaintsMap = new Map();
    for (const row of complaintsAgg) {
      const key = String(row.businessId);
      const prev = complaintsMap.get(key) || { open: 0, in_progress: 0, resolved: 0, rejected: 0, total: 0 };
      prev[row.status] = row.count;
      prev.total += row.count;
      complaintsMap.set(key, prev);
    }

    const advertsAgg = await Advert.aggregate([
      { $match: { businessId: { $in: businessIds } } },
      { $group: { _id: { businessId: "$businessId", status: "$status" }, count: { $sum: 1 } } },
      { $project: { _id: 0, businessId: "$_id.businessId", status: "$_id.status", count: 1 } },
    ]);
    const advertsMap = new Map();
    for (const row of advertsAgg) {
      const key = String(row.businessId);
      const prev =
        advertsMap.get(key) || { pending_payment: 0, active: 0, rejected: 0, archived: 0, total: 0 };
      prev[row.status] = row.count;
      prev.total += row.count;
      advertsMap.set(key, prev);
    }

    const ordersAgg = await Order.aggregate([
      { $match: { businessId: { $in: businessIds } } },
      { $group: { _id: "$businessId", count: { $sum: 1 }, lastOrderAt: { $max: "$createdAt" } } },
      { $project: { _id: 0, businessId: "$_id", count: 1, lastOrderAt: 1 } },
    ]);
    const ordersMap = new Map(ordersAgg.map((o) => [String(o.businessId), { orderCount: o.count ?? 0, lastOrderAt: o.lastOrderAt ?? null }]));

    const enriched = businesses.map((b) => {
      const id = String(b._id);
      const reviews = reviewsMap.get(id) || { averageRating: 0, ratingCount: 0 };
      const complaints = complaintsMap.get(id) || { open: 0, in_progress: 0, resolved: 0, rejected: 0, total: 0 };
      const adverts = advertsMap.get(id) || { pending_payment: 0, active: 0, rejected: 0, archived: 0, total: 0 };
      const orders = ordersMap.get(id) || { orderCount: 0, lastOrderAt: null };
      return { ...b, metrics: { reviews, complaints, adverts, orders } };
    });

    res.status(200).json({ success: true, businesses: enriched });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to build business management list" });
  }
};

export const adminSetBusinessStatus = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { status } = req.body;
    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ success: false, message: "Business not found" });
    business.status = status;
    await business.save();
    res.status(200).json({ success: true, business });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update business" });
  }
};

export const adminListReviews = async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, toInt(req.query?.limit, 50)));
    const businessId = req.query?.businessId;
    const rating = req.query?.rating;
    const filter = {};
    if (businessId && isObjectIdLike(businessId)) filter.businessId = businessId;
    if (rating != null && rating !== "" && Number.isFinite(Number(rating))) filter.rating = Number(rating);

    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("businessId", "name category")
      .populate("userId", "name email");

    res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to list reviews" });
  }
};

export const adminListWebhookEvents = async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, toInt(req.query?.limit, 50)));
    const provider = req.query?.provider;
    const status = req.query?.status;
    const filter = {};
    if (provider) filter.provider = provider;
    if (status) filter.status = status;

    const events = await WebhookEvent.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.status(200).json({ success: true, events });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to list webhook events" });
  }
};

export const adminSetUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const allowed = ["superadmin", "admin", "worker", "user"];
    if (!allowed.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }
    if (String(req.user?._id) === String(userId) && role !== "superadmin") {
      return res.status(409).json({ success: false, message: "Cannot demote yourself" });
    }

    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.role = role;
    await user.save();
    res.status(200).json({ success: true, user: { id: user._id, role: user.role, status: user.status } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update role" });
  }
};

export const adminSetUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    const allowed = ["active", "inactive", "busy", "available"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    if (String(req.user?._id) === String(userId) && status !== "active") {
      return res.status(409).json({ success: false, message: "Cannot deactivate yourself" });
    }

    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.status = status;
    await user.save();
    res.status(200).json({ success: true, user: { id: user._id, role: user.role, status: user.status } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update status" });
  }
};
