import DriverLocation from "../models/driverLocationModel.js";
import { io } from "../server.js";

export const updateDriverLocation = async (req, res) => {
    try {
        
        const { orderId, lat, lng } = req.body;
        
        const location = await DriverLocation.findOne({orderId}, {
            driverId : req.user.id,
            location : {
                type : "Point",
                coordinates : [lng, lat]
            },

            updatedAt : new Date()
        },
        {
            upsert : true,
            new : true
        }
    );

    // broadcast to all users watching this order
    io.to(orderId).emit("driverLocation", {
        lat,
        lng
    });

    
    res.json({
        success : true

    });

    } catch (error) {
        
        console.log(error);
        res.status(500).json({
            success : false,
            message : "Error updating driver location"
        })
    }
}