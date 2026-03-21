import userModel from "../models/userModel.js";
import { deleteObject, makeObjectKey, putObject } from "../services/storageService.js";

export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "image is required" });
    }

    const user = await userModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const key = makeObjectKey({ folder: "avatars", originalName: req.file.originalname });
    const result = await putObject({
      buffer: req.file.buffer,
      contentType: req.file.mimetype,
      key,
    });

    const oldKey = user.avatar?.key;
    user.avatar = { key: result.key, provider: result.provider };
    await user.save();

    if (oldKey) await deleteObject({ key: oldKey });

    res.status(200).json({ success: true, avatarKey: user.avatar.key });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to upload avatar" });
  }
};

