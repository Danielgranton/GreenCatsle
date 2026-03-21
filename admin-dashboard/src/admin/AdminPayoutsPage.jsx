import React from "react";

const API_PAYOUTS = "http://localhost:4000/api/payouts";
const API_WALLETS = "http://localhost:4000/api/wallets";

const formatMoney = (amount, currency = "KES") => {
  try {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(Number(amount || 0));
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
};

const statusBadge = (status) => {
  const base = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border";
  if (status === "paid") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  if (status === "approved" || status === "processing") return `${base} bg-amber-50 text-amber-800 border-amber-200`;
  if (status === "rejected" || status === "failed") return `${base} bg-red-50 text-red-700 border-red-200`;
  return `${base} bg-gray-50 text-gray-700 border-gray-200`;
};

const safeLower = (v) => String(v || "").toLowerCase();

export default function AdminPayoutsPage() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [payouts, setPayouts] = React.useState([]);
  const [query, setQuery] = React.useState("");

  const [wallet, setWallet] = React.useState(null);
  const [payoutAmount, setPayoutAmount] = React.useState("");
  const [payoutMethod, setPayoutMethod] = React.useState("mpesa");
  const [payoutDestination, setPayoutDestination] = React.useState({ phone: "", email: "", accountId: "" });
  const [requestLoading, setRequestLoading] = React.useState(false);
  const [requestMsg, setRequestMsg] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    setRequestMsg("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");

      const [walletResp, payoutsResp] = await Promise.all([
        fetch(`${API_WALLETS}/me`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_PAYOUTS}/my`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const walletData = await walletResp.json();
      const payoutsData = await payoutsResp.json();

      if (!walletResp.ok || !walletData?.success) throw new Error(walletData?.message || "Failed to load wallet");
      if (!payoutsResp.ok || !payoutsData?.success) throw new Error(payoutsData?.message || "Failed to load payouts");

      setWallet(walletData.wallet || null);
      setPayouts(Array.isArray(payoutsData.payouts) ? payoutsData.payouts : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const currency = wallet?.currency || "KES";

  const filtered = React.useMemo(() => {
    const q = safeLower(query).trim();
    if (!q) return payouts;
    return payouts.filter((p) => {
      const parts = [
        p._id,
        p.status,
        p.method,
        p.currency,
        p.amount,
        p.providerRef,
        p.rejectionReason,
        JSON.stringify(p.destination || {}),
      ].map(safeLower);
      return parts.some((x) => x.includes(q));
    });
  }, [payouts, query]);

  const stats = React.useMemo(() => {
    const s = { pending: 0, approved: 0, processing: 0, paid: 0, rejected: 0, failed: 0, total: payouts.length };
    for (const p of payouts) {
      if (s[p.status] != null) s[p.status] += 1;
    }
    return s;
  }, [payouts]);

  const requestPayout = async (e) => {
    e.preventDefault();
    setRequestLoading(true);
    setError("");
    setRequestMsg("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");

      const amount = Number(payoutAmount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount");

      let destination = {};
      if (payoutMethod === "mpesa") {
        if (!payoutDestination.phone.trim()) throw new Error("Phone is required for M-Pesa payouts");
        destination = { phone: payoutDestination.phone.trim() };
      } else if (payoutMethod === "paypal") {
        if (!payoutDestination.email.trim()) throw new Error("Email is required for PayPal payouts");
        destination = { email: payoutDestination.email.trim() };
      } else if (payoutMethod === "stripe") {
        if (!payoutDestination.accountId.trim()) throw new Error("Account ID is required for Stripe payouts");
        destination = { accountId: payoutDestination.accountId.trim() };
      }

      const resp = await fetch(`${API_PAYOUTS}/request`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount, method: payoutMethod, destination }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to request payout");

      setRequestMsg("Payout request submitted. Super Admin will review it.");
      setPayoutAmount("");
      setPayoutDestination({ phone: "", email: "", accountId: "" });
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to request payout");
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Payouts</h2>
          <p className="text-sm text-gray-600 mt-1">Request withdrawals and track approval status.</p>
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

      {requestMsg ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-sm">
          {requestMsg}
        </div>
      ) : null}

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Available balance</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">{formatMoney(wallet?.availableBalance || 0, currency)}</div>
          <div className="text-xs text-gray-500 mt-2">You can request payouts up to this amount.</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Pending</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">{stats.pending}</div>
          <div className="text-xs text-gray-500 mt-2">Awaiting review</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Approved / Processing</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">{stats.approved + stats.processing}</div>
          <div className="text-xs text-gray-500 mt-2">Funds may be debited on approval</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Paid</div>
          <div className="text-xl font-semibold text-emerald-700 mt-1">{stats.paid}</div>
          <div className="text-xs text-gray-500 mt-2">Completed payouts</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-1 bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-sm font-semibold text-gray-900">Request payout</div>
          <div className="text-xs text-gray-500 mt-1">Submit a withdrawal request for Super Admin approval.</div>

          <form onSubmit={requestPayout} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
              <input
                type="number"
                step="any"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="e.g. 2500"
              />
              <div className="text-[11px] text-gray-500 mt-1">
                Available: {formatMoney(wallet?.availableBalance || 0, currency)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Method</label>
              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value)}
                className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="mpesa">M-Pesa</option>
                <option value="paypal">PayPal</option>
                <option value="stripe">Stripe</option>
              </select>
            </div>

            {payoutMethod === "mpesa" ? (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">M-Pesa phone</label>
                <input
                  value={payoutDestination.phone}
                  onChange={(e) => setPayoutDestination((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="e.g. 2547XXXXXXXX"
                />
              </div>
            ) : null}

            {payoutMethod === "paypal" ? (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">PayPal email</label>
                <input
                  type="email"
                  value={payoutDestination.email}
                  onChange={(e) => setPayoutDestination((p) => ({ ...p, email: e.target.value }))}
                  className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="you@example.com"
                />
              </div>
            ) : null}

            {payoutMethod === "stripe" ? (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Stripe account ID</label>
                <input
                  value={payoutDestination.accountId}
                  onChange={(e) => setPayoutDestination((p) => ({ ...p, accountId: e.target.value }))}
                  className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="acct_..."
                />
              </div>
            ) : null}

            <button
              type="submit"
              disabled={requestLoading}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
            >
              {requestLoading ? "Submitting…" : "Submit payout request"}
            </button>

            <div className="text-xs text-gray-500">
              Note: execution happens after Super Admin approves (and may require payment provider APIs).
            </div>
          </form>
        </div>

        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">My payout requests</div>
              <div className="text-xs text-gray-500 mt-1">History and current status.</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="status, method, reason…"
              />
            </div>
          </div>

          <div className="mt-4 border border-gray-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs font-semibold text-gray-600">
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Provider ref</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-gray-600">
                        Loading…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-gray-600">
                        No payout requests found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) => (
                      <tr key={p._id} className="align-top">
                        <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                          {p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="font-semibold text-gray-900">{formatMoney(p.amount || 0, p.currency || currency)}</div>
                        </td>
                        <td className="px-4 py-4 text-gray-700">{p.method || "—"}</td>
                        <td className="px-4 py-4">
                          <span className={statusBadge(p.status)}>{p.status}</span>
                          {p.reviewedAt ? (
                            <div className="text-xs text-gray-500 mt-2">
                              Reviewed: {new Date(p.reviewedAt).toLocaleString()}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          <div className="max-w-[200px] truncate" title={p.providerRef || ""}>
                            {p.providerRef || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          {p.rejectionReason ? (
                            <div className="text-xs text-red-700">Reason: {p.rejectionReason}</div>
                          ) : (
                            <div className="text-xs text-gray-500">—</div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

