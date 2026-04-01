import Order from "../models/orderModel.js";
import Business from "../models/businessModel.js";
import OrderEvent from "../models/orderEventModel.js";
import { getIO } from "../realtime/io.js";
import { createNotification } from "../services/notificationService.js";

//place a new order
const placeOrder = async (req, res) => {
    try {
        const { businessId, items, services, deliveryAddress, deliveryCoordinates, totalAmount, expectedCompletionMinutes, contactPhone, note, deliveryFee, deliveryDistanceKm, orderNumber } = req.body;

        const business = await Business.findById(businessId);

        if(!business) {
            return res.status(404).json({
                success : false,
                message : "Business not found"
            })
        }

        const generateOrderNumber = () => {
            return `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        }


        const newOrder = new Order({
            userId : req.user.id,
            businessId,
            items,
            services,
            deliveryAddress,
            deliveryCoordinates,
            totalAmount,
            paymentStatus: "pending",
            orderNumber: typeof orderNumber === "string" ? orderNumber : generateOrderNumber(),
            contactPhone: typeof contactPhone === "string" ? contactPhone : "",
            note: typeof note === "string" ? note : "",
            deliveryFee: Number.isFinite(Number(deliveryFee)) ? Number(deliveryFee) : 0,
            deliveryDistanceKm: Number.isFinite(Number(deliveryDistanceKm)) ? Number(deliveryDistanceKm) : 0,
            expectedCompletedAt:
              Number.isFinite(Number(expectedCompletionMinutes)) && Number(expectedCompletionMinutes) > 0
                ? new Date(Date.now() + Number(expectedCompletionMinutes) * 60 * 1000)
                : null,
        })


        const savedOrder = await newOrder.save();

        // Notify business owner and client.
        await createNotification({
          recipientUserId: business.ownerId,
          type: "order_placed",
          title: "New order",
          message: `New order received: ${savedOrder._id}`,
          data: { orderId: String(savedOrder._id) },
        });
        
        await createNotification({
          recipientUserId: req.user.id,
          type: "order_placed",
          title: "Order placed",
          message: `Your order was placed successfully: ${savedOrder._id}`,
          data: { orderId: String(savedOrder._id) },
        });


        res.status(201).json({
            success : true,
            message : "Order placed successfully",
            order : savedOrder
        })
    } catch (error) {
         console.log(error);
         res.status(500).json({
            success : false,
            message : "Error placing order"
         })
    }
};

//update order status (for kitchen /delivery)
const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, assignedWorkerId } = req.body;

        const order = await Order.findById(orderId);

        if(!order) {
            return res.status(404).json({
                success : false,
                message : "Order not found"
            })
        }

        // only business owner / assigned worker / superadmin can update order
        const business = await Business.findById(order.businessId);

        const isSuperadmin = req.user?.role === "superadmin";
        const isOwner = req.user?._id && business?.ownerId && req.user._id.equals(business.ownerId);
        const isAssignedWorker =
          req.user?.role === "worker" &&
          order.assignedWorkerId &&
          req.user?._id &&
          req.user._id.equals(order.assignedWorkerId);

        if (!isSuperadmin && !isOwner && !isAssignedWorker) {
          return res.status(403).json({
            success: false,
            message: "Access denied",
          });
        }

        const fromStatus = order.status;
        order.status = status;
        if (assignedWorkerId && (isSuperadmin || isOwner)) order.assignedWorkerId = assignedWorkerId;

        if (status === "completed" && !order.completedAt) {
          order.completedAt = new Date();
        }
        await order.save();

        await OrderEvent.create({
          orderId: order._id,
          actorUserId: req.user?._id || null,
          type: "status_change",
          fromStatus,
          toStatus: status,
          meta: { assignedWorkerId: assignedWorkerId || null },
        });

        const io = getIO();
        if (io) {
          io.to(String(order._id)).emit("orderStatusUpdated", {
            orderId: String(order._id),
            fromStatus,
            toStatus: status,
            assignedWorkerId: assignedWorkerId || null,
            at: new Date().toISOString(),
          });
        }

        // Notify the client about status changes.
        await createNotification({
          recipientUserId: order.userId,
          type: "order_status",
          title: "Order update",
          message: `Order ${order._id} status: ${fromStatus} -> ${status}`,
          data: { orderId: String(order._id), fromStatus, toStatus: status },
        });

        res.status(200).json({
            success : true,
            message : "Order status updated successfully",
            order
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success : false,
            message : "Error updating order status"
        })
    }
}

//get order for a user
const getUserOrders = async (req, res) => {
    try {
        const orders = await Order.find({
            userId : req.user.id 
        })
        .populate("businessId", "name address ")
        .populate("items.menuItemId", "name price")
        .populate("services.serviceId", "name price")
        .sort({ createdAt : -1});

        res.status(200).json({
            success : true,
            orders
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success : false,
            message : "Error fetching user orders"
        })
    }
};

//get order for a business
const getBusinessOrders = async (req, res) => {
    try {
        const orders =await Order.find({
            businessId: req.params.businessId 
        })
        .populate("userId", "name email phone")
        .populate("assignedWorkerId", "name email")
        .sort({ createdAt : -1});

        res.status(200).json({
            success : true,
            orders
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success : false,
            message : "Error fetching business orders"
        })
    }
}

export {
    placeOrder,
    updateOrderStatus,
    getUserOrders,
    getBusinessOrders
}
