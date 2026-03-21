import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getSignedMediaUrl } from "../controllers/mediaController.js";

const mediaRouter = express.Router();

// Private media: require auth, return short-lived signed url (or local /images url in local mode).
mediaRouter.get("/signed", authMiddleware, getSignedMediaUrl);

export default mediaRouter;

