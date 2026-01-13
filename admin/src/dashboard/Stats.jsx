import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import.meta.env.VITE_BACKEND_URL;

const Stats = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        totalOrders: 0,
        pendingOrders: 0,
        confirmedOrders: 0,
        preparingOrders: 0,
        outForDeliveryOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        totalRevenue: 0,
        totalItems: 0,
        averageOrderValue: 0,
        topSellingItems: [],
        recentOrders: [],
        monthlyRevenue: [],
        userGrowth: []
    });
    const [loading, setLoading] = useState(true);
    const url = import.meta.env.VITE_BACKEND_URL

    useEffect(() => {
        fetchStats();
    }, []);
const fetchStats = async () => {

    const token = localStorage.getItem("adminToken");

    if (!token) {
        // No token, redirect to login
        return toast.error("Not authorized .please login");
    }
    try {
        setLoading(true);
        const res = await axios.get(`${url}/api/stats`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (res.data.success) {
            const statsData = res.data.stats;

            setStats({
                totalUsers: statsData.totalUsers || 0,
                activeUsers: statsData.activeUsers || 0,
                inactiveUsers: statsData.inactiveUsers || 0,
                totalOrders: statsData.totalOrders || 0,
                pendingOrders: statsData.pendingOrders || 0,
                confirmedOrders: statsData.confirmedOrders || 0,
                preparingOrders: statsData.preparingOrders || 0,
                outForDeliveryOrders: statsData.outForDeliveryOrders || 0,
                deliveredOrders: statsData.deliveredOrders || 0,
                cancelledOrders: statsData.cancelledOrders || 0,
                totalRevenue: statsData.totalRevenue || 0,
                totalItems: statsData.totalItems || 0,
                averageOrderValue: statsData.averageOrderValue || 0,
                topSellingItems: statsData.topSellingItems || [],
                recentOrders: statsData.recentOrders || [],
                monthlyRevenue: statsData.monthlyRevenue || [],
                userGrowth: statsData.userGrowth || []
            });
        }
    } catch (error) {
        console.error("Error fetching stats:", error);
        toast.error("Failed to fetch statistics");
    } finally {
        setLoading(false);
    }
};


    const formatCurrency = (amount) => {
        return `Ksh ${amount.toLocaleString()}`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'confirmed': 'bg-blue-100 text-blue-800 border-blue-200',
            'preparing': 'bg-orange-100 text-orange-800 border-orange-200',
            'out_for_delivery': 'bg-purple-100 text-purple-800 border-purple-200',
            'delivered': 'bg-green-100 text-green-800 border-green-200',
            'cancelled': 'bg-red-100 text-red-800 border-red-200'
        };
        return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-4 text-lg">Loading Statistics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6 space-y-8">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">📊 Dashboard Statistics</h1>
                <p className="text-gray-600 text-lg">Comprehensive overview of your business performance</p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Users Stats */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                            <p className="text-sm text-gray-500">Total Users</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-green-600">Active</span>
                            <span className="font-semibold">{stats.activeUsers}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-red-600">Inactive</span>
                            <span className="font-semibold">{stats.inactiveUsers}</span>
                        </div>
                    </div>
                </div>

                {/* Orders Stats */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 rounded-xl">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                            <p className="text-sm text-gray-500">Total Orders</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-green-600">Delivered</span>
                            <span className="font-semibold">{stats.deliveredOrders}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-yellow-600">Pending</span>
                            <span className="font-semibold">{stats.pendingOrders}</span>
                        </div>
                    </div>
                </div>

                {/* Revenue Stats */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-100 rounded-xl">
                            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                            <p className="text-sm text-gray-500">Total Revenue</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-blue-600">Avg Order</span>
                            <span className="font-semibold">{formatCurrency(stats.averageOrderValue)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">This Month</span>
                            <span className="font-semibold">{formatCurrency(stats.monthlyRevenue[0]?.revenue || 0)}</span>
                        </div>
                    </div>
                </div>

                {/* Items Stats */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-100 rounded-xl">
                            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
                            <p className="text-sm text-gray-500">Total Items</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-green-600">Available</span>
                            <span className="font-semibold">{stats.totalItems}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-purple-600">Categories</span>
                            <span className="font-semibold">12</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Order Status Breakdown */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Order Status Breakdown
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                        { label: 'Pending', count: stats.pendingOrders, color: 'bg-yellow-500', icon: '⏳' },
                        { label: 'Confirmed', count: stats.confirmedOrders, color: 'bg-blue-500', icon: '✅' },
                        { label: 'Preparing', count: stats.preparingOrders, color: 'bg-orange-500', icon: '👨‍🍳' },
                        { label: 'Out for Delivery', count: stats.outForDeliveryOrders, color: 'bg-purple-500', icon: '🚚' },
                        { label: 'Delivered', count: stats.deliveredOrders, color: 'bg-green-500', icon: '📦' },
                        { label: 'Cancelled', count: stats.cancelledOrders, color: 'bg-red-300', icon: '❌' }
                    ].map((status, index) => (
                        <div key={index} className="text-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                            <div className={`w-12 h-12 ${status.color} rounded-full flex items-center justify-center mx-auto mb-3 text-white text-xl`}>
                                {status.icon}
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{status.count}</p>
                            <p className="text-sm text-gray-600">{status.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Selling Items */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        Top Selling Items
                    </h2>
                    <div className="space-y-4">
                        {stats.topSellingItems.slice(0, 5).map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{item.name}</p>
                                        <p className="text-sm text-gray-600">{item.category}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-green-600">{item.sales} sold</p>
                                    <p className="text-sm text-gray-600">{formatCurrency(item.revenue)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Orders */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Recent Orders
                    </h2>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {stats.recentOrders.slice(0, 8).map((order, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                        {order.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{order.name}</p>
                                        <p className="text-sm text-gray-600">{formatDate(order.createdAt)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-green-600">{formatCurrency(order.amount)}</p>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.orderStatus)}`}>
                                        {order.orderStatus?.replace('_', ' ').toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Monthly Revenue Chart Placeholder */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Revenue Trends
                </h2>
                <div className="h-64 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="text-gray-600 text-lg">Interactive Chart Coming Soon</p>
                        <p className="text-gray-500 text-sm">Monthly revenue visualization</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Stats;
