import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
import Food from "../models/foodModel.js";

export const getStats = async (req, res) => {
  try {
    // USERS
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = totalUsers - activeUsers;

    // ORDERS
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ orderStatus: "pending" });
    const confirmedOrders = await Order.countDocuments({ orderStatus: "confirmed" });
    const preparingOrders = await Order.countDocuments({ orderStatus: "preparing" });
    const outForDeliveryOrders = await Order.countDocuments({ orderStatus: "out_for_delivery" });
    const deliveredOrders = await Order.countDocuments({ orderStatus: "delivered" });
    const cancelledOrders = await Order.countDocuments({ orderStatus: "cancelled" });

    // REVENUE
    const orders = await Order.find({ orderStatus: "delivered" });
    const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);
    const averageOrderValue = orders.length ? totalRevenue / orders.length : 0;

    // ITEMS
    const totalItems = await Food.countDocuments();

    // RECENT ORDERS
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .select("name amount orderStatus createdAt");

    // TOP SELLING ITEMS
    const topSellingItems = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.foodId",
          sales: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.totalPrice" }
        }
      },
      { $sort: { sales: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "foods",
          localField: "_id",
          foreignField: "_id",
          as: "food"
        }
      },
      { $unwind: "$food" },
      {
        $project: {
          name: "$food.name",
          category: "$food.category",
          sales: 1,
          revenue: 1
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        totalOrders,
        pendingOrders,
        confirmedOrders,
        preparingOrders,
        outForDeliveryOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue,
        averageOrderValue,
        totalItems,
        topSellingItems,
        recentOrders,
        monthlyRevenue: [], // you can add later
        userGrowth: []      // you can add later
      }
    });

  } catch (error) {
    console.error("STATS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load statistics"
    });
  }
};
