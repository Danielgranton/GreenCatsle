import React from "react";

const API_WALLETS = "http://localhost:4000/api/wallets";
const API_PAYOUTS = "http://localhost:4000/api/payouts";

const formatMoney = (amount, currency = "KES") => {
  try {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(Number(amount || 0));
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
};

const safeNumber = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

const badge = (direction) => {
  const base = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border";
  if (direction === "credit") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  if (direction === "debit") return `${base} bg-red-50 text-red-700 border-red-200`;
  return `${base} bg-gray-50 text-gray-700 border-gray-200`;
};

const inputClass =
  "w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900";

export default function AdminWalletPage() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [wallet, setWallet] = React.useState(null);
  const [transactions, setTransactions] = React.useState([]);
  const [limit, setLimit] = React.useState(50);
  const [query, setQuery] = React.useState("");

  const [payoutAmount, setPayoutAmount] = React.useState("");
  const [payoutMethod, setPayoutMethod] = React.useState("mpesa");
  const [payoutDestination, setPayoutDestination] = React.useState({ phone: "", email: "", accountId: "" });
  const [payoutLoading, setPayoutLoading] = React.useState(false);
  const [payoutMsg, setPayoutMsg] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    setPayoutMsg("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");

      const walletResp = await fetch(`${API_WALLETS}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const walletData = await walletResp.json();
      if (!walletResp.ok || !walletData?.success) {
        throw new Error(walletData?.message || "Failed to load wallet");
      }

      const w = walletData.wallet || null;
      setWallet(w);
      if (!w?._id) {
        setTransactions([]);
        return;
      }

      const txResp = await fetch(`${API_WALLETS}/${w._id}/transactions?limit=${encodeURIComponent(limit)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const txData = await txResp.json();
      if (!txResp.ok || !txData?.success) throw new Error(txData?.message || "Failed to load transactions");
      setTransactions(Array.isArray(txData.transactions) ? txData.transactions : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = React.useMemo(() => {
    const q = String(query || "").toLowerCase().trim();
    if (!q) return transactions;
    return transactions.filter((t) => {
      const parts = [
        t.kind,
        t.note,
        t.externalRef,
        t.status,
        t.balance,
        t.direction,
        t.orderId,
        t.paymentId,
      ]
        .map((x) => String(x || "").toLowerCase())
        .join(" ");
      return parts.includes(q);
    });
  }, [query, transactions]);

  const summary = React.useMemo(() => {
    let credits = 0;
    let debits = 0;
    for (const t of filtered) {
      const amt = safeNumber(t.amount);
      if (t.direction === "credit") credits += amt;
      else if (t.direction === "debit") debits += amt;
    }
    return { credits, debits };
  }, [filtered]);

  const submitPayout = async (e) => {
    e.preventDefault();
    setPayoutLoading(true);
    setPayoutMsg("");
    setError("");
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

      setPayoutMsg("Payout request submitted. Super Admin will review it.");
      setPayoutAmount("");
      setPayoutDestination({ phone: "", email: "", accountId: "" });
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to request payout");
    } finally {
      setPayoutLoading(false);
    }
  };

  const currency = wallet?.currency || "KES";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Wallet</h2>
          <p className="text-sm text-gray-600 mt-1">Track balances and settlement transactions.</p>
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

      {payoutMsg ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-sm">
          {payoutMsg}
        </div>
      ) : null}

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Available</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">
            {formatMoney(safeNumber(wallet?.availableBalance), currency)}
          </div>
          <div className="text-xs text-gray-500 mt-2">Ready for payout request</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Pending</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">
            {formatMoney(safeNumber(wallet?.pendingBalance), currency)}
          </div>
          <div className="text-xs text-gray-500 mt-2">Awaiting settlement</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">This view</div>
          <div className="text-sm text-gray-700 mt-2">
            Credits: <span className="font-semibold">{formatMoney(summary.credits, currency)}</span>
          </div>
          <div className="text-sm text-gray-700 mt-1">
            Debits: <span className="font-semibold">{formatMoney(summary.debits, currency)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">Transactions</div>
              <div className="text-xs text-gray-500 mt-1">Most recent ledger entries.</div>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
                <input value={query} onChange={(e) => setQuery(e.target.value)} className={inputClass} placeholder="kind, note, orderId…" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Limit</label>
                <select
                  value={String(limit)}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className={inputClass}
                >
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 border border-gray-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs font-semibold text-gray-600">
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Direction</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Balance</th>
                    <th className="px-4 py-3">Ref</th>
                    <th className="px-4 py-3">Note</th>
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
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((t) => (
                      <tr key={t._id} className="align-top">
                        <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                          {t.createdAt ? new Date(t.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-4 text-gray-900 font-medium">{t.kind || "generic"}</td>
                        <td className="px-4 py-4">
                          <span className={badge(t.direction)}>{t.direction}</span>
                          <div className="text-xs text-gray-500 mt-2">{t.status}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="font-semibold text-gray-900">
                            {formatMoney(safeNumber(t.amount), t.currency || currency)}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-gray-700">{t.balance}</td>
                        <td className="px-4 py-4 text-gray-600">
                          <div className="max-w-[240px] truncate" title={t.externalRef || ""}>
                            {t.externalRef || "—"}
                          </div>
                          {t.orderId ? (
                            <div className="text-xs text-gray-500 mt-1">
                              Order: <span className="font-semibold">{String(t.orderId).slice(-8)}</span>
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          <div className="max-w-[320px] line-clamp-2">{t.note || "—"}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-sm font-semibold text-gray-900">Request payout</div>
          <div className="text-xs text-gray-500 mt-1">Submit a withdrawal request for Super Admin approval.</div>

          <form onSubmit={submitPayout} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
              <input
                type="number"
                step="any"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                className={inputClass}
                placeholder="e.g. 2500"
              />
              <div className="text-[11px] text-gray-500 mt-1">
                Available: {formatMoney(safeNumber(wallet?.availableBalance), currency)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Method</label>
              <select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)} className={inputClass}>
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
                  className={inputClass}
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
                  className={inputClass}
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
                  className={inputClass}
                  placeholder="acct_..."
                />
              </div>
            ) : null}

            <button
              type="submit"
              disabled={payoutLoading}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
            >
              {payoutLoading ? "Submitting…" : "Submit payout request"}
            </button>

            <div className="text-xs text-gray-500">
              Tip: requests show up in Super Admin → Payout Approvals.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

