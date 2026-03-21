import React from "react";

const API_ORDERS = "http://localhost:4000/api/orders";

const statusBadge = (status) => {
  const base = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border";
  if (status === "completed") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  if (status === "cancelled") return `${base} bg-red-50 text-red-700 border-red-200`;
  if (status === "onDelivery") return `${base} bg-sky-50 text-sky-700 border-sky-200`;
  if (status === "preparing") return `${base} bg-amber-50 text-amber-800 border-amber-200`;
  return `${base} bg-gray-50 text-gray-700 border-gray-200`;
};

const payBadge = (status) => {
  const base = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border";
  if (status === "paid") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  if (status === "failed") return `${base} bg-red-50 text-red-700 border-red-200`;
  return `${base} bg-amber-50 text-amber-800 border-amber-200`;
};

const formatMoney = (amount, currency = "KES") => {
  try {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(Number(amount || 0));
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
};

const safeLower = (v) => String(v || "").toLowerCase();

const shortId = (id) => {
  const s = String(id || "");
  return s.length > 10 ? s.slice(-10) : s || "—";
};

export default function AdminOrdersPage() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [orders, setOrders] = React.useState([]);

  const [status, setStatus] = React.useState("all");
  const [query, setQuery] = React.useState("");

  const [selected, setSelected] = React.useState(null);
  const [editStatus, setEditStatus] = React.useState("pending");
  const [saving, setSaving] = React.useState(false);

  const businessId = localStorage.getItem("businessId") || "";

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      if (!businessId) throw new Error("Missing businessId for this account.");

      const resp = await fetch(`${API_ORDERS}/business/${businessId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load orders");
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = React.useMemo(() => {
    const q = safeLower(query).trim();
    return orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (!q) return true;
      const parts = [
        o._id,
        o.status,
        o.paymentStatus,
        o.deliveryAddress,
        o.userId?.name,
        o.userId?.email,
        o.userId?.phone,
        o.assignedWorkerId?.name,
        o.assignedWorkerId?.email,
      ]
        .map(safeLower)
        .join(" ");
      return parts.includes(q);
    });
  }, [orders, query, status]);

  const summary = React.useMemo(() => {
    const s = { total: orders.length, pending: 0, preparing: 0, onDelivery: 0, completed: 0, cancelled: 0 };
    for (const o of orders) if (s[o.status] != null) s[o.status] += 1;
    return s;
  }, [orders]);

  const openDetails = (o) => {
    setSelected(o);
    setEditStatus(o?.status || "pending");
  };

  const closeDetails = () => {
    if (saving) return;
    setSelected(null);
  };

  const saveStatus = async () => {
    if (!selected?._id) return;
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");

      const resp = await fetch(`${API_ORDERS}/${selected._id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: editStatus }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to update order");
      const updated = data.order;
      setOrders((prev) => prev.map((x) => (String(x._id) === String(updated._id) ? updated : x)));
      setSelected(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Orders</h2>
          <p className="text-sm text-gray-600 mt-1">Manage incoming orders and update statuses.</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="h-10 px-4 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">{summary.total}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Pending</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">{summary.pending}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Preparing</div>
          <div className="text-xl font-semibold text-amber-800 mt-1">{summary.preparing}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">On delivery</div>
          <div className="text-xl font-semibold text-sky-700 mt-1">{summary.onDelivery}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Completed</div>
          <div className="text-xl font-semibold text-emerald-700 mt-1">{summary.completed}</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "all", label: "All" },
            { key: "pending", label: "Pending" },
            { key: "preparing", label: "Preparing" },
            { key: "onDelivery", label: "On delivery" },
            { key: "completed", label: "Completed" },
            { key: "cancelled", label: "Cancelled" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setStatus(t.key)}
              className={`h-9 px-3 rounded-xl text-sm font-semibold border ${
                status === t.key
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-600 mb-2">Search</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Order ID, customer name, address…"
            className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-gray-600">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-gray-600">
                    No orders found.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o._id} className="align-top">
                    <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                      {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-4 text-gray-900 font-semibold whitespace-nowrap">{shortId(o._id)}</td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-900">{o.userId?.name || "—"}</div>
                      <div className="text-xs text-gray-500">{o.userId?.phone || o.userId?.email || "—"}</div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-1">{o.deliveryAddress || "—"}</div>
                    </td>
                    <td className="px-4 py-4 text-gray-900 font-semibold whitespace-nowrap">
                      {formatMoney(o.totalAmount || 0, "KES")}
                    </td>
                    <td className="px-4 py-4">
                      <span className={statusBadge(o.status)}>{o.status}</span>
                      {o.expectedCompletedAt ? (
                        <div className="text-xs text-gray-500 mt-2">
                          ETA: {new Date(o.expectedCompletedAt).toLocaleTimeString()}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <span className={payBadge(o.paymentStatus)}>{o.paymentStatus}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openDetails(o)}
                        className="h-9 px-3 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeDetails} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
              <div className="p-5 border-b border-gray-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Order {shortId(selected._id)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "—"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeDetails}
                    disabled={saving}
                    className="h-9 px-3 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 disabled:opacity-50"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <div className="text-xs text-gray-500">Customer</div>
                    <div className="text-sm font-semibold text-gray-900 mt-1">{selected.userId?.name || "—"}</div>
                    <div className="text-xs text-gray-600 mt-1">{selected.userId?.email || "—"}</div>
                    <div className="text-xs text-gray-600 mt-1">{selected.userId?.phone || "—"}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <div className="text-xs text-gray-500">Delivery</div>
                    <div className="text-sm text-gray-900 mt-1">{selected.deliveryAddress || "—"}</div>
                    {Array.isArray(selected.deliveryCoordinates?.coordinates) ? (
                      <div className="text-xs text-gray-500 mt-2">
                        Lat/Lng: {selected.deliveryCoordinates.coordinates[1]}, {selected.deliveryCoordinates.coordinates[0]}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-900">Items</div>
                    <div className="text-sm font-semibold text-gray-900">{formatMoney(selected.totalAmount || 0, "KES")}</div>
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    {(selected.items || []).length === 0 && (selected.services || []).length === 0 ? (
                      <div className="text-gray-600">No line items.</div>
                    ) : null}
                    {(selected.items || []).map((it, idx) => (
                      <div key={`i-${idx}`} className="flex items-center justify-between gap-3">
                        <div className="text-gray-700">
                          {it.name || "Item"} <span className="text-gray-500">×{it.quantity || 1}</span>
                        </div>
                        <div className="font-semibold text-gray-900">
                          {formatMoney((Number(it.price || 0) * Number(it.quantity || 1)) || 0, "KES")}
                        </div>
                      </div>
                    ))}
                    {(selected.services || []).map((sv, idx) => (
                      <div key={`s-${idx}`} className="flex items-center justify-between gap-3">
                        <div className="text-gray-700">
                          {sv.name || "Service"} <span className="text-gray-500">×{sv.quantity || 1}</span>
                        </div>
                        <div className="font-semibold text-gray-900">
                          {formatMoney((Number(sv.price || 0) * Number(sv.quantity || 1)) || 0, "KES")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                  <div className="text-xs text-gray-500">Update status</div>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[220px]">
                      <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      >
                        <option value="pending">Pending</option>
                        <option value="preparing">Preparing</option>
                        <option value="onDelivery">On delivery</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={saveStatus}
                      disabled={saving || editStatus === selected.status}
                      className="h-10 px-4 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Only the business owner/admin, assigned worker, or superadmin can update an order.
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-gray-200 flex items-center justify-between gap-3">
                <div className="text-xs text-gray-500">
                  Payment: <span className="font-semibold text-gray-900">{selected.paymentStatus}</span>
                </div>
                <button
                  type="button"
                  onClick={closeDetails}
                  className="h-10 px-4 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

