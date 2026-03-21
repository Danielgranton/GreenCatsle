import Business from "../models/businessModel.js";
import Job from "../models/jobModel.js";
import { deleteObject, makeObjectKey, putObject } from "../services/storageService.js";

const assertOwner = async ({ businessId, user }) => {
  const business = await Business.findById(businessId);
  if (!business) return { error: { status: 404, message: "Business not found" } };
  if (!user || !user._id?.equals(business.ownerId)) {
    return { error: { status: 403, message: "Access denied" } };
  }
  return { business };
};

export const createJob = async (req, res) => {
  try {
    const { businessId, title, category, description, locationText, salary } = req.body;
    if (!businessId || !title) {
      return res.status(400).json({ success: false, message: "businessId and title are required" });
    }

    const { error } = await assertOwner({ businessId, user: req.user });
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const job = await Job.create({
      businessId,
      title,
      category,
      description,
      locationText,
      salary,
    });

    res.status(201).json({ success: true, job });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create job" });
  }
};

export const listJobs = async (req, res) => {
  try {
    const { businessId, status } = req.query;
    const filter = {};
    if (businessId) filter.businessId = businessId;
    if (status) filter.status = status;
    const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(200);
    res.status(200).json({ success: true, jobs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch jobs" });
  }
};

export const uploadJobImage = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "image is required" });
    }

    const { jobId } = req.params;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });

    const { error } = await assertOwner({ businessId: job.businessId, user: req.user });
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const key = makeObjectKey({ folder: "jobs", originalName: req.file.originalname });
    const result = await putObject({ buffer: req.file.buffer, contentType: req.file.mimetype, key });

    const oldKey = job.image?.key;
    job.image = { key: result.key, provider: result.provider };
    await job.save();
    if (oldKey) await deleteObject({ key: oldKey });

    res.status(200).json({ success: true, imageKey: job.image.key });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to upload job image" });
  }
};

