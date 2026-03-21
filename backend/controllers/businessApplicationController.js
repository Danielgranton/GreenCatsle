import BusinessApplication from "../models/businessApplicationModel.js";
import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import { makeObjectKey, putObject } from "../services/storageService.js";

export const parseCoordinates = (value) => {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const lng = Number(value[0]);
  const lat = Number(value[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lng, lat];
};

export const applyForBusiness = async (req, res) => {
  try {
    const { businessName, category, address, location } = req.body;

    if (!req.user || req.user.role !== "user") {
      return res.status(403).json({
        success: false,
        message: "Only user accounts can apply for an admin/business account",
      });
    }

    if (req.user.businessId) {
      return res.status(409).json({
        success: false,
        message: "This account already has a business linked",
      });
    }

    if (!businessName || !category || !address) {
      return res.status(400).json({
        success: false,
        message: "businessName, category, and address are required",
      });
    }

    const coordinates = parseCoordinates(location?.coordinates);
    if (!coordinates) {
      return res.status(400).json({
        success: false,
        message: "location.coordinates must be [lng, lat]",
      });
    }

    // One pending application per user.
    const existingPending = await BusinessApplication.findOne({
      applicantUserId: req.user.id,
      status: "pending",
    });
    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: "You already have a pending application",
        applicationId: existingPending._id,
      });
    }

    const application = await BusinessApplication.create({
      applicantUserId: req.user.id,
      businessName,
      category,
      address,
      location: { type: "Point", coordinates },
      status: "pending",
    });

    res.status(201).json({ success: true, application });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to submit application" });
  }
};

export const applyForBusinessWithCredentials = async (req, res) => {
  try {
    const { email, password, businessName, category, address } = req.body;
    const locationRaw = req.body?.location;
    const location =
      typeof locationRaw === "string"
        ? (() => {
            try {
              return JSON.parse(locationRaw);
            } catch {
              return null;
            }
          })()
        : locationRaw;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "email and password are required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User doesn't exist" });
    }

    if (user.status !== "active") {
      return res.status(401).json({ success: false, message: "Account inactive" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (user.role !== "user") {
      return res.status(409).json({
        success: false,
        message: "This account is already an admin (or higher) and cannot apply",
      });
    }

    if (user.businessId) {
      return res.status(409).json({
        success: false,
        message: "This account already has a business linked",
      });
    }

    if (!businessName || !category || !address) {
      return res.status(400).json({
        success: false,
        message: "businessName, category, and address are required",
      });
    }

    const coordinates = parseCoordinates(location?.coordinates);
    if (!coordinates) {
      return res.status(400).json({
        success: false,
        message: "location.coordinates must be [lng, lat]",
      });
    }

    const existingPending = await BusinessApplication.findOne({
      applicantUserId: user._id,
      status: "pending",
    });
    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: "You already have a pending application",
        applicationId: existingPending._id,
      });
    }

    let logo = null;
    if (req.file?.buffer) {
      const key = makeObjectKey({ folder: "business-app-logos", originalName: req.file.originalname });
      const stored = await putObject({ buffer: req.file.buffer, contentType: req.file.mimetype, key });
      logo = { key: stored.key, provider: stored.provider };
    }

    const application = await BusinessApplication.create({
      applicantUserId: user._id,
      businessName,
      category,
      address,
      location: { type: "Point", coordinates },
      logo: logo || undefined,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      application,
      message: "Application submitted. A superadmin will review it.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to submit application" });
  }
};

export const getMyBusinessApplications = async (req, res) => {
  try {
    const applications = await BusinessApplication.find({
      applicantUserId: req.user.id,
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch applications" });
  }
};

export const getMyBusinessApplicationsWithCredentials = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User doesn't exist" });
    }

    if (user.status !== "active") {
      return res.status(401).json({ success: false, message: "Account inactive" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const applications = await BusinessApplication.find({
      applicantUserId: user._id,
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch applications" });
  }
};
