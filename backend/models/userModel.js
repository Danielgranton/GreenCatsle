import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name : {
        type : String,
         required: true
        },
    email : {
        type : String,
         required: true,
          unique: true
        },
    password : {
        type : String,
         required: true
        },
    cartData: {
        type:Object,
        default:{}
    },

    cartBusinessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "business",
        default: null
    },

    cart: {
        type: [
            {
                kind: { type: String, enum: ["food", "menu", "service"], required: true },
                refId: { type: mongoose.Schema.Types.ObjectId, required: true },
                businessId: { type: mongoose.Schema.Types.ObjectId, ref: "business", default: null },
                quantity: { type: Number, default: 1 },
                name: { type: String, default: "" },
                price: { type: Number, default: 0 },
                imageKey: { type: String, default: null },
                meta: { type: Object, default: {} }
            }
        ],
        default: []
    },
    status: {
        type: String,
        enum: ['active', 'inactive' , 'busy', 'available'],
        default: 'active'
    },
    lastLogin: {
        type: Date,
        default: null
    },

    phone : {
        type : String,
    },

    avatar: {
        key: { type: String, default: null },
        provider: { type: String, enum: ["local", "s3"], default: "local" }
    },

    tokenVersion: {
        type: Number,
        default: 0
    },

    notificationPrefs: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: false }
    },

    businessId : {
        type : mongoose.Schema.Types.ObjectId,
        ref: 'business',
        default: null
    },

    role: {
        type: String,
        enum: ['superadmin', 'admin', 'worker','user'],
        default: 'user'
    },
    

}, {minimize: false});

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;
