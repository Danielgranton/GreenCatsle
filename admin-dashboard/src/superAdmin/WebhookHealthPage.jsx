import React from "react";

const API_BASE = "http://localhost:4000/api/superadmin";

const badge = (status) => {
  const base = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border";
  if (status === "processed") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  if (status === "failed") return `${base} bg-red-50 text-red-700 border-red-200`;
  return `${base} bg-amber-50 text-amber-800 border-amber-200`;
};

const WebhookHealthPage = () => {
  const [provider, setProvider] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [limit, setLimit] = React.useState(100);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [events, setEvents] = React.useState([]);
  const [expandedId, setExpandedId] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");

      const qs = new URLSearchParams();
      qs.set("limit", String(limit));
      if (provider !== "all") qs.set("provider", provider);
      if (status !== "all") qs.set("status", status);

      const resp = await fetch(`${API_BASE}/webhook-events?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load webhook events");
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load webhook events");
    } finally {
      setLoading(false);
    }
  }, [limit, provider, status]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const summary = React.useMemo(() => {
    const s = { total: events.length, received: 0, processed: 0, failed: 0 };
    for (const e of events) {
      if (e.status === "received") s.received += 1;
      else if (e.status === "processed") s.processed += 1;
      else if (e.status === "failed") s.failed += 1;
    }
    return s;
  }, [events]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Webhook health</h2>
          <p className="text-sm text-gray-600 mt-1">Monitor recent webhook deliveries and failures.</p>
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">{summary.total}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Received</div>
          <div className="text-xl font-semibold text-amber-800 mt-1">{summary.received}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Processed</div>
          <div className="text-xl font-semibold text-emerald-700 mt-1">{summary.processed}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Failed</div>
          <div className="text-xl font-semibold text-red-700 mt-1">{summary.failed}</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">All</option>
              <option value="mpesa">M-Pesa</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">All</option>
              <option value="received">Received</option>
              <option value="processed">Processed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Limit</label>
            <select
              value={String(limit)}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>

          <div className="text-xs text-gray-500">Newest first</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">External ID</th>
                <th className="px-4 py-3">Error</th>
                <th className="px-4 py-3 text-right">Meta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-gray-600" colSpan={7}>
                    Loading…
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-600" colSpan={7}>
                    No webhook events found.
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <React.Fragment key={e._id}>
                    <tr className="align-top">
                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                        {e.createdAt ? new Date(e.createdAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-4 font-medium text-gray-900">{e.provider}</td>
                      <td className="px-4 py-4 text-gray-700">{e.eventType || "—"}</td>
                      <td className="px-4 py-4">
                        <span className={badge(e.status)}>{e.status}</span>
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        <div className="max-w-[220px] truncate" title={e.externalId || ""}>
                          {e.externalId || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        <div className="max-w-[320px] truncate" title={e.errorMessage || ""}>
                          {e.errorMessage || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          className="h-9 px-3 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50"
                          onClick={() => setExpandedId(expandedId === e._id ? "" : e._id)}
                        >
                          {expandedId === e._id ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {expandedId === e._id ? (
                      <tr>
                        <td className="px-4 pb-4" colSpan={7}>
                          <pre className="text-xs bg-gray-50 border border-gray-200 rounded-2xl p-4 overflow-auto max-h-[320px]">
                            {JSON.stringify(e.meta || {}, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WebhookHealthPage;

