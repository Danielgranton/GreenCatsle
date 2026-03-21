import DriverLocation  from "../models/driverLocationModel.js";
import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
import { io } from "../server.js";

export const matchDriverToOrder = async (orderId) => {
    
    const order = await Order.findById(orderId);

    const [lng, lat] = order.pickupCoordinates;

    //find nearby driver
    const drivers = await DriverLocation.findOne({
        location : {
            $near : {
                $geometry : {
                    type : "Point",
                    coordinates : [lng, lat]
                },
                $maxDistance : 5000
            }
        }
    });

    for (let driverLocation of drivers) {
        const driver = await User.findById(driverLocation.driverId);

        if (!driver.active || driver.busy) continue;

        //send notification to driver
        io.to(driver._id.toString()).emit("deliveryRequest", {
            orderId: order._id,
        });

        //wait for response from driver
        const accepted = await waitForDriverResponse(driver._id);

        if(accepted) {
            order.driverId = driver._id;
            order.status = "driverAssigned";

            await order.save();

            driver.status = "busy";
            await driver.save();

            return driver;
            a
        }
    }

    return null;
}