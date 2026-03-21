import Business from "../models/businessModel.js";
import MenuItem from "../models/menuModel.js";
import Service from "../models/serviceModel.js";
import { deleteObject, makeObjectKey, putObject } from "../services/storageService.js";

const assertOwner = async ({ businessId, user }) => {
  const business = await Business.findById(businessId);
  if (!business) return { error: { status: 404, message: "Business not found" } };
  if (!user || !user._id?.equals(business.ownerId)) {
    return { error: { status: 403, message: "Access denied" } };
  }
  return { business };
};

export const uploadMenuItemImage = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "image is required" });
    }

    const { businessId, menuItemId } = req.params;
    const { error } = await assertOwner({ businessId, user: req.user });
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const item = await MenuItem.findById(menuItemId);
    if (!item) return res.status(404).json({ success: false, message: "Menu item not found" });
    if (String(item.businessId) !== String(businessId)) {
      return res.status(403).json({ success: false, message: "Menu item does not belong to business" });
    }

    const key = makeObjectKey({ folder: "menu", originalName: req.file.originalname });
    const result = await putObject({ buffer: req.file.buffer, contentType: req.file.mimetype, key });

    const oldKey = item.image?.key;
    item.image = { key: result.key, provider: result.provider };
    await item.save();
    if (oldKey) await deleteObject({ key: oldKey });

    res.status(200).json({ success: true, imageKey: item.image.key });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to upload menu item image" });
  }
};

export const uploadServiceImage = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "image is required" });
    }

    const { businessId, serviceId } = req.params;
    const { error } = await assertOwner({ businessId, user: req.user });
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });
    if (String(service.businessId) !== String(businessId)) {
      return res.status(403).json({ success: false, message: "Service does not belong to business" });
    }

    const key = makeObjectKey({ folder: "services", originalName: req.file.originalname });
    const result = await putObject({ buffer: req.file.buffer, contentType: req.file.mimetype, key });

    const oldKey = service.image?.key;
    service.image = { key: result.key, provider: result.provider };
    await service.save();
    if (oldKey) await deleteObject({ key: oldKey });

    res.status(200).json({ success: true, imageKey: service.image.key });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to upload service image" });
  }
};

