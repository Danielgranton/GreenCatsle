import Job from "../models/jobModel.js";
import JobApplication from "../models/jobApplicationModel.js";
import { makeObjectKey, putObject } from "../services/storageService.js";

export const applyForJob = async (req, res) => {
  try {
    const { jobId, applicantName, applicantEmail, applicantPhone, coverLetter } = req.body || {};
    if (!jobId || !applicantName || !applicantEmail) {
      return res.status(400).json({
        success: false,
        message: "jobId, applicantName, and applicantEmail are required",
      });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "Resume (file) is required" });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    if (job.status !== "open") {
      return res.status(409).json({ success: false, message: "Job is closed" });
    }

    const key = makeObjectKey({ folder: `job-applications/${jobId}`, originalName: req.file.originalname });
    const stored = await putObject({ buffer: req.file.buffer, contentType: req.file.mimetype, key });

    const application = await JobApplication.create({
      jobId,
      businessId: job.businessId,
      applicantName: applicantName.trim(),
      applicantEmail: applicantEmail.trim().toLowerCase(),
      applicantPhone: applicantPhone?.trim() || "",
      coverLetter: coverLetter?.trim() || "",
      resume: {
        key: stored.key,
        provider: stored.provider,
        originalName: req.file.originalname,
      },
    });

    res.status(201).json({ success: true, application });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to submit application" });
  }
};

export const listJobApplications = async (req, res) => {
  try {
    const filter = {};
    if (req.user?.role === "admin") {
      if (!req.user.businessId) {
        return res.status(400).json({ success: false, message: "Business ID missing from profile" });
      }
      filter.businessId = req.user.businessId;
    } else if (req.user?.role === "superadmin" && req.query?.businessId) {
      filter.businessId = req.query.businessId;
    }
    if (req.query?.jobId) filter.jobId = req.query.jobId;
    if (req.query?.status) filter.status = req.query.status;

    const applications = await JobApplication.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(200, Number(req.query?.limit) || 100))
      .populate("jobId", "title status");

    res.status(200).json({ success: true, applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to list job applications" });
  }
};
