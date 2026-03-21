import mongoose  from "mongoose";

const driverLocationSchema = new mongoose.Schema({
    driverId : {
        type : mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    orderId: {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Order"
    },

    location : {
        type : {
            type : String,
            enum : ["point"],
            default : "point"
        },
        coordinates : [Number]
    },

    updatedAt : {
        type : Date,
        default : Date.now
    }
});

driverLocationSchema.index({location : "2dsphere"});

const driverLocationModel = mongoose.models.driverLocation || mongoose.model("driverLocation", driverLocationSchema);

export default driverLocationModel;