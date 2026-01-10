import { calculateDeliveryFee } from "../haversine.js";
import foodModel from "../models/foodModel.js";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import axios from "axios";
import mongoose from "mongoose";

// GET ALL ORDERS
export const getOrders = async (req, res) => {
    try {
        const orders = await orderModel.find().sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error fetching orders" });
    }
};


// GET ORDER STATISTICS
export const getOrderStats = async (req, res) => {
    try {
        const orders = await orderModel.find();

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Count orders by status
        const statusCounts = orders.reduce((acc, order) => {
            const status = order.orderStatus || 'pending';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        // Get recent orders (last 10)
        const recentOrders = orders
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10)
            .map(order => ({
                _id: order._id,
                name: order.name,
                amount: order.amount,
                orderStatus: order.orderStatus,
                createdAt: order.createdAt
            }));

        // Monthly revenue (simplified - last 12 months)
        const monthlyRevenue = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

            const monthOrders = orders.filter(order => {
                const orderDate = new Date(order.createdAt);
                return orderDate >= monthStart && orderDate <= monthEnd;
            });

            const monthRevenue = monthOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

            monthlyRevenue.push({
                month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                revenue: monthRevenue
            });
        }

        res.json({
            success: true,
            stats: {
                totalOrders,
                pendingOrders: statusCounts.pending || 0,
                confirmedOrders: statusCounts.confirmed || 0,
                preparingOrders: statusCounts.preparing || 0,
                outForDeliveryOrders: statusCounts.out_for_delivery || 0,
                deliveredOrders: statusCounts.delivered || 0,
                cancelledOrders: statusCounts.cancelled || 0,
                totalRevenue,
                averageOrderValue,
                recentOrders,
                monthlyRevenue
            }
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error fetching order statistics" });
    }
};



// PLACE ORDER → TRIGGER MPESA STK PUSH OR PAY AFTER DELIVERY
export const placeOrder = async (req, res) => {

    const { phone, amount, userId, deliveryAddress, deliveryInfo, notes, paymentMethod = 'M-Pesa' } = req.body;

    const user = await userModel.findById(userId);

    if (!user) {
        return res.status(400).json({
            success : false,
            message : "User not found"
        });
    }

    const orderPhone = phone || user.phone;

    if (!orderPhone) {
        return res.status(400).json({
            success : false,
            message : "Phone number is required"
        })
    }

    if ((amount === null || amount === undefined) || !userId) {
        return res.json({ success: false, message: "Amount and user ID are required" });
    }

    if (paymentMethod !== 'Pay after delivery' && !orderPhone) {
        return res.json({ success: false, message: "Phone number is required for M-Pesa payment" });
    }

    try {
        // validation user and cart
        const user = await userModel.findById(userId);

        if (!user || !user.cartData || Object.keys(user.cartData).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid cart data"
            });
        }

        // calculating total server side
        let totalAmount = 0;
        const orderItems = []; // FIXED: previously undefined

        for (const [foodId, quantity] of Object.entries(user.cartData)) {

            if (quantity <= 0) continue;

            if(!mongoose.Types.ObjectId.isValid(foodId)) {
                console.log("Invalid food ID:", foodId);
                continue;
            }

            const foodItem = await foodModel.findById(foodId);

            if (!foodItem) {
                console.log("Food item not found:", foodId);
                continue;
            }

            const subtotal = quantity * foodItem.price;
            totalAmount += subtotal;

            orderItems.push({
                id: foodItem._id,
                name: foodItem.name,
                quantity: quantity,
                price: foodItem.price,
                subtotal
            });
        }

        // add delivery fee
        const deliveryResult = await calculateDeliveryFee(deliveryInfo);
        const deliveryFee = Number(deliveryResult.fee || 0);

        if (isNaN(deliveryFee)) {
            return res.status(400).json({
                success : false,
                message : "Invalid delivery fee"
            })
        }

        totalAmount += deliveryFee;

        // generate unique order number
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;


        // create order record FIRST
        const newOrder = await orderModel.create({
            userId,
            orderNumber,
            name: user.name,
            email: user.email,
            phone,
            items: orderItems,
            amount: totalAmount - deliveryFee, // items total
            deliveryFee,
            totalAmount,
            paymentStatus: paymentMethod === 'Pay after delivery' ? 'pending' : 'pending',
            orderStatus: paymentMethod === 'Pay after delivery' ? 'confirmed' : 'pending',
            paymentMethod: paymentMethod,
            deliveryAddress,
            notes
        });

        // Handle different payment methods
        if (paymentMethod === 'Pay after delivery') {
            // For pay after delivery, return success immediately without payment processing
            res.json({
                success: true,
                message: "Order placed successfully. Pay after delivery.",
                data: {
                    orderId: newOrder._id,
                    orderNumber,
                    paymentMethod: 'Pay after delivery',
                    orderStatus: 'confirmed',
                    totalAmount
                }
            });
        } else {
            // --- MPESA STK PUSH ---
            const formattedPhone =
                phone.startsWith("254") ? phone : `254${phone.substring(1)}`;

            // Generate token
            const auth = Buffer.from(
                `${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`
            ).toString("base64");

            const tokenResponse = await axios.get(
                "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
                { headers: { Authorization: `Basic ${auth}` } }
            );

            const accessToken = tokenResponse.data.access_token;

            const timestamp = new Date()
                .toISOString()
                .replace(/[-:TZ.]/g, "")
                .slice(0, 14);

            const password = Buffer.from(
                process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
            ).toString("base64");

            const stkResponse = await axios.post(
                "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
                {
                    BusinessShortCode: process.env.MPESA_SHORTCODE,
                    Password: password,
                    Timestamp: timestamp,
                    TransactionType: "CustomerPayBillOnline",
                    Amount: totalAmount,          // FIXED: should be totalAmount
                    PartyA: formattedPhone,
                    PartyB: process.env.MPESA_SHORTCODE,
                    PhoneNumber: formattedPhone,
                    CallBackURL: process.env.CALLBACK_URL,
                    AccountReference: orderNumber,
                    TransactionDesc: "Payment for food order",
                },
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            // update order with Mpesa reference
            await orderModel.findByIdAndUpdate(
                {
                mpesaReference: stkCallback.CheckoutRequestID
                },
                {
                    paymentStatus : "paid",
                    orderStatus : "confirmed"
                });

            res.json({
                success: true,
                data: stkResponse.data,
                orderId: newOrder._id,
                orderNumber
            });
        }

    } catch (error) {
        console.log("Order placement error:", error.response?.data || error);
        res.status(500).json({
            success: false,
            message: "Error placing order"
        });
    }
};

// MPESA CALLBACK
export const mpesaCallback = async (req, res) => {
    // IMMEDIATELY ACKNOWLEDGE SAFARICOM
    res.json({ success: true });

    try {
        const stkCallback = req.body.Body.stkCallback;
        const resultCode = stkCallback.ResultCode;

        if (resultCode !== 0) {
            console.log("Payment failed:", resultCode);
            return;
        }

        const metadata = stkCallback.CallbackMetadata.Item;
        const amount = metadata.find(i => i.Name === "Amount")?.Value;
        const phone = metadata.find(i => i.Name === "PhoneNumber")?.Value;

        // Find user
        const user = await userModel.findOne({ phone });
        if (!user) {
            console.log("User not found for phone:", phone);
            return;
        }

        // Create new order
        const newOrder = await orderModel.create({
            userId: user._id,
            name: user.name,
            email: user.email,
            phone,
            items: user.cartData || {},
            amount,
            paymentStatus: "paid",
            paymentMethod: "M-Pesa",
        });

        // Clear cart
        user.cartData = {};
        await user.save();

        console.log("Order saved:", newOrder._id);
    } catch (error) {
        console.log("Callback error:", error);
    }
};

//Delete order (only for admin)
export const deleteOrder = async ( req, res) => {

    try {
        const { id } = req.params;

        const order = await orderModel.findById(id);

        if (!order) {
            return res.status(404).json({ 
                success : false,
                message : "Order not found"
            });
        }

        await orderModel.findByIdAndDelete(id);

        res.json({
            success : true,
            message : "Order deleted successfully"
        });
    } catch (error) {
        console.log("Delete order error:", error);
        res.status(500).json({
            success : false,
            message : "Error deleting order"
        })
        
    }
};
