import React from "react";

const API_ADVERTS = "http://localhost:4000/api/adverts";
const API_MEDIA = "http://localhost:4000/api/media";

const formatMoney = (amount, currency = "KES") => {
  try {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(Number(amount || 0));
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
};

const badge = (status) => {
  const base = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border";
  if (status === "active") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  if (status === "pending_payment") return `${base} bg-amber-50 text-amber-800 border-amber-200`;
  if (status === "rejected") return `${base} bg-red-50 text-red-700 border-red-200`;
  return `${base} bg-gray-50 text-gray-700 border-gray-200`;
};

const safeLower = (v) => String(v || "").toLowerCase();

const signUrl = async ({ token, key }) => {
  if (!key) return null;
  const resp = await fetch(`${API_MEDIA}/signed?key=${encodeURIComponent(key)}&expiresInSeconds=600`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  if (!resp.ok || !data?.success) return null;
  return data.url || null;
};

export default function AdminAdvertsPage() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  const [adverts, setAdverts] = React.useState([]);
  const [mediaUrls, setMediaUrls] = React.useState({});
  const [status, setStatus] = React.useState("all");
  const [query, setQuery] = React.useState("");

  // Create form
  const [file, setFile] = React.useState(null);
  const [title, setTitle] = React.useState("");
  const [note, setNote] = React.useState("");
  const [createLoading, setCreateLoading] = React.useState(false);

  // Pay modal
  const [payingAdvert, setPayingAdvert] = React.useState(null);
  const [payMethod, setPayMethod] = React.useState("mpesa");
  const [payPhone, setPayPhone] = React.useState("");
  const [payLoading, setPayLoading] = React.useState(false);
  const [payMeta, setPayMeta] = React.useState(null);

  const businessId = localStorage.getItem("businessId") || "";

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      if (!businessId) throw new Error("Missing businessId for this account.");

      const resp = await fetch(`${API_ADVERTS}/business/${businessId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load adverts");
      const list = Array.isArray(data.adverts) ? data.adverts : [];
      setAdverts(list);

      // Best-effort: sign media URLs for visible previews.
      const keys = list.map((a) => a?.media?.key).filter(Boolean);
      const unique = Array.from(new Set(keys));
      const missing = unique.filter((k) => !mediaUrls[k]);
      if (missing.length > 0) {
        const pairs = await Promise.all(missing.map(async (k) => [k, await signUrl({ token, key: k })]));
        setMediaUrls((prev) => {
          const next = { ...prev };
          for (const [k, url] of pairs) if (url) next[k] = url;
          return next;
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load adverts");
    } finally {
      setLoading(false);
    }
  }, [businessId, mediaUrls]);

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const filtered = React.useMemo(() => {
    const q = safeLower(query).trim();
    return adverts.filter((a) => {
      if (status !== "all" && a.status !== status) return false;
      if (!q) return true;
      const parts = [
        a._id,
        a.status,
        a.mediaType,
        a.title,
        a.note,
        a.currency,
        a.priceAmount,
        a.paymentId,
      ]
        .map(safeLower)
        .join(" ");
      return parts.includes(q);
    });
  }, [adverts, query, status]);

  const counts = React.useMemo(() => {
    const c = { all: adverts.length, pending_payment: 0, active: 0, rejected: 0, archived: 0 };
    for (const a of adverts) {
      if (c[a.status] != null) c[a.status] += 1;
    }
    return c;
  }, [adverts]);

  const createAdvert = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      if (!businessId) throw new Error("Missing businessId for this account.");
      if (!file) throw new Error("Select an image or video file");

      const fd = new FormData();
      fd.append("media", file);
      if (title.trim()) fd.append("title", title.trim());
      if (note.trim()) fd.append("note", note.trim());

      const resp = await fetch(`${API_ADVERTS}/business/${businessId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to create advert");

      setMessage("Advert created. Complete payment to activate it.");
      setFile(null);
      setTitle("");
      setNote("");
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to create advert");
    } finally {
      setCreateLoading(false);
    }
  };

  const openPay = (ad) => {
    setPayingAdvert(ad);
    setPayMethod("mpesa");
    setPayPhone("");
    setPayMeta(null);
  };

  const closePay = () => {
    if (payLoading) return;
    setPayingAdvert(null);
    setPayMeta(null);
  };

  const pay = async () => {
    if (!payingAdvert?._id) return;
    setPayLoading(true);
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      if (!businessId) throw new Error("Missing businessId for this account.");

      const body = { method: payMethod };
      if (payMethod === "mpesa") {
        if (!payPhone.trim()) throw new Error("Phone is required for M-Pesa payments");
        body.phone = payPhone.trim();
      }

      const resp = await fetch(`${API_ADVERTS}/business/${businessId}/${payingAdvert._id}/pay`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to initiate payment");

      setPayMeta(data?.meta || {});
      setMessage("Payment initiated. Follow the instructions for your provider.");
      await load();

      if (data?.meta?.approvalUrl) {
        window.open(data.meta.approvalUrl, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to initiate payment");
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Adverts</h2>
          <p className="text-sm text-gray-600 mt-1">Create adverts and activate them by paying the advert fee.</p>
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

      {message ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-sm">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        {/* Create */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-sm font-semibold text-gray-900">Create advert</div>
          <div className="text-xs text-gray-500 mt-1">Upload image/video. Max 10 pending/active adverts per business.</div>

          <form onSubmit={createAdvert} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Media (image or video)</label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title (optional)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="e.g. Weekend discount"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-2xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Extra details to help you identify the advert"
              />
            </div>
            <button
              type="submit"
              disabled={createLoading}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
            >
              {createLoading ? "Creating…" : "Create advert"}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">My adverts</div>
              <div className="text-xs text-gray-500 mt-1">Pending adverts require payment to become active.</div>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-64 max-w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="title, status…"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { key: "all", label: `All (${counts.all})` },
              { key: "pending_payment", label: `Pending (${counts.pending_payment})` },
              { key: "active", label: `Active (${counts.active})` },
              { key: "archived", label: `Archived (${counts.archived})` },
              { key: "rejected", label: `Rejected (${counts.rejected})` },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setStatus(t.key)}
                className={`h-9 px-3 rounded-xl text-sm font-semibold border ${
                  status === t.key
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-4 border border-gray-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs font-semibold text-gray-600">
                    <th className="px-4 py-3">Media</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Action</th>
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
                        No adverts found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((a) => {
                      const url = a?.media?.key ? mediaUrls[a.media.key] : null;
                      return (
                        <tr key={a._id} className="align-top">
                          <td className="px-4 py-4">
                            <div className="w-20 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                              {a.mediaType === "image" && url ? (
                                <img src={url} alt="ad" className="w-full h-full object-cover" />
                              ) : a.mediaType === "video" && url ? (
                                <video src={url} className="w-full h-full object-cover" muted />
                              ) : (
                                <div className="text-xs text-gray-500">{a.mediaType || "media"}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-semibold text-gray-900">{a.title || "—"}</div>
                            {a.note ? <div className="text-xs text-gray-500 mt-1 line-clamp-2">{a.note}</div> : null}
                          </td>
                          <td className="px-4 py-4">
                            <span className={badge(a.status)}>{a.status}</span>
                            {a.paidAt ? (
                              <div className="text-xs text-gray-500 mt-2">
                                Paid: {new Date(a.paidAt).toLocaleString()}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-4 text-gray-700 whitespace-nowrap">
                            {formatMoney(a.priceAmount || 0, a.currency || "KES")}
                          </td>
                          <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                            {a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openPay(a)}
                                disabled={a.status !== "pending_payment"}
                                className="h-9 px-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                Pay
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {payingAdvert ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closePay} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
              <div className="p-5 border-b border-gray-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Pay advert fee</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatMoney(payingAdvert.priceAmount || 0, payingAdvert.currency || "KES")}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closePay}
                    disabled={payLoading}
                    className="h-9 px-3 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 disabled:opacity-50"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    <option value="mpesa">M-Pesa</option>
                    <option value="paypal">PayPal</option>
                    <option value="card">Card</option>
                  </select>
                </div>

                {payMethod === "mpesa" ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">M-Pesa phone</label>
                    <input
                      value={payPhone}
                      onChange={(e) => setPayPhone(e.target.value)}
                      className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="2547XXXXXXXX"
                    />
                    <div className="text-xs text-gray-500 mt-2">
                      You should receive an STK prompt on your phone.
                    </div>
                  </div>
                ) : null}

                {payMethod === "paypal" ? (
                  <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    PayPal will open an approval link in a new tab.
                  </div>
                ) : null}

                {payMethod === "card" ? (
                  <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    Card payments may return a client secret (Stripe) depending on your backend provider setup.
                  </div>
                ) : null}

                {payMeta ? (
                  <pre className="text-xs bg-gray-50 border border-gray-200 rounded-2xl p-4 overflow-auto max-h-[220px]">
                    {JSON.stringify(payMeta, null, 2)}
                  </pre>
                ) : null}
              </div>

              <div className="p-5 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={pay}
                  disabled={payLoading}
                  className="h-10 px-4 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {payLoading ? "Processing…" : "Pay now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

