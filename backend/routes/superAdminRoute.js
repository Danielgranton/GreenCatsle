import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/allowRoles.js";
import {
  adminGetOrder,
  adminListAdverts,
  adminListBusinesses,
  adminListBusinessesManagement,
  adminListOrders,
  adminListPayments,
  adminListReviews,
  adminListWebhookEvents,
  adminSetAdvertStatus,
  adminSetBusinessStatus,
  adminSetUserRole,
  adminSetUserStatus,
} from "../controllers/superAdminController.js";
import { listDriverApplications, reviewDriverApplication } from "../controllers/driverApplicationController.js";

const router = express.Router();

router.use(authMiddleware, allowRoles("superadmin"));

router.get("/orders", adminListOrders);
router.get("/orders/:orderId", adminGetOrder);

router.get("/payments", adminListPayments);

router.get("/adverts", adminListAdverts);
router.patch("/adverts/:advertId/status", adminSetAdvertStatus);

router.get("/businesses", adminListBusinesses);
router.get("/businesses/management", adminListBusinessesManagement);
router.patch("/businesses/:businessId/status", adminSetBusinessStatus);

router.get("/reviews", adminListReviews);

router.get("/webhook-events", adminListWebhookEvents);

router.get("/driver-applications", listDriverApplications);
router.patch("/driver-applications/:applicationId", reviewDriverApplication);

router.patch("/users/:userId/role", adminSetUserRole);
router.patch("/users/:userId/status", adminSetUserStatus);

export default router;
