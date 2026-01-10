import { applyPromo } from "../controllers/promoController.js";
    
import express from "express";

const promoRouter = express.Router();

promoRouter.post("/apply", applyPromo);

export default promoRouter;