import mongoose from "mongoose";

const promoSchema = new mongoose.Schema({
    code : {type : String, required : true, unique : true },
    discountType : { type : String, default : "free_delivery" },
    amount : { type : Number, default : 0 },
    usedBy : [{type : mongoose.Schema.Types.ObjectId,ref : "user"}],
    expiresAt : { type : Date, required : true },
    isActive : { type : Boolean, default : true }
});

const promoModel = mongoose.models.promo || mongoose.model("promo", promoSchema);

export default promoModel;