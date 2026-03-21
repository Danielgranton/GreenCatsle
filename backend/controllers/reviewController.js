import Review from "../models/reviewModel.js";
import Order from "../models/orderModel.js";

const toNumber = (v) => {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
};

export const createReview = async (req, res) => {
  try {
    const { orderId, rating, comment } = req.body;
    const r = toNumber(rating);
    if (!orderId || r == null) {
      return res.status(400).json({ success: false, message: "orderId and rating are required" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (String(order.userId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    if (order.status !== "completed") {
      return res.status(409).json({ success: false, message: "Order not completed" });
    }

    const existing = await Review.findOne({ orderId });
    if (existing) return res.status(409).json({ success: false, message: "Review already exists" });

    const review = await Review.create({
      businessId: order.businessId,
      orderId,
      userId: req.user.id,
      rating: r,
      comment: typeof comment === "string" ? comment : "",
    });

    res.status(201).json({ success: true, review });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create review" });
  }
};

export const listBusinessReviews = async (req, res) => {
  try {
    const { businessId } = req.params;
    const limit = Math.min(100, Math.max(1, Number(req.query?.limit || 20)));
    const reviews = await Review.find({ businessId }).sort({ createdAt: -1 }).limit(limit);
    res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
};

export const listMyBusinessReviews = async (req, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(404).json({ success: false, message: "No business linked to this account" });
    }

    const limit = Math.min(200, Math.max(1, Number(req.query?.limit || 50)));
    const ratingRaw = req.query?.rating;
    const rating = ratingRaw != null && ratingRaw !== "" ? Number(ratingRaw) : null;

    const filter = { businessId };
    if (Number.isFinite(rating)) filter.rating = rating;

    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "name email")
      .populate("orderId", "status totalAmount createdAt");

    res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
};
