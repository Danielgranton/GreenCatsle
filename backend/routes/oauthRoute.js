import express from "express";
import {
  oauthGoogleStart,
  oauthGoogleCallback,
  oauthMetaStart,
  oauthMetaCallback,
} from "../controllers/oauthController.js";

const router = express.Router();

router.get("/google/start", oauthGoogleStart);
router.get("/google/callback", oauthGoogleCallback);

// Meta (Facebook/Instagram via Meta OAuth)
router.get("/meta/start", oauthMetaStart);
router.get("/meta/callback", oauthMetaCallback);

export default router;

