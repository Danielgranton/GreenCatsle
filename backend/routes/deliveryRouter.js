import express from "express";
import { calculateDelivery } from "../controllers/deliveryController.js";


const deliveryRouter = express.Router();

deliveryRouter.post("/calculate",  calculateDelivery );


export default deliveryRouter;