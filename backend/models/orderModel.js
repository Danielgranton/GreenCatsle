import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    orderNumber: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    items: [{
        id: { type: String, required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        subtotal: { type: Number, required: true }
    }],
    amount: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    orderStatus: { 
        type: String, 
        enum: ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'], 
        default: 'pending' 
    },

    paymentMethod: { type: String, enum: ['M-Pesa', 'Pay after delivery'], required: true },
    mpesaReference: { type: String },
    deliveryAddress: {
        street: String,
        city: String,
        county: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    estimatedDeliveryTime: { type: Date },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now() },
    updatedAt: { type: Date, default: Date.now() }
});

const orderModel = mongoose.models.order || mongoose.model("order", orderSchema);

export default orderModel;