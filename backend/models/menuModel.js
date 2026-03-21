import mongoose from "mongoose";

const menuSchema = new mongoose.Schema({

    businessId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'business',
        required : true
    },

    menuType: {
        type: String,
        enum: ["cooked", "noncooked"],
        default: "cooked"
    },

    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "menuCategory",
        default: null
    },

    subcategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "menuSubcategory",
        default: null
    },
    name : {
        type : String, 
    },

    // Legacy / free-form category string (kept for backward compatibility).
    category : { type : String, default: "" },

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
})

const menuModel =mongoose.models.menuModel || mongoose.model("menu", menuSchema);

export default menuModel;
