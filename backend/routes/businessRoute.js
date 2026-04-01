import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import allowRoles from '../middleware/allowRolles.js';

import {
    registerBusiness,
    listBusinessesPublic,
    getBusinessMenuPublic,
    listMenuCategoriesPublic,
    listMenuCategoryCardsPublic,
    listMenuItemCardsPublic,
    addMenuItem,
    addService,
    getBusinessDetails,
    getBusinessPublicDetails,
    assignWorkers,
} from "../controllers/businessController.js";

const router = express.Router();

// Public endpoints (client-facing)
router.get("/", listBusinessesPublic);
router.get("/menu-categories", listMenuCategoriesPublic);
router.get("/menu-category-cards", listMenuCategoryCardsPublic);
router.get("/menu-item-cards", listMenuItemCardsPublic);
router.get("/:businessId/menu", getBusinessMenuPublic);
router.get("/:businessId/public", getBusinessPublicDetails);

//register business
router.post("/regbusiness", authMiddleware, allowRoles("admin", "superadmin"),registerBusiness);

//add menu item
router.post("/:businessId/menu", authMiddleware, allowRoles("admin"), addMenuItem);

//add service
router.post("/:businessId/service", authMiddleware, allowRoles("admin"), addService);

//assign worker
router.post("/:businessId/worker", authMiddleware, allowRoles("admin"), assignWorkers);

//get business details
router.get("/:businessId", authMiddleware,getBusinessDetails);

export default router;
