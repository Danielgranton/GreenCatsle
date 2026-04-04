import mongoose from "mongoose";
import Advert from "../models/advertModel.js";
import Business from "../models/businessModel.js";
import { deleteObject } from "./storageService.js";
import { createNotification } from "./notificationService.js";

const toInt = (value, fallback) => {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

const getGraceMs = () => {
  const hours = toInt(process.env.AD_RENEWAL_GRACE_HOURS, 72);
  return Math.max(1, hours) * 60 * 60 * 1000;
};

export const runAdvertLifecycleSweep = async () => {
  try {
    if (mongoose.connection.readyState !== 1) return;

    const now = new Date();

    // 1) Expire active adverts that have reached their end time.
    const expiring = await Advert.find({
      status: "active",
      endsAt: { $ne: null, $lte: now },
    })
      .sort({ endsAt: 1 })
      .limit(200);

    for (const ad of expiring) {
      try {
        ad.status = "expired";
        if (!ad.expiredAt) ad.expiredAt = now;
        await ad.save();

        const business = await Business.findById(ad.businessId).select("ownerId");
        if (business?.ownerId) {
          await createNotification({
            recipientUserId: business.ownerId,
            type: "advert",
            title: "Advert expired",
            message: "Your advert has expired. Renew it to keep showing in the feed, or it will be deleted automatically.",
            data: { advertId: String(ad._id) },
          });
        }
      } catch (e) {
        console.error("Advert expiry update failed:", e);
      }
    }

    // 2) Auto-delete expired adverts after the grace window.
    const cutoff = new Date(Date.now() - getGraceMs());
    const toDelete = await Advert.find({
      status: "expired",
      expiredAt: { $ne: null, $lte: cutoff },
    })
      .sort({ expiredAt: 1 })
      .limit(200);

    for (const ad of toDelete) {
      try {
        const key = ad?.media?.key;
        const provider = ad?.media?.provider;
        if (key) {
          try {
            await deleteObject({ key, provider });
          } catch (e) {
            console.error("Advert media delete failed:", e);
          }
        }
        await Advert.deleteOne({ _id: ad._id });
      } catch (e) {
        console.error("Advert auto-delete failed:", e);
      }
    }
  } catch (error) {
    console.error("Advert lifecycle sweep failed:", error);
  }
};

export const startAdvertLifecycleJobs = () => {
  // Run shortly after boot, then periodically.
  const intervalMs = Math.max(60_000, toInt(process.env.AD_LIFECYCLE_SWEEP_MS, 10 * 60_000));
  setTimeout(() => {
    void runAdvertLifecycleSweep();
  }, 15_000);
  setInterval(() => {
    void runAdvertLifecycleSweep();
  }, intervalMs);
};

