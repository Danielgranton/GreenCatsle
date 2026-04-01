import BusinessApplication from "../models/businessApplicationModel.js";
import userModel from "../models/userModel.js";
import Business from "../models/businessModel.js";
import { createNotification } from "../services/notificationService.js";
import { getTrialDays } from "../services/trialService.js";

export const generateKeywords = (text) => {
  const tokens = String(text || "").toLowerCase().split(/\s+/).filter(Boolean);
  const keywords = [];
  for (let i = 0; i < tokens.length; i++) {
    let prefix = "";
    for (let j = 0; j <= i; j++) {
      prefix += tokens[j] + " ";
      keywords.push(prefix.trim());
    }
  }
  return Array.from(new Set(keywords));
};

export const listBusinessApplications = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const applications = await BusinessApplication.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .populate("applicantUserId", "name email phone role status");

    res.status(200).json({ success: true, applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to list applications" });
  }
};

export const approveBusinessApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await BusinessApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    if (application.status === "approved") {
      return res.status(200).json({ success: true, application });
    }
    if (application.status !== "pending") {
      return res.status(409).json({ success: false, message: "Application is not pending" });
    }

    const user = await userModel.findById(application.applicantUserId);
    if (!user) return res.status(404).json({ success: false, message: "Applicant user not found" });

    if (user.role === "superadmin") {
      return res.status(409).json({
        success: false,
        message: "Superadmin accounts cannot be converted via application approval",
      });
    }

    let linkedBusinessId = user.businessId || application.createdBusinessId || null;
    let createdBusiness = null;

    if (!linkedBusinessId) {
      const coords = application.location?.coordinates;
      if (
        !Array.isArray(coords) ||
        coords.length !== 2 ||
        !Number.isFinite(Number(coords[0])) ||
        !Number.isFinite(Number(coords[1]))
      ) {
        return res.status(400).json({
          success: false,
          message: "Application is missing valid location.coordinates",
        });
      }

      const searchString = `${application.businessName} ${application.category} ${application.address}`;
      const keywords = generateKeywords(searchString);

      createdBusiness = await Business.create({
        name: application.businessName,
        category: application.category,
        ownerId: user._id,
        address: application.address,
        searchkeywords: keywords,
        location: { type: "Point", coordinates: [Number(coords[0]), Number(coords[1])] },
        logo: application.logo?.key ? application.logo : undefined,
      });

      linkedBusinessId = createdBusiness._id;
    }

    user.role = "admin";
    if (!user.businessId) user.businessId = linkedBusinessId;
    await user.save();

    application.status = "approved";
    application.reviewedByUserId = req.user.id;
    application.reviewedAt = new Date();
    application.rejectionReason = "";
    application.createdBusinessId = linkedBusinessId;
    await application.save();

    // Start free-trial window from approval.
    try {
      const business = await Business.findById(linkedBusinessId);
      if (business) {
        const days = getTrialDays();
        if (!business.approvedAt) business.approvedAt = application.reviewedAt;
        if (!business.trialStartedAt) business.trialStartedAt = application.reviewedAt;
        if (!business.trialEndsAt && days > 0) {
          business.trialEndsAt = new Date(application.reviewedAt.getTime() + days * 24 * 60 * 60 * 1000);
        }
        await business.save();
      }
    } catch (e) {
      console.error("Failed to set business trial window:", e);
    }

    await createNotification({
      recipientUserId: user._id,
      type: "business_application",
      title: "Application approved",
      message: createdBusiness
        ? "Your application was approved and your business is ready. You can now access the admin dashboard."
        : "Your application was approved. You can now access the admin dashboard.",
      data: {
        applicationId: String(application._id),
        businessId: linkedBusinessId ? String(linkedBusinessId) : null,
      },
    });

    res.status(200).json({ success: true, application, business: createdBusiness });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to approve application" });
  }
};

export const rejectBusinessApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { reason } = req.body;

    const application = await BusinessApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }
    if (application.status === "rejected") {
      return res.status(200).json({ success: true, application });
    }
    if (application.status !== "pending") {
      return res.status(409).json({ success: false, message: "Application is not pending" });
    }

    application.status = "rejected";
    application.rejectionReason = typeof reason === "string" ? reason : "";
    application.reviewedByUserId = req.user.id;
    application.reviewedAt = new Date();
    await application.save();

    await createNotification({
      recipientUserId: application.applicantUserId,
      type: "business_application",
      title: "Application rejected",
      message: reason ? `Reason: ${reason}` : "Your business application was rejected.",
      data: { applicationId: String(application._id) },
    });

    res.status(200).json({ success: true, application });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to reject application" });
  }
};
