import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  applyForBusiness,
  applyForBusinessWithCredentials,
  getMyBusinessApplications,
  getMyBusinessApplicationsWithCredentials,
} from "../controllers/businessApplicationController.js";
import { rateLimit } from "../middleware/rateLimit.js";
import multer from "multer";
import { validateBody } from "../middleware/validate.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const maybeUploadLogo = (req, res, next) => {
  const ct = String(req.headers["content-type"] || "");
  if (ct.includes("multipart/form-data")) {
    return upload.single("logo")(req, res, next);
  }
  return next();
};

router.post(
  "/apply-with-credentials",
  rateLimit({ windowMs: 60_000, max: 3 }),
  maybeUploadLogo,
  applyForBusinessWithCredentials
);

router.post(
  "/my-with-credentials",
  rateLimit({ windowMs: 60_000, max: 6 }),
  validateBody({
    email: { type: "nonEmptyString" },
    password: { type: "nonEmptyString" },
  }),
  getMyBusinessApplicationsWithCredentials
);

router.post(
  "/apply",
  authMiddleware,
  rateLimit({ windowMs: 60_000, max: 3 }),
  validateBody({
    businessName: { type: "nonEmptyString" },
    category: { type: "nonEmptyString" },
    address: { type: "nonEmptyString" },
    location: { type: "object" },
  }),
  applyForBusiness
);
router.get("/my", authMiddleware, getMyBusinessApplications);

export default router;
