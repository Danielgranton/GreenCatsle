import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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

const formatMoney = (amount, currency = "KES") => {
  try {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(Number(amount || 0));
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
};

const formatPercent = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;

const safeNumber = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

const formatBucket = (bucket) => {
  if (!bucket) return "";
  const d = new Date(bucket);
  if (!Number.isFinite(d.getTime())) return String(bucket);
  return d.toLocaleDateString("en-KE", { month: "short", day: "2-digit" });
};

const PlatformOverviewPage = () => {
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
      const resp = await fetch(`${API_BASE}/platform${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load platform stats");
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load platform stats");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const currency = stats?.systemWallet?.wallet?.currency || "KES";
  const reconciliation = stats?.systemWallet?.reconciliation;
  const anomalies = stats?.systemWallet?.anomalies || [];

  const gmvSeries = React.useMemo(() => {
    const daily = stats?.gmv?.daily || [];
    return daily.map((x) => ({
      label: formatBucket(x.bucket),
      amount: safeNumber(x.amount),
      count: safeNumber(x.count),
    }));
  }, [stats]);

  const ordersByStatus = React.useMemo(() => {
    const rows = stats?.orders?.byStatus || [];
    return rows.map((x) => ({
      status: x.status,
      count: safeNumber(x.count),
    }));
  }, [stats]);

  const revenueByMethod = React.useMemo(() => {
    const rows = stats?.revenue?.byMethod || [];
    return rows
      .map((x) => ({
        method: x.method || "unknown",
        gross: safeNumber(x.gross),
        count: safeNumber(x.count),
      }))
      .filter((x) => x.gross > 0);
  }, [stats]);

  const pieColors = ["#10b981", "#0ea5e9", "#a855f7", "#f59e0b", "#ef4444", "#64748b", "#14b8a6"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Platform overview</h2>
          <p className="text-sm text-gray-600 mt-1">Key metrics for the selected date range.</p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 px-3 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 px-3 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">GMV (gross)</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">
            {formatMoney(stats?.gmv?.total, currency)}
          </div>
          <div className="text-xs text-gray-500 mt-1">{safeNumber(stats?.gmv?.daily?.length)} daily buckets</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Commission (estimated)</div>
          <div className="text-xl font-semibold text-emerald-700 mt-1">
            {formatMoney(stats?.revenue?.commissionTotal, currency)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Payout out: {formatMoney(stats?.revenue?.payoutTotal, currency)}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Payout requests (pending)</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">{safeNumber(stats?.payouts?.requested)}</div>
          <div className="text-xs text-gray-500 mt-1">
            Liability: {formatMoney(stats?.payouts?.outstandingLiability, currency)}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Users active (24h)</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">{safeNumber(stats?.users?.activeLast24h)}</div>
          <div className="text-xs text-gray-500 mt-1">New users: {safeNumber(stats?.users?.new)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden lg:col-span-2">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">GMV over time</h3>
            <div className="text-xs text-gray-500">Daily</div>
          </div>
          <div className="p-4 h-[280px]">
            {gmvSeries.length === 0 ? (
              <div className="text-sm text-gray-600">No GMV data for this range.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={gmvSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => {
                      const n = Number(v || 0);
                      if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
                      if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
                      return `${n}`;
                    }}
                  />
                  <Tooltip
                    formatter={(value) => [formatMoney(value, currency), "GMV"]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Revenue share</h3>
            <div className="text-xs text-gray-500">Gross by method</div>
          </div>
          <div className="p-4 h-[280px]">
            {revenueByMethod.length === 0 ? (
              <div className="text-sm text-gray-600">No revenue data.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(value, name, props) => {
                      const method = props?.payload?.method || "";
                      return [formatMoney(value, currency), method];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Pie data={revenueByMethod} dataKey="gross" nameKey="method" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {revenueByMethod.map((_, idx) => (
                      <Cell key={`c-${idx}`} fill={pieColors[idx % pieColors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Orders by status</h3>
          </div>
          <div className="p-4 h-[260px]">
            {ordersByStatus.length === 0 ? (
              <div className="text-sm text-gray-600">No order data for this range.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [value, "Orders"]} />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Details</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Complaints</div>
                <div className="text-lg font-semibold text-gray-900 mt-1">
                  {safeNumber(stats?.paymentHealth?.complaintCount)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Dispute rate: {formatPercent(stats?.paymentHealth?.disputeRate)}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Refund rate</div>
                <div className="text-lg font-semibold text-gray-900 mt-1">
                  {formatPercent(stats?.paymentHealth?.refundRate)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Refunds: {safeNumber(stats?.paymentHealth?.refundCount)}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Pending payouts</div>
                <div className="text-lg font-semibold text-gray-900 mt-1">{safeNumber(stats?.payouts?.requested)}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Liability: {formatMoney(stats?.payouts?.outstandingLiability, currency)}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Wallet delta</div>
                <div className="text-lg font-semibold text-gray-900 mt-1">
                  {formatMoney(reconciliation?.delta, currency)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Reconciliation</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Payment health</h3>
          </div>
          <div className="p-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Stuck pending payments</div>
              <div className="text-lg font-semibold text-gray-900 mt-1">
                {safeNumber(stats?.paymentHealth?.stuckPendingCount)}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Success by method</div>
              <div className="mt-2 space-y-2">
                {(stats?.paymentHealth?.successByMethod || []).length === 0 ? (
                  <div className="text-sm text-gray-600">No data.</div>
                ) : (
                  stats.paymentHealth.successByMethod.map((m) => (
                    <div key={m.method} className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">{m.method}</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {formatPercent(m.successRate)} ({m.successCount}/{m.total})
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Webhook failures (top)</div>
              <div className="mt-2 space-y-2">
                {(stats?.paymentHealth?.webhookFailures || []).length === 0 ? (
                  <div className="text-sm text-gray-600">No failures.</div>
                ) : (
                  stats.paymentHealth.webhookFailures.slice(0, 6).map((w) => (
                    <div key={`${w.provider}:${w.eventType}`} className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        {w.provider} • {w.eventType}
                      </div>
                      <div className="text-sm font-semibold text-gray-900">{w.count}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Businesses</div>
          <div className="text-lg font-semibold text-gray-900 mt-1">
            Active: {safeNumber(stats?.businesses?.active)}
          </div>
          <div className="text-sm text-gray-600 mt-1">New in range: {safeNumber(stats?.businesses?.new)}</div>
          <div className="text-sm text-gray-600">Repeat customers: {safeNumber(stats?.users?.repeatCustomers)}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-gray-500">System wallet reconciliation</div>
              <div className="text-lg font-semibold text-gray-900 mt-1">
                Delta: {formatMoney(reconciliation?.delta, currency)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Stored: {formatMoney(reconciliation?.storedBalance, currency)} • Ledger:{" "}
                {formatMoney(reconciliation?.computedLedgerBalance, currency)}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-600">Anomalies (latest)</div>
            {anomalies.length === 0 ? (
              <div className="text-sm text-gray-600 mt-2">No anomalies detected.</div>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-600">
                      <th className="py-2 pr-4">Time</th>
                      <th className="py-2 pr-4">Problem</th>
                      <th className="py-2 pr-4">Gross</th>
                      <th className="py-2 pr-4">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {anomalies.slice(0, 8).map((a) => (
                      <tr key={`${a.paymentId}`} className="align-top">
                        <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">
                          {a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="py-2 pr-4 text-gray-700">{a.problem}</td>
                        <td className="py-2 pr-4 font-semibold text-gray-900 whitespace-nowrap">
                          {formatMoney(a.gross, currency)}
                        </td>
                        <td className="py-2 pr-4 text-gray-700">{a.method || "unknown"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Top businesses by sales</h3>
        </div>
        <div className="p-4">
          {(stats?.businesses?.topBySales || []).length === 0 ? (
            <div className="text-sm text-gray-600">No data.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-600">
                    <th className="py-2 pr-4">Business</th>
                    <th className="py-2 pr-4">Orders</th>
                    <th className="py-2 pr-4">GMV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stats.businesses.topBySales.slice(0, 10).map((b) => (
                    <tr key={b.businessId} className="align-top">
                      <td className="py-2 pr-4">
                        <div className="font-semibold text-gray-900">{b.name || b.businessId}</div>
                        <div className="text-xs text-gray-500">{b.category || ""}</div>
                      </td>
                      <td className="py-2 pr-4 text-gray-700">{safeNumber(b.orderCount)}</td>
                      <td className="py-2 pr-4 font-semibold text-gray-900 whitespace-nowrap">
                        {formatMoney(b.gmv, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlatformOverviewPage;
