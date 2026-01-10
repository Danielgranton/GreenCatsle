import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {jwtDecode} from "jwt-decode";

const Order = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const url = "http://localhost:4000";

    // Fetch orders
    const token = localStorage.getItem("adminToken");

    useEffect(() => {
        if(!token) {
            toast.error("Not authorized .please login");
            navigate("/admin");
            return;
        }


        try {
            const decoded = jwtDecode(token);
            console.log(decoded);
            if (decoded.role !== "admin" || (decoded.exp && decoded.exp * 1000 < Date.now())) {
                localStorage.removeItem("adminToken");
                toast.error("Not authorized .please login");
                navigate("/admin");
                return;
            }

        } catch (error) {
            localStorage.removeItem("adminToken");
            toast.error("Not authorized .please login");
            navigate("/admin");
            return;
        }

        fetchOrders();
        
    }, [token, navigate]); 

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${url}/api/orders/get`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setOrders(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching orders:", error);
            toast.error("Failed to fetch orders");
        } finally {
            setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            // Note: You'll need to implement this endpoint in your backend
            await axios.put(`${url}/api/orders/${orderId}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(orders.map(order =>
                order._id === orderId ? { ...order, orderStatus: newStatus } : order
            ));
            toast.success("Order status updated");
        } catch (error) {
            console.error("Error updating order status:", error);
            toast.error("Failed to update order status");
        }
    };

    const deleteOrder = async (orderId) => {

        const token =  localStorage.getItem("adminToken")

            if(!token) {
                toast.error("Not authorized");
                return;
            }

        try {
            
            const response = await axios.delete(`http://localhost:4000/api/orders/${orderId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                toast.success("Order deleted successfully");
                setOrders(prev => prev.filter(o => o._id !== orderId));
            } else {
                toast.error("Failed to delete order");
            }


        } catch (error) {
            console.error("Error deleting order:", error);
            toast.error("Failed to delete order");
        }
    }

    const getStatusColor = (status) => {
        const colors = {
            'pending': 'bg-yellow-100 text-yellow-800',
            'confirmed': 'bg-blue-100 text-blue-800',
            'preparing': 'bg-orange-100 text-orange-800',
            'out_for_delivery': 'bg-purple-100 text-purple-800',
            'delivered': 'bg-green-100 text-green-800',
            'cancelled': 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const formatCurrency = (amount) => {
        return `Ksh ${amount.toLocaleString()}`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredOrders = orders.filter(order => statusFilter === 'all' || order.orderStatus === statusFilter);

    return (
        <div className="p-4 md:p-6  min-h-screen rounded-xl ">
            {/* Header */}
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 text-center">Order Management</h1>
                <p className="text-yellow-500 font-bold ">Manage and track all customer orders</p>
            </div>

            {/* Stats Cards - Grid on mobile, Flex on large screens */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-wrap lg:gap-6 gap-4 mb-6 md:mb-8">
                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 w-full lg:w-[calc(25%-1.6rem)]">
                    <div className="flex items-center justify-between">
                        <div className="p-2 md:p-3 rounded-full bg-blue-100">
                            <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <div className="ml-3 md:ml-4">
                            <p className="text-xs md:text-sm font-medium text-gray-600">Total Orders</p>
                            <p className="text-lg md:text-2xl font-bold text-gray-900 text-center">{orders.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 w-full lg:w-[calc(25%-1.5rem)]">
                    <div className="flex items-center justify-between">
                        <div className="p-2 md:p-3 rounded-full bg-yellow-100">
                            <svg className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="ml-3 md:ml-4">
                            <p className="text-xs md:text-sm font-medium text-gray-600">Pending</p>
                            <p className="text-lg md:text-2xl font-bold text-gray-900 text-center">
                                {orders.filter(o => o.orderStatus === 'pending').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 w-full lg:w-[calc(25%-1.5rem)]">
                    <div className="flex items-center justify-between">
                        <div className="p-2 md:p-3 rounded-full bg-green-100">
                            <svg className="w-5 h-5 md:w-6 md:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div className="ml-3 md:ml-4">
                            <p className="text-xs md:text-sm font-medium text-gray-600">Delivered</p>
                            <p className="text-lg md:text-2xl font-bold text-gray-900 text-center">
                                {orders.filter(o => o.orderStatus === 'delivered').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 w-full lg:w-[calc(25%-1.5rem)]">
                    <div className="flex items-center justify-between">
                        <div className="p-2 md:p-3 rounded-full bg-purple-100">
                            <svg className="w-5 h-5 md:w-6 md:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                        </div>
                        <div className="ml-3 md:ml-4">
                            <p className="text-xs md:text-sm font-medium text-gray-600">Revenue</p>
                            <p className="text-sm md:text-lg font-bold text-gray-900">
                                {formatCurrency(orders.reduce((sum, order) => sum + (order.amount || 0), 0))}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-wrap lg:gap-6 gap-4 mb-6 md:mb-8">
                    {[
                        { key: 'all', label: 'All Orders', count: orders.length },
                        { key: 'pending', label: 'Pending', count: orders.filter(o => o.orderStatus === 'pending').length },
                        { key: 'confirmed', label: 'Confirmed', count: orders.filter(o => o.orderStatus === 'confirmed').length },
                        { key: 'preparing', label: 'Preparing', count: orders.filter(o => o.orderStatus === 'preparing').length },
                        { key: 'out_for_delivery', label: 'Out for Delivery', count: orders.filter(o => o.orderStatus === 'out_for_delivery').length },
                        { key: 'delivered', label: 'Delivered', count: orders.filter(o => o.orderStatus === 'delivered').length },
                        { key: 'cancelled', label: 'Cancelled', count: orders.filter(o => o.orderStatus === 'cancelled').length }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setStatusFilter(tab.key)}
                            className={`px-3 md:px-4 py-2 rounded-lg text-sm justify-between font-medium transition-colors duration-200 flex items-center gap-2 w-full lg:w-[calc(25%-1.5rem)] ${
                                statusFilter === tab.key
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                statusFilter === tab.key ? 'bg-blue-500' : 'bg-gray-300'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders Layout - Grid on mobile, Flex on large screens */}
            <div className="grid items-center justify-center grid-cols-1 lg:flex lg:flex-wrap lg:gap-6 gap-4 w-full ">
                {loading ? (
                    <div className="col-span-full text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-500 mt-4">Loading orders...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="w-full text-center py-12 bg-white rounded-xl shadow-sm">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-gray-500 mt-4">No orders found</p>
                    </div>
                ) : (
                    filteredOrders.map(order => (
                        <OrderCard 
                            key={order._id} 
                            order={order} 
                            onStatusUpdate={updateOrderStatus}
                            onViewDetails={() => setSelectedOrder(order)}
                            onDelete = {deleteOrder}
                            getStatusColor={getStatusColor}
                            formatCurrency={formatCurrency}
                            formatDate={formatDate}
                        />
                    ))
                )}
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <OrderDetailsModal 
                    order={selectedOrder} 
                    onClose={() => setSelectedOrder(null)}
                    getStatusColor={getStatusColor}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                />
            )}
        </div>
    );
};

// Order Card Component
const OrderCard = ({ order, onStatusUpdate, onViewDetails, getStatusColor, formatCurrency,onDelete, formatDate }) => {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleStatusUpdate = async (newStatus) => {
        setIsUpdating(true);
        try {
            await onStatusUpdate(order._id, newStatus);
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusIcon = (status) => {
        const icons = {
            'pending': '⏳',
            'confirmed': '✅',
            'preparing': '👨‍🍳',
            'out_for_delivery': '🚚',
            'delivered': '📦',
            'cancelled': '❌'
        };
        return icons[status] || '📋';
    };

    const getStatusGradient = (status) => {
        const gradients = {
            'pending': 'from-yellow-400 to-yellow-600',
            'confirmed': 'from-blue-400 to-blue-600',
            'preparing': 'from-orange-400 to-orange-600',
            'out_for_delivery': 'from-purple-400 to-purple-600',
            'delivered': 'from-green-400 to-green-600',
            'cancelled': 'from-red-400 to-red-600'
        };
        return gradients[status] || 'from-gray-400 to-gray-600';
    };

    return (
        <div className="group bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl hover:border-gray-200 transition-all duration-300 overflow-hidden w-full lg:w-[calc(33.333%-1rem)] xl:w-[calc(33.333%-1rem)] 2xl:w-[calc(25%-1.5rem)] transform hover:-translate-y-1">
            {/* Status Banner */}
            <div className={`h-1 bg-gradient-to-r ${getStatusGradient(order.orderStatus)}`}></div>

            <div className="p-6 space-y-5">
                {/* Header with Avatar */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {order.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                {order.name}
                            </h3>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {formatDate(order.createdAt)}
                            </p>
                        </div>
                    </div>

                    {/* Enhanced Status Badge */}
                    <div className="flex flex-col items-end gap-2">
                        <div className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md bg-gradient-to-r ${getStatusGradient(order.orderStatus)} text-white flex items-center gap-2`}>
                            <span className="text-sm">{getStatusIcon(order.orderStatus)}</span>
                            {order.orderStatus?.replace('_', ' ').toUpperCase() || 'PENDING'}
                        </div>
                    </div>
                </div>

                {/* Customer Contact Info */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900">{order.phone}</p>
                            <p className="text-xs text-gray-500">Phone</p>
                        </div>
                    </div>

                    {order.email && (
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900 truncate">{order.email}</p>
                                <p className="text-xs text-gray-500">Email</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Order Items Preview */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                            </svg>
                            Items ({order.items?.length || 0})
                        </h4>
                    </div>

                    <div className="space-y-2 max-h-24 overflow-y-auto">
                        {order.items?.slice(0, 3).map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                        <span className="text-xs font-bold text-gray-600">{item.quantity}x</span>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 truncate">{item.name}</span>
                                </div>
                                <span className="text-sm font-bold text-green-600">{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                        ))}
                        {order.items?.length > 3 && (
                            <div className="text-center py-2">
                                <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                    +{order.items.length - 3} more items
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Total Amount with Enhanced Design */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                            </div>
                            <span className="text-sm font-semibold text-gray-700">Total Amount</span>
                        </div>
                        <span className="text-xl font-bold text-green-600">{formatCurrency(order.amount || 0)}</span>
                    </div>
                </div>

                {/* Enhanced Action Buttons */}
                <div className="space-y-3 pt-2">
                    <button
                        onClick={onViewDetails}
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Details
                    </button>

                    <div className="relative">
                        <select
                            value={order.orderStatus || 'pending'}
                            onChange={(e) => handleStatusUpdate(e.target.value)}
                            disabled={isUpdating}
                            className="w-full appearance-none bg-white border-2 border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            <option value="pending">⏳ Pending</option>
                            <option value="confirmed">✅ Confirmed</option>
                            <option value="preparing">👨‍🍳 Preparing</option>
                            <option value="out_for_delivery">🚚 Out for Delivery</option>
                            <option value="delivered">📦 Delivered</option>
                            <option value="cancelled">❌ Cancelled</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                        {isUpdating && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-xl">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                            </div>
                        )}
                        <button
                         onClick={() => onDelete(order._id)}
                         className='w-full bg-gradient-to-r from-blue-500 to-red-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 mt-3'>
                            delete Order
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};



// Order Details Modal Component
const OrderDetailsModal = ({ order, onClose, getStatusColor, formatCurrency, formatDate }) => {
    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 md:p-8 max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6 md:mb-8 pb-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Order Details</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-105"
                        >
                            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Order Summary */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
                        {/* Customer Information Card */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg md:text-xl font-bold text-gray-900">Customer Information</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm">
                                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Name</p>
                                        <p className="font-semibold text-gray-900">{order.name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm">
                                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Email</p>
                                        <p className="font-semibold text-gray-900">{order.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm">
                                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Phone</p>
                                        <p className="font-semibold text-gray-900">{order.phone}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Order Information & Summary Card */}
                        <div className="space-y-6">
                            {/* Order Information */}
                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg md:text-xl font-bold text-gray-900">Order Information</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm">
                                        <span className="text-sm text-gray-500">Order ID</span>
                                        <span className="font-mono font-semibold text-gray-900">#{order._id}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm">
                                        <span className="text-sm text-gray-500">Date</span>
                                        <span className="font-semibold text-gray-900">{formatDate(order.createdAt)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm">
                                        <span className="text-sm text-gray-500">Payment</span>
                                        <span className="font-semibold text-gray-900">{order.paymentMethod}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm">
                                        <span className="text-sm text-gray-500">Status</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.orderStatus)}`}>
                                            {order.orderStatus?.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Order Summary */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg md:text-xl font-bold text-gray-900">Order Summary</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm">
                                        <span className="text-sm text-gray-600">Subtotal</span>
                                        <span className="font-semibold text-gray-900">{formatCurrency(order.amount || 0)}</span>
                                    </div>
                                    {order.deliveryFee && (
                                        <div className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm">
                                            <span className="text-sm text-gray-600">Delivery Fee</span>
                                            <span className="font-semibold text-gray-900">{formatCurrency(order.deliveryFee)}</span>
                                        </div>
                                    )}
                                    <div className="border-t-2 border-green-200 pt-3 mt-3">
                                        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white">
                                            <span className="text-lg font-bold">Total</span>
                                            <span className="text-xl font-bold">
                                                {formatCurrency(order.totalAmount || (order.amount + (order.deliveryFee || 0)))}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order Items */}
                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                            </div>
                            <h3 className="text-lg md:text-xl font-bold text-gray-900">Order Items</h3>
                            <span className="ml-auto px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-medium">
                                {order.items?.length || 0} items
                            </span>
                        </div>
                        <div className="space-y-4 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            {order.items?.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-red-100 rounded-xl flex items-center justify-center">
                                            <span className="text-sm font-bold text-orange-600">{item.quantity}x</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 text-lg">{item.name}</p>
                                            <p className="text-sm text-gray-500">Unit Price: {formatCurrency(item.price)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-green-600">{formatCurrency(item.price * item.quantity)}</p>
                                        <p className="text-sm text-gray-500">Total</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Order;
