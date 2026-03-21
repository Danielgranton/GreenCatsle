import React from "react";

const API_BASE = "http://localhost:4000/api/payouts";
const WALLET_BASE = "http://localhost:4000/api/wallets";

const badge = (status) => {
  const base = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border";
  if (status === "paid") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  if (status === "approved") return `${base} bg-blue-50 text-blue-700 border-blue-200`;
  if (status === "processing") return `${base} bg-purple-50 text-purple-700 border-purple-200`;
  if (status === "rejected" || status === "failed") return `${base} bg-red-50 text-red-700 border-red-200`;
  return `${base} bg-amber-50 text-amber-800 border-amber-200`;
};

const formatMoney = (amount, currency = "KES") => {
  try {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(Number(amount || 0));
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
};

const PayoutApprovalsPage = () => {
  const [status, setStatus] = React.useState("pending");
  const [ownerType, setOwnerType] = React.useState("system");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [payouts, setPayouts] = React.useState([]);
  const [actionId, setActionId] = React.useState("");

  const [requestAmount, setRequestAmount] = React.useState("");
  const [requestMethod, setRequestMethod] = React.useState("mpesa");
  const [requestPhone, setRequestPhone] = React.useState("");

  const [systemWallet, setSystemWallet] = React.useState(null);

  const token = localStorage.getItem("token");

  const loadSystemWallet = React.useCallback(async () => {
    try {
      if (!token) return;
      const resp = await fetch(`${WALLET_BASE}/system`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) return;
      setSystemWallet(data.wallet || null);
    } catch {
      // ignore
    }
  }, [token]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!token) throw new Error("Missing token. Please log in again.");
      const qs = new URLSearchParams();
      if (status && status !== "all") qs.set("status", status);
      if (ownerType && ownerType !== "all") qs.set("ownerType", ownerType);

      const resp = await fetch(`${API_BASE}/?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load payouts");
      setPayouts(Array.isArray(data.payouts) ? data.payouts : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }, [ownerType, status, token]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    void loadSystemWallet();
  }, [loadSystemWallet]);

  const approve = async (id) => {
    setActionId(id);
    try {
      const resp = await fetch(`${API_BASE}/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to approve");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setActionId("");
    }
  };

  const reject = async (id) => {
    const reason = window.prompt("Rejection reason (optional):", "");
    if (reason === null) return;
    setActionId(id);
    try {
      const resp = await fetch(`${API_BASE}/${id}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to reject");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setActionId("");
    }
  };

  const execute = async (id) => {
    setActionId(id);
    try {
      const resp = await fetch(`${API_BASE}/${id}/execute`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to execute");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to execute");
    } finally {
      setActionId("");
    }
  };

  const requestSystemPayout = async () => {
    setActionId("system-request");
    setError("");
    try {
      const amount = Number(requestAmount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount");
      if (requestMethod === "mpesa" && !requestPhone.trim()) throw new Error("Enter phone for M-Pesa");

      const destination = requestMethod === "mpesa" ? { phone: requestPhone.trim() } : {};
      const resp = await fetch(`${API_BASE}/system/request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount, method: requestMethod, destination }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to create request");
      setRequestAmount("");
      setRequestPhone("");
      setStatus("pending");
      setOwnerType("system");
      await load();
      await loadSystemWallet();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create request");
    } finally {
      setActionId("");
    }
  };

  const availableAfter = React.useMemo(() => {
    const available = Number(systemWallet?.availableBalance || 0);
    const amt = Number(requestAmount || 0);
    if (!Number.isFinite(available) || !Number.isFinite(amt)) return null;
    return available - amt;
  }, [requestAmount, systemWallet?.availableBalance]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Payout approvals</h2>
          <p className="text-sm text-gray-600 mt-1">Approve, execute, and track payouts (system and businesses).</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">System wallet available</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">
            {formatMoney(systemWallet?.availableBalance, systemWallet?.currency || "KES")}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">System wallet pending</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">
            {formatMoney(systemWallet?.pendingBalance, systemWallet?.currency || "KES")}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Available after request</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">
            {availableAfter == null
              ? "—"
              : formatMoney(availableAfter, systemWallet?.currency || "KES")}
          </div>
          <div className="text-xs text-gray-500 mt-1">Based on the amount entered below.</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900">System wallet payout request</h3>
        <p className="text-xs text-gray-500 mt-1">Creates a pending payout request from the system wallet.</p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Amount (KES)</label>
            <input
              value={requestAmount}
              onChange={(e) => setRequestAmount(e.target.value)}
              type="number"
              min="1"
              step="any"
              className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
              placeholder="5000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Method</label>
            <select
              value={requestMethod}
              onChange={(e) => setRequestMethod(e.target.value)}
              className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
            >
              <option value="mpesa">M-Pesa</option>
              <option value="bank">Bank</option>
              <option value="manual">Manual</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Phone (M-Pesa)</label>
            <input
              value={requestPhone}
              onChange={(e) => setRequestPhone(e.target.value)}
              type="text"
              className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
              placeholder="2547xxxxxxxx"
              disabled={requestMethod !== "mpesa"}
            />
          </div>
          <button
            type="button"
            onClick={requestSystemPayout}
            disabled={actionId === "system-request"}
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            Create request
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "system", label: "System" },
              { key: "business", label: "Business" },
              { key: "all", label: "All" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setOwnerType(t.key)}
                className={`h-9 px-3 rounded-xl text-sm font-semibold border ${
                  ownerType === t.key
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { key: "pending", label: "Pending" },
              { key: "approved", label: "Approved" },
              { key: "processing", label: "Processing" },
              { key: "paid", label: "Paid" },
              { key: "failed", label: "Failed" },
              { key: "rejected", label: "Rejected" },
              { key: "all", label: "All" },
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
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Provider ref</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-gray-600" colSpan={7}>
                    Loading…
                  </td>
                </tr>
              ) : payouts.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-600" colSpan={7}>
                    No payout requests found.
                  </td>
                </tr>
              ) : (
                payouts.map((pr) => (
                  <tr key={pr._id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-900">{pr.ownerType}</div>
                      <div className="text-xs text-gray-500">
                        {pr.ownerType === "business" ? String(pr.businessId || "—") : "system"}
                      </div>
                    </td>
                    <td className="px-4 py-4 font-semibold text-gray-900 whitespace-nowrap">
                      {formatMoney(pr.amount, pr.currency)}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      <div className="font-medium">{pr.method}</div>
                      {pr.destination?.phone ? (
                        <div className="text-xs text-gray-500">Phone: {pr.destination.phone}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <span className={badge(pr.status)}>{pr.status}</span>
                      {pr.rejectionReason ? (
                        <div className="text-xs text-red-700 mt-2">Reason: {pr.rejectionReason}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                      {pr.createdAt ? new Date(pr.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      <div className="text-xs">{pr.providerRef || "—"}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => approve(pr._id)}
                          disabled={actionId === pr._id || pr.status !== "pending"}
                          className="h-9 px-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => reject(pr._id)}
                          disabled={actionId === pr._id || pr.status !== "pending"}
                          className="h-9 px-3 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => execute(pr._id)}
                          disabled={actionId === pr._id || (pr.status !== "approved" && pr.status !== "processing")}
                          className="h-9 px-3 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                        >
                          Execute
                        </button>
                      </div>
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

export default PayoutApprovalsPage;
