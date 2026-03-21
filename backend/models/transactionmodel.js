import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({

    paymentId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'payment',
    },

    provider : String,

    rawResponse : Object,

    createdAt : {
        type : Date,
        default : Date.now
    }
});

const transactionModel = mongoose.models.transaction || mongoose.model("transaction", transactionSchema);

export default transactionModel;