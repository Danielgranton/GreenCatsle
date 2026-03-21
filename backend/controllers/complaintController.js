import Complaint from "../models/complaintModel.js";
import Order from "../models/orderModel.js";
import Business from "../models/businessModel.js";
import { createNotification } from "../services/notificationService.js";

export const createComplaint = async (req, res) => {
  try {
    const { orderId, type, message } = req.body;
    if (!orderId || !message) {
      return res.status(400).json({ success: false, message: "orderId and message are required" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (String(order.userId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const complaint = await Complaint.create({
      businessId: order.businessId,
      orderId,
      userId: req.user.id,
      type: type || "other",
      message,
      status: "open",
    });

    const business = await Business.findById(order.businessId).select("ownerId");
    if (business?.ownerId) {
      await createNotification({
        recipientUserId: business.ownerId,
        type: "complaint",
        title: "New complaint",
        message: `New complaint for order ${orderId}`,
        data: { complaintId: String(complaint._id), orderId: String(orderId) },
      });
    }

    res.status(201).json({ success: true, complaint });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create complaint" });
  }
};

export const listMyComplaints = async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query?.limit || 30)));
    const complaints = await Complaint.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit);
    res.status(200).json({ success: true, complaints });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch complaints" });
  }
};

export const listBusinessComplaints = async (req, res) => {
  try {
    if (!req.user?.businessId) {
      return res.status(404).json({ success: false, message: "No business linked to this account" });
    }
    const limit = Math.min(200, Math.max(1, Number(req.query?.limit || 50)));
    const status = req.query?.status;
    const filter = { businessId: req.user.businessId };
    if (status) filter.status = status;
    const complaints = await Complaint.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.status(200).json({ success: true, complaints });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch business complaints" });
  }
};

export const adminListAllComplaints = async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query?.limit || 100)));
    const status = req.query?.status;
    const filter = {};
    if (status) filter.status = status;
    const complaints = await Complaint.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.status(200).json({ success: true, complaints });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch complaints" });
  }
};

export const updateComplaintStatus = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { status, resolution } = req.body;

    if (!status) return res.status(400).json({ success: false, message: "status is required" });

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found" });

    // superadmin can update any; business owner/admin can update their business only
    const isSuper = req.user?.role === "superadmin";
    const isOwner = req.user?.businessId && String(req.user.businessId) === String(complaint.businessId);
    if (!isSuper && !isOwner) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    complaint.status = status;
    if (typeof resolution === "string") complaint.resolution = resolution;
    complaint.handledByUserId = req.user.id;
    complaint.handledAt = new Date();
    await complaint.save();

    await createNotification({
      recipientUserId: complaint.userId,
      type: "complaint",
      title: "Complaint updated",
      message: `Complaint status updated to ${status}`,
      data: { complaintId: String(complaint._id), status },
    });

    res.status(200).json({ success: true, complaint });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update complaint" });
  }
};

