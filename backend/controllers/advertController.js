import multer from "multer";
import Business from "../models/businessModel.js";
import Advert from "../models/advertModel.js";
import Payment from "../models/paymentModel.js";
import { deleteObject, makeObjectKey, putObject } from "../services/storageService.js";
import { getSignedGetUrl } from "../services/storageService.js";
import { payWithMpesa } from "../services/mpesaService.js";
import { payWithPaypal } from "../services/paypalService.js";
import { payWithCard } from "../services/cardService.js";
import { createNotification } from "../services/notificationService.js";
import { getTrialDays, getTrialRolloutAt, isBusinessInFreeTrial } from "../services/trialService.js";

export const advertUpload = multer({ storage: multer.memoryStorage() }).single("media");

const isOwner = (user, business) => user && business && user._id?.equals(business.ownerId);

const advertPricingByDays = {
  5: 2500,
  10: 5000,
  15: 10000,
};

const toInt = (value) => {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

const parseDurationDays = (req) => {
  const raw = req?.body?.durationDays ?? req?.body?.days;
  const days = toInt(raw);
  if (!days || !advertPricingByDays[days]) return null;
  return days;
};

const computeTrialEndsAt = (business) => {
  const days = getTrialDays();
  if (!business || days <= 0) return null;

  const explicit = business.trialEndsAt ? new Date(business.trialEndsAt) : null;
  if (explicit && !Number.isNaN(explicit.getTime())) return explicit;

  const start =
    business.trialStartedAt ? new Date(business.trialStartedAt) :
    business.approvedAt ? new Date(business.approvedAt) :
    getTrialRolloutAt();
  if (!start || Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
};

const computeAdvertPrice = ({ days, business }) => {
  const isTrial = isBusinessInFreeTrial(business);
  if (isTrial) return 0;
  return advertPricingByDays[days] ?? null;
};

const detectMediaType = (mimetype) => {
  const mt = String(mimetype || "").toLowerCase();
  if (mt.startsWith("video/")) return "video";
  if (mt.startsWith("image/")) return "image";
  return null;
};

const activateAdvertNow = async ({ advert, payment = null, days, activationSource = null }) => {
  const now = new Date();
  const durationDays = advertPricingByDays[days] ? days : advert.durationDays || 5;
  let endsAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  advert.status = "active";
  advert.activatedAt = now;
  advert.activationSource = activationSource || (payment?._id ? "paid" : "trial");
  if (advert.activationSource === "paid") {
    advert.paidAt = now;
    if (payment?._id) advert.paymentId = payment._id;
  } else {
    advert.paidAt = null;
    advert.paymentId = null;
  }
  advert.startsAt = now;
  advert.endsAt = endsAt;
  advert.expiredAt = null;
  advert.pendingRenewalDays = null;
  await advert.save();

  // Notify the business owner.
  const business = await Business.findById(advert.businessId).select(
    "ownerId trialEndsAt trialStartedAt approvedAt"
  );
  if (business && isBusinessInFreeTrial(business)) {
    const trialEndsAt = computeTrialEndsAt(business);
    if (trialEndsAt && !Number.isNaN(trialEndsAt.getTime()) && trialEndsAt.getTime() < endsAt.getTime()) {
      endsAt = trialEndsAt;
      advert.endsAt = endsAt;
      await advert.save();
    }
  }
  if (business?.ownerId) {
    await createNotification({
      recipientUserId: business.ownerId,
      type: "advert",
      title: "Advert activated",
      message: `Your advert is now active and will run until ${endsAt.toLocaleString()}.`,
      data: { advertId: String(advert._id), endsAt: endsAt.toISOString() },
    });
  }
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

    const durationDays = parseDurationDays(req);
    if (!durationDays) {
      return res.status(400).json({
        success: false,
        message: "Invalid days. Allowed: 5, 10, 15",
      });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "media file is required (field: media)" });
    }

    const mediaType = detectMediaType(req.file.mimetype);
    if (!mediaType) {
      return res.status(400).json({ success: false, message: "Only image/* or video/* is allowed" });
    }

    const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";
    if (!note) {
      return res.status(400).json({ success: false, message: "note is required" });
    }

    const key = makeObjectKey({ folder: `adverts/${businessId}`, originalName: req.file.originalname });
    const stored = await putObject({ buffer: req.file.buffer, contentType: req.file.mimetype, key });

    const priceAmount = computeAdvertPrice({ days: durationDays, business });
    const status = priceAmount === 0 ? "active" : "pending_payment";

    const advert = await Advert.create({
      businessId,
      createdByUserId: req.user.id,
      mediaType,
      media: { key: stored.key, provider: stored.provider, contentType: req.file.mimetype },
      durationSeconds: 10,
      durationDays,
      currency: "KES",
      priceAmount,
      status,
      title: typeof req.body?.title === "string" ? req.body.title : "",
      note,
    });

    if (status === "active") {
      try {
        // Ensure notification is sent in the same way as paid activation.
        await activateAdvertNow({ advert, days: durationDays, activationSource: "trial" });
      } catch (e) {
        console.error("Failed to notify after trial advert activation:", e);
      }
    }

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
    if (advert.status !== "pending_payment") {
      return res.status(409).json({ success: false, message: "This advert is not awaiting initial payment" });
    }

    // Free-trial: no ads fee required.
    if (advert.priceAmount === 0 || isBusinessInFreeTrial(business)) {
      await activateAdvertNow({ advert, days: advert.durationDays || 5, activationSource: "trial" });
      return res.status(200).json({ success: true, advert });
    }

    if (method === "mpesa" && !String(phone || "").trim()) {
      return res.status(400).json({ success: false, message: "phone is required for M-Pesa payments" });
    }

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
    const now = new Date();
    const adverts = await Advert.find({
      status: "active",
      $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    const absolutizeLocalUrl = (url) => {
      if (typeof url !== "string" || !url.startsWith("/images/")) return url;
      const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
      return `${base}${url}`;
    };

    const businessIds = Array.from(new Set(adverts.map((a) => String(a.businessId)).filter(Boolean)));
    const businesses = await Business.find({ _id: { $in: businessIds } }).select(
      "name category address location logo"
    );
    const businessMap = new Map(businesses.map((b) => [String(b._id), b]));

    const items = await Promise.all(
      adverts.map(async (ad) => {
        const business = businessMap.get(String(ad.businessId)) || null;
        const mediaUrl = await getSignedGetUrl({ key: ad.media.key, provider: ad.media.provider, expiresInSeconds: 120 });
        const logoUrl = business?.logo?.key
          ? absolutizeLocalUrl(await getSignedGetUrl({ key: business.logo.key, provider: business.logo.provider, expiresInSeconds: 600 }))
          : null;
        return {
          id: String(ad._id),
          businessId: String(ad.businessId),
          mediaType: ad.mediaType,
          mediaUrl: absolutizeLocalUrl(mediaUrl),
          durationSeconds: 10,
          title: ad.title,
          note: ad.note,
          business: business
            ? {
                id: String(business._id),
                name: business.name,
                category: business.category,
                address: business.address,
                location: business.location,
                logoUrl,
              }
            : null,
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

  const days = advert.pendingRenewalDays || advert.durationDays || 5;
  await activateAdvertNow({ advert, payment, days, activationSource: "paid" });
};

export const renewAdvert = async (req, res) => {
  try {
    const { businessId, advertId } = req.params;
    const { method, phone, days } = req.body;

    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ success: false, message: "Business not found" });
    if (!isOwner(req.user, business)) return res.status(403).json({ success: false, message: "Access denied" });

    const advert = await Advert.findOne({ _id: advertId, businessId });
    if (!advert) return res.status(404).json({ success: false, message: "Advert not found" });

    const now = new Date();
    const isExpired = advert.status === "expired" || (advert.endsAt && advert.endsAt.getTime() <= now.getTime());
    if (!isExpired) {
      return res.status(409).json({ success: false, message: "Advert is not expired yet" });
    }

    const durationDays = advertPricingByDays[toInt(days)] ? toInt(days) : null;
    if (!durationDays) {
      return res.status(400).json({ success: false, message: "Invalid days. Allowed: 5, 10, 15" });
    }

    const priceAmount = computeAdvertPrice({ days: durationDays, business });
    if (priceAmount == null) {
      return res.status(500).json({ success: false, message: "Failed to compute advert price" });
    }

    advert.durationDays = durationDays;
    advert.pendingRenewalDays = durationDays;
    advert.priceAmount = priceAmount;
    advert.currency = advert.currency || "KES";
    advert.expiredAt = null;

    // Free trial renewal (no payment needed).
    if (priceAmount === 0) {
      await activateAdvertNow({ advert, days: durationDays, activationSource: "trial" });
      return res.status(200).json({ success: true, advert });
    }

    if (method === "mpesa" && !String(phone || "").trim()) {
      return res.status(400).json({ success: false, message: "phone is required for M-Pesa payments" });
    }

    // Initiate payment for renewal.
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
    advert.status = "pending_payment";
    await advert.save();

    res.status(200).json({
      success: true,
      payment,
      meta: { approvalUrl: paymentResult.approvalUrl, clientSecret: paymentResult.clientSecret },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to renew advert" });
  }
};

export const deleteMyAdvert = async (req, res) => {
  try {
    const { businessId, advertId } = req.params;

    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ success: false, message: "Business not found" });
    if (!isOwner(req.user, business)) return res.status(403).json({ success: false, message: "Access denied" });

    const advert = await Advert.findOne({ _id: advertId, businessId });
    if (!advert) return res.status(404).json({ success: false, message: "Advert not found" });

    const mediaKey = advert?.media?.key;
    const mediaProvider = advert?.media?.provider;
    if (mediaKey) {
      try {
        await deleteObject({ key: mediaKey, provider: mediaProvider });
      } catch (e) {
        console.error("Failed to delete advert media object:", e);
      }
    }

    await Advert.deleteOne({ _id: advert._id });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to delete advert" });
  }
};
