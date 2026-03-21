import express from "express";
import { mpesaB2CWebhook, mpesaWebhook } from "../controllers/webhookController.js";

const router = express.Router();

router.post("/mpesa", mpesaWebhook);
router.post("/mpesa-b2c", mpesaB2CWebhook);

export default router;
