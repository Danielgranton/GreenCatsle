import React, { useEffect, useState } from "react";

const API_BASE = "http://localhost:4000/api";

const formatWhen = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString();
};

const JobBoardPage = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", coverLetter: "" });
  const [resumeFile, setResumeFile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchJobs = async () => {
      setLoadingJobs(true);
      try {
        const qs = new URLSearchParams();
        qs.set("status", "open");
        const resp = await fetch(`${API_BASE}/jobs?${qs.toString()}`);
        const data = await resp.json();
        if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load jobs");
        const list = Array.isArray(data.jobs) ? data.jobs : [];
        setJobs(list);
        setSelectedJobId((prev) => prev || (list[0]?._id || ""));
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "Failed to load jobs");
      } finally {
        setLoadingJobs(false);
      }
    };

    void fetchJobs();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!selectedJobId) {
      setError("Pick a job before submitting");
      return;
    }
    if (!resumeFile) {
      setError("Please upload a CV (PDF or Word)");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("jobId", selectedJobId);
      formData.append("applicantName", form.name.trim());
      formData.append("applicantEmail", form.email.trim());
      if (form.phone.trim()) formData.append("applicantPhone", form.phone.trim());
      if (form.coverLetter.trim()) formData.append("coverLetter", form.coverLetter.trim());
      formData.append("resume", resumeFile);

      const resp = await fetch(`${API_BASE}/job-applications`, {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to submit application");
      setMessage("Application sent. We received the CV.");
      setForm({ name: "", email: "", phone: "", coverLetter: "" });
      setResumeFile(null);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 md:py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Job opportunities</h1>
            <p className="text-sm text-gray-600">
              Browse open roles from our businesses and apply by submitting your CV. Every application must
              include a resume attachment.
            </p>
          </div>
        </div>
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">Open roles</p>
              <span className="text-xs font-semibold text-gray-500">{loadingJobs ? "Refreshing…" : `${jobs.length} jobs`}</span>
            </div>
            {loadingJobs ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-600">
                Loading jobs…
              </div>
            ) : jobs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-600">
                No roles are open right now.
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <button
                    key={job._id}
                    type="button"
                    onClick={() => setSelectedJobId(job._id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      job._id === selectedJobId
                        ? "border-emerald-500 bg-emerald-50/20"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">{job.title}</p>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{job.status}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{job.description || "No description"}</p>
                    {job.salary ? (
                      <p className="text-[11px] font-semibold text-gray-600 mt-2">{`Ksh ${job.salary.toLocaleString()} / mo`}</p>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Apply with a CV</p>
              <p className="text-xs text-gray-500">Select a job, fill your details, and upload your resume.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600">Target job</label>
                <select
                  value={selectedJobId}
                  onChange={(event) => setSelectedJobId(event.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="">Select a job</option>
                  {jobs.map((job) => (
                    <option key={job._id} value={job._id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Full name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Phone</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Cover letter</label>
                <textarea
                  name="coverLetter"
                  rows={3}
                  value={form.coverLetter}
                  onChange={(event) => setForm((prev) => ({ ...prev, coverLetter: event.target.value }))}
                  className="mt-1 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">CV (PDF or Word)</label>
                <label className="mt-1 flex items-center justify-between rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-600 hover:border-emerald-500">
                  <span>{resumeFile ? resumeFile.name : "Upload CV"}</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) setResumeFile(file);
                      event.target.value = "";
                    }}
                    required
                  />
                </label>
                <p className="text-[10px] text-gray-500 mt-1">Uploading a resume is required</p>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? "Sending…" : "Submit CV"}
              </button>
            </form>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Latest openings</p>
            <span className="text-[11px] font-semibold text-gray-500">{jobs.length} roles</span>
          </div>
          <div className="mt-4 space-y-4">
            {jobs.map((job) => (
              <div key={`preview-${job._id}`} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">{job.title}</p>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{job.status}</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{job.description || "No details"}</p>
                <p className="text-[11px] text-gray-600 mt-3">{`Posted ${formatWhen(job.createdAt)}`}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobBoardPage;
