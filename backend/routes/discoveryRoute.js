import express from "express";
import { discoveryController, discoverNearbyBusinesses, searchBusinesses, autocompleteBusiness} from "../controllers/discoveryController.js";

const discoveryRouter = express.Router();

discoveryRouter.get("/discover/viewport", discoveryController);
discoveryRouter.get("/discover/nearby", discoverNearbyBusinesses) ;
discoveryRouter.get("/search", searchBusinesses);
discoveryRouter.get("/autocomplete", autocompleteBusiness);


export default discoveryRouter;
