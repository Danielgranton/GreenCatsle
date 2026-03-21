import React from "react";

const API_BASE = "http://localhost:4000/api/wallets";

const formatMoney = (amount, currency = "KES") => {
  try {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(Number(amount || 0));
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
};

const badge = (kind) => {
  const base = "inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border";
  if (!kind) return `${base} bg-gray-50 text-gray-700 border-gray-200`;
  if (kind.includes("fee")) return `${base} bg-purple-50 text-purple-700 border-purple-200`;
  if (kind.includes("payout")) return `${base} bg-blue-50 text-blue-700 border-blue-200`;
  if (kind.includes("refund")) return `${base} bg-red-50 text-red-700 border-red-200`;
  return `${base} bg-gray-50 text-gray-700 border-gray-200`;
};

const SystemWalletPage = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [wallet, setWallet] = React.useState(null);
  const [transactions, setTransactions] = React.useState([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");

      const walletResp = await fetch(`${API_BASE}/system`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const walletData = await walletResp.json();
      if (!walletResp.ok || !walletData?.success) {
        throw new Error(walletData?.message || "Failed to load system wallet");
      }
      setWallet(walletData.wallet);

      const txResp = await fetch(`${API_BASE}/${walletData.wallet._id}/transactions?limit=80`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const txData = await txResp.json();
      if (!txResp.ok || !txData?.success) {
        throw new Error(txData?.message || "Failed to load transactions");
      }
      setTransactions(Array.isArray(txData.transactions) ? txData.transactions : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load system wallet");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const totals = React.useMemo(() => {
    let credits = 0;
    let debits = 0;
    for (const tx of transactions) {
      if (tx.status !== "posted") continue;
      const amt = Number(tx.amount || 0);
      if (tx.direction === "credit") credits += amt;
      if (tx.direction === "debit") debits += amt;
    }
    return { credits, debits };
  }, [transactions]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">System wallet</h2>
          <p className="text-sm text-gray-600 mt-1">Platform funds, fees, and settlements (KES).</p>
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
          <div className="text-xs text-gray-500">Available</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">
            {formatMoney(wallet?.availableBalance, wallet?.currency)}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Pending</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">
            {formatMoney(wallet?.pendingBalance, wallet?.currency)}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Credits (posted)</div>
          <div className="text-xl font-semibold text-emerald-700 mt-1">
            {formatMoney(totals.credits, wallet?.currency)}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Debits (posted)</div>
          <div className="text-xl font-semibold text-red-700 mt-1">
            {formatMoney(totals.debits, wallet?.currency)}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Recent transactions</h3>
          <div className="text-xs text-gray-500">{transactions.length} shown</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white border-b border-gray-200">
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3">Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading && transactions.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-600" colSpan={6}>
                    Loading…
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-600" colSpan={6}>
                    No transactions yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx._id} className="align-top">
                    <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          tx.direction === "credit"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {tx.direction}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        {tx.balance} • {tx.status}
                      </div>
                    </td>
                    <td className="px-4 py-4 font-semibold text-gray-900 whitespace-nowrap">
                      {formatMoney(tx.amount, tx.currency)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={badge(tx.kind || "")}>{tx.kind || "generic"}</span>
                    </td>
                    <td className="px-4 py-4 text-gray-600 max-w-[360px]">
                      <div className="line-clamp-2">{tx.note || "—"}</div>
                      {tx.businessId ? (
                        <div className="text-xs text-gray-500 mt-1">Business: {String(tx.businessId)}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      <div className="text-xs">{tx.externalRef || "—"}</div>
                      {tx.orderId ? <div className="text-xs text-gray-500">Order: {String(tx.orderId)}</div> : null}
                      {tx.paymentId ? (
                        <div className="text-xs text-gray-500">Payment: {String(tx.paymentId)}</div>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SystemWalletPage;

