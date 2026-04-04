import express from "express";
import {
  oauthGoogleStart,
  oauthGoogleCallback,
  oauthMetaStart,
  oauthMetaCallback,
  oauthMicrosoftStart,
  oauthMicrosoftCallback,
  oauthMetaDeletion,
  oauthMetaDeletionStatus,
} from "../controllers/oauthController.js";

const router = express.Router();

router.get("/google/start", oauthGoogleStart);
router.get("/google/callback", oauthGoogleCallback);

// Meta (Facebook/Instagram via Meta OAuth)
router.get("/meta/start", oauthMetaStart);
router.get("/meta/callback", oauthMetaCallback);
router.post("/meta/deletion", oauthMetaDeletion);
router.get("/meta/deletion/status", oauthMetaDeletionStatus);

// Microsoft
router.get("/microsoft/start", oauthMicrosoftStart);
router.get("/microsoft/callback", oauthMicrosoftCallback);

export default router;
