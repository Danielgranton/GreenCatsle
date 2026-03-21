import Business from "../models/businessModel.js";
import { deleteObject, makeObjectKey, putObject } from "../services/storageService.js";

const assertOwner = async ({ businessId, user }) => {
  const business = await Business.findById(businessId);
  if (!business) return { error: { status: 404, message: "Business not found" } };
  if (!user || !user._id?.equals(business.ownerId)) {
    return { error: { status: 403, message: "Access denied" } };
  }
  return { business };
};

export const uploadBusinessLogo = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "image is required" });
    }

    const { businessId } = req.params;
    const { business, error } = await assertOwner({ businessId, user: req.user });
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const key = makeObjectKey({ folder: "business/logo", originalName: req.file.originalname });
    const result = await putObject({ buffer: req.file.buffer, contentType: req.file.mimetype, key });

    const oldKey = business.logo?.key;
    business.logo = { key: result.key, provider: result.provider };
    await business.save();
    if (oldKey) await deleteObject({ key: oldKey });

    res.status(200).json({ success: true, logoKey: business.logo.key });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to upload logo" });
  }
};

export const uploadBusinessCover = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "image is required" });
    }

    const { businessId } = req.params;
    const { business, error } = await assertOwner({ businessId, user: req.user });
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const key = makeObjectKey({ folder: "business/cover", originalName: req.file.originalname });
    const result = await putObject({ buffer: req.file.buffer, contentType: req.file.mimetype, key });

    const oldKey = business.cover?.key;
    business.cover = { key: result.key, provider: result.provider };
    await business.save();
    if (oldKey) await deleteObject({ key: oldKey });

    res.status(200).json({ success: true, coverKey: business.cover.key });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to upload cover" });
  }
};

