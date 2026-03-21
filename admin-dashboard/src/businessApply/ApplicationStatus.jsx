import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:4000/api/business-applications";

const badgeClass = (status) => {
  const base = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border";
  if (status === "approved") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  if (status === "rejected") return `${base} bg-red-50 text-red-700 border-red-200`;
  return `${base} bg-amber-50 text-amber-800 border-amber-200`;
};

const ApplicationStatus = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = React.useState(location?.state?.email || "");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [applications, setApplications] = React.useState([]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(`${API_BASE}/my-with-credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load status");
      setApplications(Array.isArray(data.applications) ? data.applications : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="w-full max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/systemlogo.png" alt="logo" className="w-60 h-60 -mt-20 -mb-20 object-contain" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Application status</h1>
              <p className="text-sm text-gray-600">Check if your application is pending, approved, or rejected.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/apply")}
            className="h-10 px-4 rounded-xl bg-green-200 hover:bg-green-300 text-black text-sm font-semibold"
          >
            Back
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Email</label>
              <input
                className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Password</label>
              <input
                className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Your password"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={loading || !email || !password}
            onClick={load}
            className="mt-4 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
          >
            {loading ? "Loading…" : "Check status"}
          </button>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Your applications</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {applications.length === 0 ? (
              <div className="p-4 text-sm text-gray-600">No applications found.</div>
            ) : (
              applications.map((app) => (
                <div key={app._id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900">{app.businessName}</div>
                      <div className="text-sm text-gray-600">{app.category}</div>
                      <div className="text-xs text-gray-500 mt-1">{app.address}</div>
                    </div>
                    <span className={badgeClass(app.status)}>{app.status}</span>
                  </div>
                  {app.status === "rejected" && app.rejectionReason ? (
                    <div className="mt-3 text-sm text-red-700">Reason: {app.rejectionReason}</div>
                  ) : null}
                  <div className="mt-2 text-xs text-gray-500">
                    Submitted: {app.createdAt ? new Date(app.createdAt).toLocaleString() : "—"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationStatus;

