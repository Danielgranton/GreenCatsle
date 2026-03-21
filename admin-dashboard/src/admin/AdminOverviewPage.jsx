import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_BASE = "http://localhost:4000/api/stats";

const safeNumber = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

const formatMoney = (amount, currency = "KES") => {
  try {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(Number(amount || 0));
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
};

const formatBucket = (bucket) => {
  if (!bucket) return "";
  const d = new Date(bucket);
  if (!Number.isFinite(d.getTime())) return String(bucket);
  return d.toLocaleDateString("en-KE", { month: "short", day: "2-digit" });
};

export default function AdminOverviewPage() {
  const [from, setFrom] = React.useState(() => {
    const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [stats, setStats] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");

      const qs = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const resp = await fetch(`${API_BASE}/my-business${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load business stats");
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load business stats");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const currency = stats?.wallet?.wallet?.currency || "KES";
  const wallet = stats?.wallet?.wallet;

  const revenueTotal = safeNumber(stats?.sales?.revenueTotal);
  const orderCount = safeNumber(stats?.sales?.orderCount);
  const aov = safeNumber(stats?.sales?.averageOrderValue);
  const repeatCustomers = safeNumber(stats?.customers?.repeatCustomers);
  const averageRating = safeNumber(stats?.customers?.averageRating);
  const ratingCount = safeNumber(stats?.customers?.ratingCount);

  const complaintRows = stats?.customers?.complaints || [];
  const complaintsByStatus = React.useMemo(() => {
    const rows = Array.isArray(complaintRows) ? complaintRows : [];
    return rows.map((r) => ({ status: r.status, count: safeNumber(r.count) })).filter((r) => r.count > 0);
  }, [complaintRows]);
  const openComplaints = React.useMemo(() => {
    const map = new Map(complaintsByStatus.map((r) => [r.status, r.count]));
    return safeNumber(map.get("open")) + safeNumber(map.get("in_progress"));
  }, [complaintsByStatus]);

  const dailyRevenue = React.useMemo(() => {
    const rows = stats?.sales?.dailyRevenue || [];
    return (Array.isArray(rows) ? rows : []).map((x) => ({
      label: formatBucket(x.bucket),
      amount: safeNumber(x.amount),
      count: safeNumber(x.count),
    }));
  }, [stats]);

  const topItems = React.useMemo(() => {
    const rows = stats?.menuPerformance?.topItems || [];
    return (Array.isArray(rows) ? rows : [])
      .slice(0, 8)
      .map((x) => ({ name: x.name || "Item", revenue: safeNumber(x.revenue), quantity: safeNumber(x.quantity) }))
      .filter((x) => x.revenue > 0);
  }, [stats]);

  const pieColors = ["#10b981", "#0ea5e9", "#f59e0b", "#ef4444", "#64748b", "#a855f7"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
          <p className="text-sm text-gray-600 mt-1">Your business performance for the selected date range.</p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 px-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 px-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
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
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Revenue</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">{formatMoney(revenueTotal, currency)}</div>
          <div className="text-xs text-gray-500 mt-2">Period total</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Orders</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">{orderCount}</div>
          <div className="text-xs text-gray-500 mt-2">Avg order: {formatMoney(aov, currency)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Rating</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">
            {averageRating ? averageRating.toFixed(1) : "—"}
          </div>
          <div className="text-xs text-gray-500 mt-2">{ratingCount} ratings</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Complaints</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">{openComplaints}</div>
          <div className="text-xs text-gray-500 mt-2">{repeatCustomers} repeat customers</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">Revenue trend</div>
              <div className="text-xs text-gray-500 mt-1">Daily payouts-in to your business wallet.</div>
            </div>
          </div>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-sm font-semibold text-gray-900">Wallet</div>
          <div className="text-xs text-gray-500 mt-1">Available vs pending balance.</div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Available</span>
              <span className="font-semibold text-gray-900">
                {formatMoney(safeNumber(wallet?.availableBalance), wallet?.currency || currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Pending</span>
              <span className="font-semibold text-gray-900">
                {formatMoney(safeNumber(wallet?.pendingBalance), wallet?.currency || currency)}
              </span>
            </div>
            <div className="text-xs text-gray-500 pt-2">
              Payouts summary is available on the Payouts page.
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-sm font-semibold text-gray-900">Complaints</div>
          <div className="text-xs text-gray-500 mt-1">Status breakdown.</div>
          <div className="h-72 mt-4">
            {complaintsByStatus.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-600">
                No complaints in this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={complaintsByStatus} dataKey="count" nameKey="status" innerRadius={55} outerRadius={90}>
                    {complaintsByStatus.map((_, idx) => (
                      <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-sm font-semibold text-gray-900">Top items</div>
          <div className="text-xs text-gray-500 mt-1">Best performing menu items by revenue.</div>
          <div className="h-72 mt-4">
            {topItems.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-600">
                No item revenue yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItems}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-20} height={70} textAnchor="end" />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

