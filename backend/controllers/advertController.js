import multer from "multer";
import Business from "../models/businessModel.js";
import Advert from "../models/advertModel.js";
import Payment from "../models/paymentModel.js";
import { makeObjectKey, putObject } from "../services/storageService.js";
import { getSignedGetUrl } from "../services/storageService.js";
import { payWithMpesa } from "../services/mpesaService.js";
import { payWithPaypal } from "../services/paypalService.js";
import { payWithCard } from "../services/cardService.js";
import { createNotification } from "../services/notificationService.js";

export const advertUpload = multer({ storage: multer.memoryStorage() }).single("media");

const isOwner = (user, business) => user && business && user._id?.equals(business.ownerId);

const detectMediaType = (mimetype) => {
  const mt = String(mimetype || "").toLowerCase();
  if (mt.startsWith("video/")) return "video";
  if (mt.startsWith("image/")) return "image";
  return null;
};

export const createAdvert = async (req, res) => {
  try {
    const { businessId } = req.params;
    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ success: false, message: "Business not found" });
    if (!isOwner(req.user, business)) return res.status(403).json({ success: false, message: "Access denied" });

    const existingCount = await Advert.countDocuments({
      businessId,
      status: { $in: ["pending_payment", "active"] },
    });
    if (existingCount >= 10) {
      return res.status(409).json({ success: false, message: "Max 10 adverts per business" });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "media file is required (field: media)" });
    }

    const mediaType = detectMediaType(req.file.mimetype);
    if (!mediaType) {
      return res.status(400).json({ success: false, message: "Only image/* or video/* is allowed" });
    }

    const key = makeObjectKey({ folder: `adverts/${businessId}`, originalName: req.file.originalname });
    const stored = await putObject({ buffer: req.file.buffer, contentType: req.file.mimetype, key });

    const advert = await Advert.create({
      businessId,
      createdByUserId: req.user.id,
      mediaType,
      media: { key: stored.key, provider: stored.provider, contentType: req.file.mimetype },
      durationSeconds: 10,
      currency: "KES",
      priceAmount: 2500,
      status: "pending_payment",
      title: typeof req.body?.title === "string" ? req.body.title : "",
      note: typeof req.body?.note === "string" ? req.body.note : "",
    });

    res.status(201).json({ success: true, advert });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create advert" });
  }
};

export const listMyBusinessAdverts = async (req, res) => {
  try {
    const { businessId } = req.params;
    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ success: false, message: "Business not found" });
    if (!isOwner(req.user, business)) return res.status(403).json({ success: false, message: "Access denied" });

    const adverts = await Advert.find({ businessId }).sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ success: true, adverts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch adverts" });
  }
};

export const payAdvertFee = async (req, res) => {
  try {
    const { businessId, advertId } = req.params;
    const { method, phone } = req.body;

    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ success: false, message: "Business not found" });
    if (!isOwner(req.user, business)) return res.status(403).json({ success: false, message: "Access denied" });

    const advert = await Advert.findOne({ _id: advertId, businessId });
    if (!advert) return res.status(404).json({ success: false, message: "Advert not found" });
    if (advert.status === "active") return res.status(200).json({ success: true, advert });

    const payment = new Payment({
      orderId: null,
      userId: req.user.id,
      amount: advert.priceAmount,
      method,
      phone,
      purpose: "ad_fee",
      advertId: advert._id,
      businessId: advert.businessId,
    });

    let paymentResult;
    if (method === "mpesa") paymentResult = await payWithMpesa(advert.priceAmount, phone);
    else if (method === "paypal") paymentResult = await payWithPaypal(advert.priceAmount);
    else if (method === "card") paymentResult = await payWithCard(advert.priceAmount);
    else {
      return res.status(400).json({ success: false, message: "Invalid payment method" });
    }

    payment.status = paymentResult.status;
    payment.transactionId = paymentResult.transactionId;
    await payment.save();

    advert.paymentId = payment._id;
    await advert.save();

    res.status(200).json({
      success: true,
      payment,
      meta: { approvalUrl: paymentResult.approvalUrl, clientSecret: paymentResult.clientSecret },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to initiate advert payment" });
  }
};

export const getAdsFeed = async (req, res) => {
  try {
    const limit = Math.min(30, Math.max(1, Number(req.query?.limit || 10)));
    const adverts = await Advert.find({ status: "active" }).sort({ createdAt: -1 }).limit(limit);

    const items = await Promise.all(
      adverts.map(async (ad) => {
        const mediaUrl = await getSignedGetUrl({ key: ad.media.key, expiresInSeconds: 120 });
        return {
          id: String(ad._id),
          businessId: String(ad.businessId),
          mediaType: ad.mediaType,
          mediaUrl,
          durationSeconds: 10,
          title: ad.title,
        };
      })
    );

    res.status(200).json({ success: true, items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch adverts feed" });
  }
};

export const activateAdvertAfterPayment = async ({ payment }) => {
  const advertId = payment?.advertId;
  if (!advertId) return;
  const advert = await Advert.findById(advertId);
  if (!advert) return;
  if (advert.status === "active") return;

  advert.status = "active";
  advert.paidAt = new Date();
  advert.paymentId = payment._id;
  await advert.save();

  // Notify the business owner.
  const business = await Business.findById(advert.businessId).select("ownerId");
  if (business?.ownerId) {
    await createNotification({
      recipientUserId: business.ownerId,
      type: "advert",
      title: "Advert activated",
      message: "Your advert is now active and will display for 10 seconds in the feed.",
      data: { advertId: String(advert._id) },
    });
  }
};
