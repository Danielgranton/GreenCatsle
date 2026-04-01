import mongoose from "mongoose";

	const orderSchema = new mongoose.Schema({

		orderNumber : {
			type: String,
			required: true,
			unique: true,
			default: () => `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`
		},

	    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
	    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "business", required: true },
	    items: [
	        {
	            menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "menu" },
	            name: String,
	            price: Number,
	            quantity: Number
	        }
	    ],
	    services: [
	        {
	            serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "service" },
	            name: String,
	            price: Number,
	            quantity: Number
	        }
	    ],
    totalAmount: { type: Number, required: true },
    status: {
        type: String,
        enum: ["pending", "preparing", "onDelivery", "completed", "cancelled"],
        default: "pending"
    },
	    deliveryAddress: { type: String, required: true },
      contactPhone: { type: String, default: "" },
      note: { type: String, default: "" },
	    deliveryCoordinates: {
	        type: { type: String, enum: ["Point"], default: "Point" },
	        coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
	    },
    assignedWorkerId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    expectedCompletedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    deliveryFee: { type: Number, default: 0 },
    deliveryDistanceKm: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

// Index for geo queries
orderSchema.index({ deliveryCoordinates: "2dsphere" });

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;
