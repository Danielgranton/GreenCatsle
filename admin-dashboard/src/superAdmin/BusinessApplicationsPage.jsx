import React from "react";

const API_BASE = "http://localhost:4000/api/admin";

const statusBadge = (status) => {
  const base = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border";
  if (status === "approved") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  if (status === "rejected") return `${base} bg-red-50 text-red-700 border-red-200`;
  return `${base} bg-amber-50 text-amber-800 border-amber-200`;
};

const BusinessApplicationsPage = () => {
  const [status, setStatus] = React.useState("pending");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [applications, setApplications] = React.useState([]);
  const [actionLoadingId, setActionLoadingId] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");

      const qs = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
      const resp = await fetch(`${API_BASE}/applications${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load applications");
      setApplications(Array.isArray(data.applications) ? data.applications : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [status]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const approve = async (applicationId) => {
    setActionLoadingId(applicationId);
    try {
      const token = localStorage.getItem("token");
      const resp = await fetch(`${API_BASE}/applications/${applicationId}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to approve");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setActionLoadingId("");
    }
  };

  const reject = async (applicationId) => {
    const reason = window.prompt("Rejection reason (optional):", "");
    if (reason === null) return;

    setActionLoadingId(applicationId);
    try {
      const token = localStorage.getItem("token");
      const resp = await fetch(`${API_BASE}/applications/${applicationId}/reject`, {
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
      setActionLoadingId("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Business applications</h2>
          <p className="text-sm text-gray-600 mt-1">
            Review and approve new business admin accounts.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="h-10 px-4 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "pending", label: "Pending" },
            { key: "approved", label: "Approved" },
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-gray-600" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-600" colSpan={5}>
                    No applications found.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app._id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-900">{app.businessName}</div>
                      <div className="text-gray-600">{app.category}</div>
                      <div className="text-gray-500 mt-1 line-clamp-2">{app.address}</div>
                      {app.rejectionReason ? (
                        <div className="text-xs text-red-700 mt-2">Reason: {app.rejectionReason}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{app.applicantUserId?.name || "—"}</div>
                      <div className="text-gray-600">{app.applicantUserId?.email || "—"}</div>
                      <div className="text-gray-500">{app.applicantUserId?.phone || "—"}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={statusBadge(app.status)}>{app.status}</span>
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {app.createdAt ? new Date(app.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={app.status !== "pending" || actionLoadingId === app._id}
                          onClick={() => approve(app._id)}
                          className="h-9 px-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={app.status !== "pending" || actionLoadingId === app._id}
                          onClick={() => reject(app._id)}
                          className="h-9 px-3 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Reject
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

export default BusinessApplicationsPage;

