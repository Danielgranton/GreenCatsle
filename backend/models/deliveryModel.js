import mongoose  from "mongoose";

const deliverySchema = new mongoose.Schema({
    country : {type : String, required : true},
    county : {type : String, required : true},
    city :{type : String, required : true},
    coords : {
        lat: { type : Number, required : true },
        lng : { type : Number, required : true },
    },

    feeTier1: {type : Number, default : 100}, // 0-5 km
    feeTier2: {type : Number, default : 200}, // 5-20 km
    feeTier3: {type : Number, default : 400}, // 20-50 km
    feeTier4: {type : Number, default : 800}, // >50 km
});

const deliveryModel = mongoose.models.delivery || mongoose.model("delivery", deliverySchema);

export default deliveryModel;