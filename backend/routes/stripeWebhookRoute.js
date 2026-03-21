import express from "express";
import { stripeWebhook } from "../controllers/stripeWebhookController.js";

const router = express.Router();

// Stripe requires the raw body to verify signatures. server.js stores raw body on req.rawBody.
router.post("/stripe", stripeWebhook);

export default router;

