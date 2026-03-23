import DriverApplication from "../models/driverApplicationModel.js";
import { makeObjectKey, putObject } from "../services/storageService.js";
import User from "../models/userModel.js";
import { createNotification } from "../services/notificationService.js";

export const applyForDriver = async (req, res) => {
  try {
    const { name, email, phone, vehicleType, vehiclePlate } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "Driver license file is required" });
    }
    const existing = await DriverApplication.findOne({ applicantEmail: email.toLowerCase().trim() });
    if (existing && existing.status === "pending") {
      return res.status(409).json({
        success: false,
        message: "You already have a pending driver application",
      });
    }

    const key = makeObjectKey({ folder: "driver-applications", originalName: req.file.originalname });
    const stored = await putObject({
      buffer: req.file.buffer,
      contentType: req.file.mimetype,
      key,
    });

    const application = await DriverApplication.create({
      applicantName: name.trim(),
      applicantEmail: email.trim().toLowerCase(),
      applicantPhone: phone?.trim() || "",
      vehicleType: vehicleType?.trim() || "",
      vehiclePlate: vehiclePlate?.trim() || "",
      license: {
        key: stored.key,
        provider: stored.provider,
        originalName: req.file.originalname,
      },
      status: "pending",
    });

    res.status(201).json({
      success: true,
      application,
      message: "Application submitted, please wait for verification.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to submit driver application",
    });
  }
};

export const listDriverApplications = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const applications = await DriverApplication.find(filter)
      .sort({ createdAt: -1 })
      .limit(500);
    res.status(200).json({ success: true, applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to list driver applications" });
  }
};

export const reviewDriverApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { action, reason } = req.body;
    const application = await DriverApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }
    if (action === "approve") {
      const user = await User.findOne({ email: application.applicantEmail });
      if (!user) {
        return res.status(404).json({ success: false, message: "Applicant user not found" });
      }
      user.role = "driver";
      user.status = "active";
      await user.save();

      application.status = "approved";
      application.reviewedAt = new Date();
      application.reviewedBy = req.user?.id || null;
      application.rejectionReason = "";

      await createNotification({
        recipientUserId: user._id,
        type: "driver_application",
        title: "Driver application approved",
        message: "Your driver profile is now approved. Log in to start accepting deliveries.",
        data: { applicationId: String(application._id) },
      });
    } else {
      application.status = "rejected";
      application.reviewedAt = new Date();
      application.reviewedBy = req.user?.id || null;
      application.rejectionReason = reason?.trim() || "";
    }
    await application.save();

    res.status(200).json({ success: true, application });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to review driver application" });
  }
};
