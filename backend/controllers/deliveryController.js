import { calculateDeliveryFee } from "../haversine.js";    
import deliveryModel from "../models/deliveryModel.js";

// @route POST /api/delivery/calculate
// @body { country, county, city, email }

export const calculateDelivery = async (req, res) => {
    try{
        const { country, county, city, email } = req.body;

        if(!country || !county || !city || !email){
            return res.status(400).json({ success: false, message: "All fields are required"});
        }

        const dbEntry = await deliveryModel.findOne({
            country: country.trim(),
            county: county.trim(),
            city: city.trim(),
        });

        let feeResult;

        if (dbEntry) {
            // If city exists in DB, override the hardcoded tiers from haversin.js
            feeResult = calculateDeliveryFee({
                country,
                county,
                city,
                email,
                COMPANY_COORDS: { lat: -1.28333, lng: 36.81667 }, // Nairobi CBD
                feeTiers: {
                tier1: dbEntry.feeTier1,
                tier2: dbEntry.feeTier2,
                tier3: dbEntry.feeTier3,
                tier4: dbEntry.feeTier4,
                },
                coords: dbEntry.coords,
            }); 
        } else {
            // fallback to haversin.js logic with hardcoded cityCoords
            feeResult = calculateDeliveryFee({ country, county, city, email });
        }

        res.json({ success: true, data: feeResult });
    } catch (error){

        console.error("Delivery fee calculation error:", error);
        res.status(500).json({ success: false, message: "Server error while calculating delivery fee" });
     
    }
}