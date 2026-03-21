import mongoose  from "mongoose";

const serviceSchema =  new mongoose.Schema({

    businessId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'business',
        required : true
    },

    name : String,

    price : Number,

    description : String,

    image: {
        key: { type: String, default: null },
        provider: { type: String, enum: ["local", "s3"], default: "local" }
    },

    availability : {
        type : String,
        enum : ['available', 'unavailable'],
        default : 'available'
    }
});

const serviceModel = mongoose.models.serviceModel || mongoose.model("service", serviceSchema);

export default serviceModel;
