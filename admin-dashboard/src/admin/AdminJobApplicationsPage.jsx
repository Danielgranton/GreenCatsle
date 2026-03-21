import React, { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:4000/api";
const MEDIA_BASE = "http://localhost:4000/api/media";

const formatWhen = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString();
};

const getSignUrl = async ({ token, key }) => {
  if (!token || !key) return "";
  try {
    const resp = await fetch(`${MEDIA_BASE}/signed?key=${encodeURIComponent(key)}&expiresInSeconds=600`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await resp.json();
    if (resp.ok && data?.success && data?.url) return data.url;
  } catch {
    // ignore
  }
  return "";
};

export default function AdminJobApplicationsPage() {
  const businessId = useMemo(() => localStorage.getItem("businessId") || "", []);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [error, setError] = useState("");
  const [resumeUrls, setResumeUrls] = useState({});

  const fetchJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const qs = new URLSearchParams();
      if (businessId) qs.set("businessId", businessId);
      qs.set("status", "open");
      const resp = await fetch(`${API_BASE}/jobs?${qs.toString()}`);
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load jobs");
      const list = Array.isArray(data.jobs) ? data.jobs : [];
      setJobs(list);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to load jobs");
    } finally {
      setLoadingJobs(false);
    }
  }, [businessId]);

  const ensureResumeUrls = useCallback(
    async (records) => {
      const token = localStorage.getItem("token");
      if (!token) return;
      const missing = Array.from(
        new Set(
          records
            .map((app) => app.resume?.key)
            .filter(Boolean)
            .filter((key) => !resumeUrls[key])
        )
      );
      if (missing.length === 0) return;
      const entries = await Promise.all(
        missing.map(async (key) => [key, await getSignUrl({ token, key })])
      );
      setResumeUrls((prev) => {
        const next = { ...prev };
        for (const [key, url] of entries) {
          if (url) next[key] = url;
        }
        return next;
      });
    },
    [resumeUrls]
  );

  const fetchApplications = useCallback(async () => {
    setLoadingApplications(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      const resp = await fetch(`${API_BASE}/job-applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load applications");
      const list = Array.isArray(data.applications) ? data.applications : [];
      setApplications(list);
      void ensureResumeUrls(list);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to load applications");
    } finally {
      setLoadingApplications(false);
    }
  }, [ensureResumeUrls]);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-10 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Job applications</h2>
          <p className="text-sm text-gray-600 mt-1">Share open roles and collect CVs for review.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void fetchJobs();
            void fetchApplications();
          }}
          className="h-10 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Open roles</p>
              <p className="text-xs text-gray-500">
                Share these openings with candidates — they apply through the public job board.
              </p>
            </div>
            <span className="text-xs font-semibold text-gray-600">
              {loadingJobs ? "Refreshing…" : `${jobs.length} jobs`}
            </span>
          </div>
          {loadingJobs ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-600">
              Loading jobs…
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-600">
              No open jobs yet. Create one in the Jobs section.
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job._id}
                  className="rounded-2xl border border-gray-200 px-4 py-3 text-left transition hover:border-gray-400"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{job.title}</p>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {job.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{job.description || "No description"}</p>
                  {job.salary ? (
                    <p className="text-[11px] font-semibold text-gray-600 mt-2">
                      {`Ksh ${job.salary.toLocaleString()} per month`}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-gray-800">Public job board</p>
          <p className="text-xs text-gray-600">
            Candidates apply themselves at
            <a href="/jobs" className="ml-1 font-semibold text-emerald-600 hover:underline">
              /jobs
            </a>
            .
          </p>
          <p className="text-xs text-gray-600">
            You can review applications below once they are submitted with a CV.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">Received applications</p>
            <p className="text-xs text-gray-500">
              Data is limited to the last {applications.length} applicants for your business.
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-500">{loadingApplications ? "Refreshing…" : `${applications.length} records`}</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Candidate</th>
                <th className="px-3 py-2">Job</th>
                <th className="px-3 py-2">Submitted</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">CV</th>
              </tr>
            </thead>
            <tbody className="text-xs text-gray-700">
              {loadingApplications ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-600">
                    Loading applications…
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-600">
                    No applications yet.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app._id} className="border-t border-gray-100">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-gray-900">{app.applicantName}</p>
                      <p className="text-[11px] text-gray-500">{app.applicantEmail}</p>
                      {app.applicantPhone ? (
                        <p className="text-[11px] text-gray-500">{app.applicantPhone}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-gray-900">{app.jobId?.title || "—"}</p>
                      <p className="text-[11px] text-gray-500">
                        {app.coverLetter ? (
                          <span className="line-clamp-2">{app.coverLetter}</span>
                        ) : (
                          "No cover letter"
                        )}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      {formatWhen(app.createdAt)}
                      <div className="text-[11px] text-gray-500">Status: {app.status}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-xl bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-600">
                        {app.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {app.resume?.key ? (
                        resumeUrls[app.resume.key] ? (
                          <a
                            href={resumeUrls[app.resume.key]}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-emerald-600 hover:underline"
                          >
                            Download CV
                          </a>
                        ) : (
                          <span className="text-[11px] text-gray-500">Preparing CV…</span>
                        )
                      ) : (
                        <span className="text-[11px] text-gray-400">No file</span>
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
  );
}
