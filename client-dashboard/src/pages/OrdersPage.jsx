import React from "react";
import { ClipboardList, Clock, Wallet } from "lucide-react";
import { API_BASE_URL } from "../lib/apiBase.js";

const API_BASE = `${API_BASE_URL}/api`;

const requestJson = async (path, { method = "GET", token, body } = {}) => {
  const resp = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    },
    body: body && !(body instanceof FormData) ? JSON.stringify(body) : body,
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, data };
};

const orderStatusBadge = (status) => {
  const map = {
    pending: { label: "Pending", color: "text-gray-700 bg-gray-100 border-gray-200" },
    preparing: { label: "Preparing", color: "text-amber-700 bg-amber-100 border-amber-200" },
    onDelivery: { label: "On delivery", color: "text-blue-700 bg-blue-100 border-blue-200" },
    completed: { label: "Completed", color: "text-emerald-700 bg-emerald-100 border-emerald-200" },
    cancelled: { label: "Cancelled", color: "text-red-700 bg-red-100 border-red-200" },
  };
  return map[status] || { label: status || "Unknown", color: "text-gray-700 bg-gray-100 border-gray-200" };
};

export default function OrdersPage() {
  const token = localStorage.getItem("token") || "";

  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const loadOrders = React.useCallback(async () => {
    if (!token) {
      setError("Log in to view your orders.");
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { ok, data } = await requestJson("/orders/user", { token });
      if (!ok || !data?.success) throw new Error(data?.message || "Failed to load orders");
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-sky-600" />
            Your orders
          </div>
          <p className="text-sm text-gray-500">Track deliveries, revisit receipts, and review statuses.</p>
        </div>
        <div className="text-sm text-gray-500 flex items-center gap-1">
          <Clock className="h-4 w-4" />
          Updates every time the business changes the order status.
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">Loading your orders…</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          No orders yet. Place one from the menu to see it here.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusBadge = orderStatusBadge(order.status);
            const businessName = order.businessId?.name || "Business";
            const totalAmount = Number(order.totalAmount || 0);
            const created = order.createdAt ? new Date(order.createdAt).toLocaleString() : "-";
            return (
              <div key={order._id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{businessName}</div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">Order #{String(order._id).slice(-6)}</div>
                  </div>
                  <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${statusBadge.color}`}>
                    {statusBadge.label}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="font-semibold text-gray-900">Delivery address</div>
                    <div>{order.deliveryAddress || "Not provided"}</div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="font-semibold text-gray-900">Created</div>
                    <div>{created}</div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="font-semibold text-gray-900">Paid</div>
                    <div className="flex items-center gap-1">
                      <Wallet className="h-4 w-4 text-amber-500" />
                      {`KES ${totalAmount.toLocaleString()}`}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {(order.items || []).map((item) => (
                    <div key={item.menuItemId || item.name} className="flex items-center justify-between text-sm text-gray-700">
                      <span>{item.name}</span>
                      <span className="text-[11px] text-gray-500">
                        {`${item.quantity} × KES ${Number(item.price || 0).toLocaleString()}`}
                      </span>
                    </div>
                  ))}
                  {(order.services || []).length > 0 && (
                    <div className="pt-2 border-t border-dashed border-gray-200 text-sm text-gray-600">
                      Services:
                      <div className="mt-1 flex flex-wrap gap-2">
                        {order.services.map((svc) => (
                          <span key={svc.serviceId} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                            {svc.name} × {svc.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
