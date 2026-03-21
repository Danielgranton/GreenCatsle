import React from "react";

const API_BASE = "http://localhost:4000/api/complaints";

const badge = (status) => {
  const base = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border";
  if (status === "resolved") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  if (status === "rejected") return `${base} bg-red-50 text-red-700 border-red-200`;
  if (status === "in_progress") return `${base} bg-amber-50 text-amber-800 border-amber-200`;
  return `${base} bg-gray-50 text-gray-700 border-gray-200`;
};

const safeLower = (v) => String(v || "").toLowerCase();

export default function AllComplaintsPage() {
  const [status, setStatus] = React.useState("all");
  const [limit, setLimit] = React.useState(100);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [complaints, setComplaints] = React.useState([]);

  const [editing, setEditing] = React.useState(null);
  const [editStatus, setEditStatus] = React.useState("open");
  const [resolution, setResolution] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");

      const qs = new URLSearchParams();
      qs.set("limit", String(limit));
      if (status !== "all") qs.set("status", status);

      const resp = await fetch(`${API_BASE}/all?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load complaints");
      setComplaints(Array.isArray(data.complaints) ? data.complaints : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load complaints");
    } finally {
      setLoading(false);
    }
  }, [limit, status]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const summary = React.useMemo(() => {
    const s = { total: complaints.length, open: 0, in_progress: 0, resolved: 0, rejected: 0 };
    for (const c of complaints) {
      if (c.status === "open") s.open += 1;
      else if (c.status === "in_progress") s.in_progress += 1;
      else if (c.status === "resolved") s.resolved += 1;
      else if (c.status === "rejected") s.rejected += 1;
    }
    return s;
  }, [complaints]);

  const filtered = React.useMemo(() => {
    const q = safeLower(query).trim();
    if (!q) return complaints;
    return complaints.filter((c) => {
      const parts = [
        c._id,
        c.status,
        c.type,
        c.message,
        c.resolution,
        c.orderId,
        c.businessId,
        c.userId,
        c.handledByUserId,
      ].map(safeLower);
      return parts.some((p) => p.includes(q));
    });
  }, [complaints, query]);

  const openEdit = (complaint) => {
    setEditing(complaint);
    setEditStatus(complaint?.status || "open");
    setResolution(complaint?.resolution || "");
  };

  const closeEdit = () => {
    if (saving) return;
    setEditing(null);
    setResolution("");
  };

  const save = async () => {
    if (!editing?._id) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");

      const resp = await fetch(`${API_BASE}/${editing._id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: editStatus, resolution }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to update complaint");

      const updated = data.complaint;
      setComplaints((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      setEditing(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update complaint");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">All complaints</h2>
          <p className="text-sm text-gray-600 mt-1">
            Monitor and resolve customer complaints across all businesses.
          </p>
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

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">{summary.total}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Open</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">{summary.open}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">In progress</div>
          <div className="text-xl font-semibold text-amber-800 mt-1">{summary.in_progress}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Resolved</div>
          <div className="text-xl font-semibold text-emerald-700 mt-1">{summary.resolved}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Rejected</div>
          <div className="text-xl font-semibold text-red-700 mt-1">{summary.rejected}</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "all", label: "All" },
            { key: "open", label: "Open" },
            { key: "in_progress", label: "In progress" },
            { key: "resolved", label: "Resolved" },
            { key: "rejected", label: "Rejected" },
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Search</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Order ID, message, user ID…"
              className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
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
          <div className="text-xs text-gray-500 self-end">
            Showing <span className="font-semibold text-gray-900">{filtered.length}</span> of{" "}
            <span className="font-semibold text-gray-900">{complaints.length}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-gray-600" colSpan={8}>
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-600" colSpan={8}>
                    No complaints found.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c._id} className="align-top">
                    <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                      {c.createdAt ? new Date(c.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span className={badge(c.status)}>{c.status}</span>
                      {c.handledAt ? (
                        <div className="text-xs text-gray-500 mt-2">
                          Handled: {new Date(c.handledAt).toLocaleString()}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-gray-700">{c.type || "—"}</td>
                    <td className="px-4 py-4 text-gray-700">
                      <div className="max-w-[420px]">
                        <div className="line-clamp-2">{c.message || "—"}</div>
                        {c.resolution ? (
                          <div className="text-xs text-gray-500 mt-2 line-clamp-2">
                            Resolution: {c.resolution}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      <div className="max-w-[180px] truncate" title={c.orderId || ""}>
                        {c.orderId || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      <div className="max-w-[180px] truncate" title={c.businessId || ""}>
                        {c.businessId || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      <div className="max-w-[180px] truncate" title={c.userId || ""}>
                        {c.userId || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="h-9 px-3 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeEdit} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-white rounded-2xl border border-gray-200 shadow-xl">
              <div className="p-5 border-b border-gray-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Update complaint</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {editing._id} • {editing.createdAt ? new Date(editing.createdAt).toLocaleString() : "—"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeEdit}
                    disabled={saving}
                    className="h-9 px-3 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 disabled:opacity-50"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-2xl p-4">
                  {editing.message || "—"}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="text-xs text-gray-500 self-end">
                    User: <span className="font-semibold text-gray-900">{editing.userId || "—"}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Resolution (optional)</label>
                  <textarea
                    rows={4}
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Explain what was done (refund, replacement, apology, etc.)"
                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-2xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={saving}
                  className="h-10 px-4 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="h-10 px-4 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

