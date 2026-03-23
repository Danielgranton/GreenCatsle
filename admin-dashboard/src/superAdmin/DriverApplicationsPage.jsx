import React, { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:4000/api/superadmin";
const API_MEDIA = "http://localhost:4000/api/media";

const formatWhen = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString();
};

const getSignedUrl = async (token, key) => {
  if (!token || !key) return "";
  try {
    const resp = await fetch(`${API_MEDIA}/signed?key=${encodeURIComponent(key)}&expiresInSeconds=600`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await resp.json();
    if (resp.ok && data?.success && data?.url) return data.url;
  } catch {
    // ignore
  }
  return "";
};

const Loader = () => (
  <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-600">
    Loading …
  </div>
);

export default function DriverApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [licenseUrls, setLicenseUrls] = useState({});

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const resp = await fetch(`${API_BASE}/driver-applications`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load driver applications");
      setApplications(data.applications || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load driver applications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    const fetchLicenseUrls = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      const missingKeys = Array.from(
        new Set(
          applications
            .map((app) => app.license?.key)
            .filter(Boolean)
            .filter((key) => !licenseUrls[key])
        )
      );
      if (missingKeys.length === 0) return;
      const entries = await Promise.all(
        missingKeys.map(async (key) => [key, await getSignedUrl(token, key)])
      );
      setLicenseUrls((prev) => {
        const next = { ...prev };
        for (const [key, url] of entries) {
          if (url) next[key] = url;
        }
        return next;
      });
    };
    void fetchLicenseUrls();
  }, [applications, licenseUrls]);

  const review = async (id, action) => {
    setActionLoading(id);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token");
      const resp = await fetch(`${API_BASE}/driver-applications/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Action failed");
      setApplications((prev) =>
        prev.map((app) => (String(app._id) === String(id) ? data.application : app))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setActionLoading("");
    }
  };

  const rows = useMemo(() => applications, [applications]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Driver applications</h2>
          <p className="text-sm text-gray-600">Review new driver signups and verify documentation.</p>
        </div>
        <button
          type="button"
          onClick={() => void fetchApplications()}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
      {loading ? (
        <Loader />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-600">
          No driver applications yet.
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Name / Email</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Documents</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((app) => {
                  const key = app.license?.key;
                  const signed = key ? licenseUrls[key] : "";
                  return (
                    <tr key={app._id}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{app.applicantName}</div>
                        <div className="text-[11px] text-gray-500">{app.applicantEmail}</div>
                        {app.applicantPhone ? (
                          <div className="text-[11px] text-gray-500">{app.applicantPhone}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[12px] font-semibold text-gray-900">{app.vehicleType || "—"}</div>
                        <div className="text-[11px] text-gray-500">{app.vehiclePlate || "No plate"}</div>
                      </td>
                      <td className="px-4 py-3">
                        {signed ? (
                          <a href={signed} target="_blank" rel="noreferrer" className="text-xs font-semibold text-emerald-600 hover:underline">
                            View license
                          </a>
                        ) : key ? (
                          <span className="text-[11px] text-gray-500">Preparing…</span>
                        ) : (
                          <span className="text-[11px] text-gray-400">No document</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                            app.status === "pending"
                              ? "bg-amber-50 text-amber-700"
                              : app.status === "approved"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-500">
                        {formatWhen(app.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => review(app._id, "approve")}
                          disabled={actionLoading === String(app._id) || actionLoading === "reject"}
                          className="rounded-xl bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => review(app._id, "reject")}
                          disabled={actionLoading === String(app._id) || actionLoading === "approve"}
                          className="rounded-xl border border-gray-200 px-3 py-1 text-[11px] font-semibold text-gray-600 hover:border-gray-400 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
