import Business from "../models/businessModel.js";
import { deleteObject, makeObjectKey, putObject } from "../services/storageService.js";

const assertOwner = async ({ businessId, user }) => {
  const business = await Business.findById(businessId);
  if (!business) return { error: { status: 404, message: "Business not found" } };
  const isSuper = user?.role === "superadmin";
  const isOwner = user?._id && business.ownerId && user._id.equals(business.ownerId);
  const isLinked = user?.businessId && String(user.businessId) === String(businessId);
  if (!isSuper && !isOwner && !isLinked) return { error: { status: 403, message: "Access denied" } };
  return { business };
};

const parseCoordinates = (value) => {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const lng = Number(value[0]);
  const lat = Number(value[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lng, lat];
};

export const updateBusinessSettings = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { business, error } = await assertOwner({ businessId, user: req.user });
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const { name, address, location } = req.body || {};

    if (typeof name === "string" && name.trim()) business.name = name.trim();
    if (typeof address === "string" && address.trim()) business.address = address.trim();

    if (location?.coordinates != null) {
      const coords = parseCoordinates(location.coordinates);
      if (!coords) {
        return res.status(400).json({ success: false, message: "location.coordinates must be [lng, lat]" });
      }
      business.location = { type: "Point", coordinates: coords };
    }

    await business.save();
    res.status(200).json({ success: true, business });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update business settings" });
  }
};

export const uploadBusinessLogo = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "image is required" });
    }

    const { businessId } = req.params;
    const { business, error } = await assertOwner({ businessId, user: req.user });
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const key = makeObjectKey({ folder: `business-logos/${businessId}`, originalName: req.file.originalname });
    const result = await putObject({ buffer: req.file.buffer, contentType: req.file.mimetype, key });

    const oldKey = business.logo?.key;
    const oldProvider = business.logo?.provider;
    business.logo = { key: result.key, provider: result.provider };
    await business.save();

    if (oldKey) await deleteObject({ key: oldKey, provider: oldProvider });

    res.status(200).json({ success: true, logoKey: business.logo.key, business });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to upload logo" });
  }
};

