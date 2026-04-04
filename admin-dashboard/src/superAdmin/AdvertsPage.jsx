import React from "react";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

const API_BASE = "http://localhost:4000/api/superadmin";
const API_MEDIA = "http://localhost:4000/api/media";

const safeLower = (v) => String(v || "").toLowerCase();

const signUrl = async ({ token, key, provider }) => {
  if (!key) return null;
  const p = encodeURIComponent(provider || "");
  const resp = await fetch(`${API_MEDIA}/signed?key=${encodeURIComponent(key)}&provider=${p}&expiresInSeconds=600`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  if (!resp.ok || !data?.success) return null;
  return data.url || null;
};

const badge = (status) => {
  const base = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border";
  if (status === "active") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  if (status === "pending_payment") return `${base} bg-amber-50 text-amber-800 border-amber-200`;
  if (status === "expired") return `${base} bg-slate-100 text-slate-800 border-slate-200`;
  if (status === "rejected") return `${base} bg-red-50 text-red-700 border-red-200`;
  return `${base} bg-gray-50 text-gray-700 border-gray-200`;
};

export default function AdvertsPage() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  const [status, setStatus] = React.useState("");
  const [businessId, setBusinessId] = React.useState("");
  const [q, setQ] = React.useState("");
  const [limit, setLimit] = React.useState(100);
  const [adverts, setAdverts] = React.useState([]);
  const [mediaUrlsByKey, setMediaUrlsByKey] = React.useState({});
  const mediaUrlsByKeyRef = React.useRef({});
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmTarget, setConfirmTarget] = React.useState(null);

  React.useEffect(() => {
    mediaUrlsByKeyRef.current = mediaUrlsByKey;
  }, [mediaUrlsByKey]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");

      const qs = new URLSearchParams();
      qs.set("limit", String(limit));
      if (status) qs.set("status", status);
      if (businessId.trim()) qs.set("businessId", businessId.trim());

      const resp = await fetch(`${API_BASE}/adverts?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load adverts");
      const list = Array.isArray(data.adverts) ? data.adverts : [];
      setAdverts(list);

      const keys = list.map((a) => a?.media?.key).filter(Boolean);
      const unique = Array.from(new Set(keys));
      const missing = unique.filter((k) => !mediaUrlsByKeyRef.current?.[k]);
      if (missing.length) {
        const results = await Promise.allSettled(
          missing.map(async (k) => {
            const ad = list.find((x) => x?.media?.key === k);
            return [k, await signUrl({ token, key: k, provider: ad?.media?.provider })];
          })
        );
        const next = {};
        for (const r of results) {
          if (r.status === "fulfilled" && r.value?.[0] && r.value?.[1]) next[r.value[0]] = r.value[1];
        }
        if (Object.keys(next).length) setMediaUrlsByKey((prev) => ({ ...prev, ...next }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load adverts");
    } finally {
      setLoading(false);
    }
  }, [businessId, limit, status]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = React.useMemo(() => {
    const query = safeLower(q).trim();
    if (!query) return adverts;
    return adverts.filter((a) => {
      const parts = [
        a._id,
        a.status,
        a.mediaType,
        a.title,
        a.note,
        a.currency,
        a.priceAmount,
        a.durationDays,
        a?.businessId?._id,
        a?.businessId?.name,
        a?.createdByUserId?._id,
        a?.createdByUserId?.email,
      ]
        .map(safeLower)
        .join(" ");
      return parts.includes(query);
    });
  }, [adverts, q]);

  const requestDeleteAdvert = (ad) => {
    if (!ad?._id) return;
    setConfirmTarget(ad);
    setConfirmOpen(true);
  };

  const deleteAdvert = async (ad) => {
    if (!ad?._id) return;
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");

      const resp = await fetch(`${API_BASE}/adverts/${ad._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to delete advert");
      setMessage("Advert deleted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete advert");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Adverts moderation</h2>
          <p className="text-sm text-gray-600 mt-1">View and delete adverts across all businesses.</p>
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

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">All</option>
              <option value="pending_payment">Pending payment</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="archived">Archived</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">BusinessId (optional)</label>
            <input
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="24-hex Mongo id"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="title, business name, status…"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Limit</label>
            <input
              type="number"
              min={1}
              max={200}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full h-10 px-3 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="px-4 py-3">Media</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Days</th>
                <th className="px-4 py-3">Ends</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-gray-600">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-gray-600">
                    No adverts found.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => {
                  const url = a?.media?.key ? mediaUrlsByKey[a.media.key] : null;
                  const businessName = a?.businessId?.name || String(a?.businessId || "—");
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
                        <div className="font-semibold text-gray-900">{businessName}</div>
                        {a?.createdByUserId?.email ? (
                          <div className="text-xs text-gray-500 mt-1">By: {a.createdByUserId.email}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-900">{a.title || "—"}</div>
                        {a.note ? <div className="text-xs text-gray-500 mt-1 line-clamp-2">{a.note}</div> : null}
                      </td>
                      <td className="px-4 py-4">
                        <span className={badge(a.status)}>{a.status}</span>
                      </td>
                      <td className="px-4 py-4 text-gray-700 whitespace-nowrap">
                        {Number(a.durationDays || 0) ? `${Number(a.durationDays)} d` : "—"}
                      </td>
                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                        {a.endsAt ? new Date(a.endsAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                        {a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => requestDeleteAdvert(a)}
                            className="h-9 px-3 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            disabled={loading}
                          >
                            Delete
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

      <ConfirmDialog
        open={confirmOpen}
        title="Delete advert?"
        description="This also deletes its media file from storage. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await deleteAdvert(confirmTarget);
          setConfirmOpen(false);
          setConfirmTarget(null);
        }}
      />
    </div>
  );
}
