import Wallet from "../models/walletModel.js";
import WalletTx from "../models/walletTransactionModel.js";
import Payment from "../models/paymentModel.js";
import Order from "../models/orderModel.js";
import Business from "../models/businessModel.js";
import userModel from "../models/userModel.js";
import PayoutRequest from "../models/payoutRequestModel.js";
import OrderEvent from "../models/orderEventModel.js";
import Complaint from "../models/complaintModel.js";
import Review from "../models/reviewModel.js";
import WebhookEvent from "../models/webhookEventModel.js";
import Advert from "../models/advertModel.js";

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
};

const dateRange = (req) => {
  const to = parseDate(req.query?.to) || new Date();
  const from = parseDate(req.query?.from) || new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
};

const systemWalletId = async () => {
  const w = await Wallet.findOne({ ownerType: "system" }).select("_id availableBalance pendingBalance currency");
  return w || null;
};

const aggregateTimeSeries = async ({ match, unit }) => {
  return await WalletTx.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateTrunc: { date: "$createdAt", unit } },
        amount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        bucket: "$_id",
        amount: 1,
        count: 1,
      },
    },
  ]);
};

export const getPlatformStats = async (req, res) => {
  try {
    const { from, to } = dateRange(req);
    const systemWallet = await systemWalletId();
    if (!systemWallet) {
      return res.status(200).json({
        success: true,
        range: { from, to },
        gmv: { total: 0, daily: [], weekly: [], monthly: [] },
        revenue: { commissionTotal: 0, grossTotal: 0, payoutTotal: 0, byMethod: [] },
        payouts: { requested: 0, approved: 0, rejected: 0, outstandingLiability: 0, totalPaidOut: 0 },
        orders: { byStatus: [] },
        businesses: { new: 0, active: 0, topBySales: [] },
        users: { new: 0, activeLast24h: 0, repeatCustomers: 0 },
        deliveryOps: { averageCompletionSeconds: null, lateCount: null, driverAvailability: null },
        paymentHealth: { successByMethod: [], stuckPendingCount: 0 },
        systemWallet: { wallet: null, reconciliation: null, anomalies: [] },
      });
    }

    const baseMatch = {
      walletId: systemWallet._id,
      createdAt: { $gte: from, $lte: to },
    };

    // GMV is gross_in credits into system wallet.
    const grossMatch = { ...baseMatch, kind: "payment_gross_in", direction: "credit" };
    const gmvAgg = await WalletTx.aggregate([
      { $match: grossMatch },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);
    const gmvTotal = gmvAgg[0]?.total || 0;

    const gmvDaily = await aggregateTimeSeries({ match: grossMatch, unit: "day" });
    const gmvWeekly = await aggregateTimeSeries({ match: grossMatch, unit: "week" });
    const gmvMonthly = await aggregateTimeSeries({ match: grossMatch, unit: "month" });

    // Platform revenue (commission) = gross_in - payout_out (both in system wallet).
    const payoutOutMatch = { ...baseMatch, kind: "business_payout", direction: "debit" };
    const payoutAgg = await WalletTx.aggregate([
      { $match: payoutOutMatch },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const payoutTotal = payoutAgg[0]?.total || 0;
    const commissionTotal = Math.max(0, gmvTotal - payoutTotal);

    const revenueByMethod = await WalletTx.aggregate([
      { $match: grossMatch },
      {
        $group: {
          _id: { $ifNull: ["$meta.method", "unknown"] },
          gross: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { gross: -1 } },
      { $project: { _id: 0, method: "$_id", gross: 1, count: 1 } },
    ]);

    // Payout requests (business withdrawal) stats
    const payoutRequests = await PayoutRequest.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
        },
      },
    ]);
    const prMap = new Map(payoutRequests.map((r) => [r._id, r]));
    const outstandingLiability = prMap.get("pending")?.amount || 0;
    const totalPaidOut = prMap.get("approved")?.amount || 0;

    // Orders (not wallet-backed; status lives on Order documents)
    const ordersByStatus = await Order.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ]);

    // Businesses
    const newBusinesses = await Business.countDocuments({ createdAt: { $gte: from, $lte: to } });
    const activeBusinessesAgg = await WalletTx.aggregate([
      {
        $match: {
          kind: "business_payout_in",
          direction: "credit",
          createdAt: { $gte: from, $lte: to },
        },
      },
      { $group: { _id: "$businessId" } },
      { $count: "count" },
    ]);
    const activeBusinesses = activeBusinessesAgg[0]?.count || 0;
    const topBusinesses = await WalletTx.aggregate([
      {
        $match: {
          kind: "business_payout_in",
          direction: "credit",
          createdAt: { $gte: from, $lte: to },
        },
      },
      { $group: { _id: "$businessId", sales: { $sum: "$amount" } } },
      { $sort: { sales: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "businesses",
          localField: "_id",
          foreignField: "_id",
          as: "business",
        },
      },
      { $unwind: { path: "$business", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          businessId: "$_id",
          sales: 1,
          businessName: "$business.name",
          category: "$business.category",
        },
      },
    ]);

    // Users
    const newUsers = await userModel.countDocuments({ createdAt: { $gte: from, $lte: to } });
    const activeLast24h = await userModel.countDocuments({
      lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    const repeatCustomersAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: "$userId", orders: { $sum: 1 } } },
      { $match: { orders: { $gte: 2 } } },
      { $count: "count" },
    ]);
    const repeatCustomers = repeatCustomersAgg[0]?.count || 0;

    // Delivery ops: completion time from order events (createdAt -> completed event)
    const completionAgg = await OrderEvent.aggregate([
      { $match: { type: "status_change", toStatus: "completed", createdAt: { $gte: from, $lte: to } } },
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "order",
        },
      },
      { $unwind: { path: "$order", preserveNullAndEmptyArrays: false } },
      {
        $project: {
          durationSeconds: {
            $divide: [{ $subtract: ["$createdAt", "$order.createdAt"] }, 1000],
          },
        },
      },
      { $group: { _id: null, avgSeconds: { $avg: "$durationSeconds" }, count: { $sum: 1 } } },
    ]);
    const averageCompletionSeconds = completionAgg[0]?.avgSeconds ?? null;

    const lateCount = await Order.countDocuments({
      expectedCompletedAt: { $ne: null },
      completedAt: { $ne: null },
      createdAt: { $gte: from, $lte: to },
      $expr: { $gt: ["$completedAt", "$expectedCompletedAt"] },
    });

    // Driver availability (simple): count workers by status.
    const driverAvailability = await userModel.aggregate([
      { $match: { role: "worker" } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ]);

    // Payment health
    const successByMethod = await Payment.aggregate([
      { $match: { status: "successful", createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: "$method", count: { $sum: 1 }, amount: { $sum: "$amount" } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, method: "$_id", count: 1, amount: 1 } },
    ]);
    const stuckPendingCount = await Payment.countDocuments({
      status: "pending",
      createdAt: { $lte: new Date(Date.now() - 30 * 60 * 1000) },
    });

    const refundCount = await Payment.countDocuments({
      status: "refunded",
      createdAt: { $gte: from, $lte: to },
    });
    const successfulCount = await Payment.countDocuments({
      status: "successful",
      createdAt: { $gte: from, $lte: to },
    });
    const refundRate = successfulCount ? refundCount / successfulCount : 0;

    const complaintCount = await Complaint.countDocuments({
      createdAt: { $gte: from, $lte: to },
    });
    const disputeRate = ordersByStatus.reduce((s, x) => s + x.count, 0)
      ? complaintCount / ordersByStatus.reduce((s, x) => s + x.count, 0)
      : 0;

    const webhookFailures = await WebhookEvent.aggregate([
      { $match: { status: "failed", createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: { provider: "$provider", eventType: "$eventType" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
      { $project: { _id: 0, provider: "$_id.provider", eventType: "$_id.eventType", count: 1 } },
    ]);

    // Wallet reconciliation (ledger vs cached balance)
    const ledgerAgg = await WalletTx.aggregate([
      { $match: { walletId: systemWallet._id, status: "posted" } },
      {
        $group: {
          _id: null,
          credits: { $sum: { $cond: [{ $eq: ["$direction", "credit"] }, "$amount", 0] } },
          debits: { $sum: { $cond: [{ $eq: ["$direction", "debit"] }, "$amount", 0] } },
        },
      },
    ]);
    const ledgerCredits = ledgerAgg[0]?.credits || 0;
    const ledgerDebits = ledgerAgg[0]?.debits || 0;
    const computedLedgerBalance = Math.round((ledgerCredits - ledgerDebits) * 100) / 100;
    const storedBalance = systemWallet.availableBalance || 0;
    const reconciliation = {
      computedLedgerBalance,
      storedBalance,
      delta: Math.round((storedBalance - computedLedgerBalance) * 100) / 100,
    };

    // Anomalies: gross_in without payout_out
    const anomalies = await WalletTx.aggregate([
      { $match: { ...grossMatch, paymentId: { $ne: null } } },
      {
        $group: {
          _id: "$paymentId",
          gross: { $sum: "$amount" },
          createdAt: { $min: "$createdAt" },
          orderId: { $first: "$orderId" },
          businessId: { $first: "$businessId" },
          method: { $first: "$meta.method" },
        },
      },
      {
        $lookup: {
          from: "wallettransactions",
          let: { pid: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$paymentId", "$$pid"] }, { $eq: ["$kind", "business_payout"] }] } } },
            { $project: { _id: 1 } },
          ],
          as: "payoutOut",
        },
      },
      { $match: { payoutOut: { $eq: [] } } },
      { $sort: { createdAt: -1 } },
      { $limit: 20 },
      {
        $project: {
          _id: 0,
          paymentId: "$_id",
          orderId: 1,
          businessId: 1,
          gross: 1,
          method: 1,
          createdAt: 1,
          problem: { $literal: "gross_in_without_payout_out" },
        },
      },
    ]);

    const advertRevenueAgg = await WalletTx.aggregate([
      { $match: { kind: "ad_fee_in", direction: "credit", createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);
    const advertRevenue = {
      total: advertRevenueAgg[0]?.total || 0,
      count: advertRevenueAgg[0]?.count || 0,
      activeAdverts: await Advert.countDocuments({ status: "active" }),
    };

    res.status(200).json({
      success: true,
      range: { from, to },
      gmv: { total: gmvTotal, daily: gmvDaily, weekly: gmvWeekly, monthly: gmvMonthly },
      revenue: {
        commissionTotal,
        grossTotal: gmvTotal,
        payoutTotal,
        byMethod: revenueByMethod,
      },
      payouts: {
        requested: prMap.get("pending")?.count || 0,
        approved: prMap.get("approved")?.count || 0,
        rejected: prMap.get("rejected")?.count || 0,
        outstandingLiability,
        totalPaidOut,
      },
      orders: { byStatus: ordersByStatus },
      businesses: { new: newBusinesses, active: activeBusinesses, topBySales: topBusinesses },
      users: { new: newUsers, activeLast24h, repeatCustomers },
      deliveryOps: { averageCompletionSeconds, lateCount, driverAvailability },
      paymentHealth: { successByMethod, stuckPendingCount, refundCount, refundRate, webhookFailures, complaintCount, disputeRate },
      marketing: { advertRevenue },
      systemWallet: { wallet: systemWallet, reconciliation, anomalies },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to build platform stats" });
  }
};

export const getMyBusinessStats = async (req, res) => {
  try {
    const { from, to } = dateRange(req);
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(404).json({ success: false, message: "No business linked to this account" });
    }

    const wallet = await Wallet.findOne({ ownerType: "business", businessId });

    // Revenue is based on wallet ledger payouts in.
    const revenueMatch = {
      kind: "business_payout_in",
      direction: "credit",
      businessId,
      createdAt: { $gte: from, $lte: to },
    };
    const revenueAgg = await WalletTx.aggregate([
      { $match: revenueMatch },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);
    const revenueTotal = revenueAgg[0]?.total || 0;
    const paymentCount = revenueAgg[0]?.count || 0;

    const dailyRevenue = await aggregateTimeSeries({ match: revenueMatch, unit: "day" });
    const peakHours = await WalletTx.aggregate([
      { $match: revenueMatch },
      { $group: { _id: { $hour: "$createdAt" }, amount: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { amount: -1 } },
      { $project: { _id: 0, hour: "$_id", amount: 1, count: 1 } },
    ]);
    const peakDays = await WalletTx.aggregate([
      { $match: revenueMatch },
      { $group: { _id: { $dayOfWeek: "$createdAt" }, amount: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { amount: -1 } },
      { $project: { _id: 0, dayOfWeek: "$_id", amount: 1, count: 1 } },
    ]);

    // Order count/AOV from distinct orders tied to payouts-in.
    const distinctOrdersAgg = await WalletTx.aggregate([
      { $match: { ...revenueMatch, orderId: { $ne: null } } },
      { $group: { _id: "$orderId" } },
      { $count: "count" },
    ]);
    const orderCount = distinctOrdersAgg[0]?.count || 0;
    const averageOrderValue = orderCount ? revenueTotal / orderCount : 0;

    // Commission paid: sum of commission for payments for this business from system wallet (gross_in - payout_out per payment).
    const commissionAgg = await WalletTx.aggregate([
      {
        $match: {
          kind: "payment_gross_in",
          direction: "credit",
          businessId,
          paymentId: { $ne: null },
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $lookup: {
          from: "wallettransactions",
          let: { pid: "$paymentId" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$paymentId", "$$pid"] }, { $eq: ["$kind", "business_payout"] }] } } },
            { $group: { _id: null, payoutOut: { $sum: "$amount" } } },
          ],
          as: "payoutOut",
        },
      },
      { $unwind: { path: "$payoutOut", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          gross: "$amount",
          payoutOut: { $ifNull: ["$payoutOut.payoutOut", 0] },
        },
      },
      { $group: { _id: null, commission: { $sum: { $subtract: ["$gross", "$payoutOut"] } } } },
    ]);
    const commissionPaid = commissionAgg[0]?.commission || 0;

    // Payouts
    const payoutSummary = await PayoutRequest.aggregate([
      { $match: { businessId, createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } },
    ]);

    const complaintsSummary = await Complaint.aggregate([
      { $match: { businessId, createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ]);

    const ratingAgg = await Review.aggregate([
      { $match: { businessId, createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    const averageRating = ratingAgg[0]?.avg ?? null;
    const ratingCount = ratingAgg[0]?.count ?? 0;

    // Menu/services performance: derived from orders (wallet tx doesn't include line items).
    const topItems = await Order.aggregate([
      { $match: { businessId, createdAt: { $gte: from, $lte: to } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          quantity: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, name: "$_id", quantity: 1, revenue: 1 } },
    ]);
    const topServices = await Order.aggregate([
      { $match: { businessId, createdAt: { $gte: from, $lte: to } } },
      { $unwind: "$services" },
      {
        $group: {
          _id: "$services.name",
          quantity: { $sum: "$services.quantity" },
          revenue: { $sum: { $multiply: ["$services.price", "$services.quantity"] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, name: "$_id", quantity: 1, revenue: 1 } },
    ]);

    // Customer repeat rate
    const repeatCustomersAgg = await Order.aggregate([
      { $match: { businessId, createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: "$userId", orders: { $sum: 1 } } },
      { $match: { orders: { $gte: 2 } } },
      { $count: "count" },
    ]);
    const repeatCustomers = repeatCustomersAgg[0]?.count || 0;

    // Staff metrics (simple): order events by actor (worker/admin)
    const staffActivity = await OrderEvent.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to }, actorUserId: { $ne: null } } },
      {
        $lookup: {
          from: "users",
          localField: "actorUserId",
          foreignField: "_id",
          as: "actor",
        },
      },
      { $unwind: { path: "$actor", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          "actor.businessId": businessId,
        },
      },
      { $group: { _id: "$actorUserId", count: { $sum: 1 }, name: { $first: "$actor.name" }, role: { $first: "$actor.role" } } },
      { $sort: { count: -1 } },
      { $limit: 25 },
      { $project: { _id: 0, userId: "$_id", name: 1, role: 1, events: "$count" } },
    ]);

    res.status(200).json({
      success: true,
      range: { from, to },
      sales: {
        revenueTotal,
        orderCount,
        averageOrderValue,
        dailyRevenue,
        peakHours,
        peakDays,
      },
      menuPerformance: { topItems, lowPerformers: [] },
      servicesPerformance: { topServices, occupancy: null },
      deliveryPerformance: { averagePrepSeconds: null, averageDeliverySeconds: null, cancellationReasons: [] },
      customers: { repeatCustomers, complaints: complaintsSummary, averageRating, ratingCount },
      staff: { activity: staffActivity, driverAcceptanceRate: null },
      wallet: {
        wallet,
        paymentCount,
        commissionPaid,
        payouts: payoutSummary,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to build business stats" });
  }
};
