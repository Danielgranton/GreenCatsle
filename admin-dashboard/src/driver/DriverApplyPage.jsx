import React, { useState } from "react";
import PageHeader from "../businessApply/PageHeader";

const API_BASE = "http://localhost:4000/api/driver-applications";

const DriverApplyPage = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    vehicleType: "",
    vehiclePlate: "",
  });
  const [licenseFile, setLicenseFile] = useState(null);
  const [status, setStatus] = useState({ message: "", error: "", loading: false });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!licenseFile) {
      setStatus({ message: "", error: "Upload your driver license file", loading: false });
      return;
    }

    setStatus({ message: "", error: "", loading: true });
    try {
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("email", form.email.trim());
      if (form.phone.trim()) formData.append("phone", form.phone.trim());
      if (form.vehicleType.trim()) formData.append("vehicleType", form.vehicleType.trim());
      if (form.vehiclePlate.trim()) formData.append("vehiclePlate", form.vehiclePlate.trim());
      formData.append("license", licenseFile);

      const resp = await fetch(API_BASE, {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message || "Failed to submit application");
      setStatus({ message: data.message || "Application submitted, await approval.", error: "", loading: false });
      setForm({ name: "", email: "", phone: "", vehicleType: "", vehiclePlate: "" });
      setLicenseFile(null);
    } catch (error) {
      setStatus({ message: "", error: error instanceof Error ? error.message : "Submission failed", loading: false });
    }
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-4xl space-y-6">
        <PageHeader title="Driver application" subtitle="Upload your info and license for verification">
          <a
            href="/driver/apply"
            className="h-10 rounded-xl border border-emerald-600 px-4 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-50"
          >
            Apply now
          </a>
          <a
            href="/driver/apply"
            className="h-10 rounded-xl border border-emerald-600 px-4 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-50"
          >
            Check status
          </a>
        </PageHeader>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Driver application</h1>
          <p className="text-xs text-gray-500">
            Apply for a driver account. We will review your documents and notify you once approved.
          </p>
        </div>
        {status.message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {status.message}
          </div>
        )}
        {status.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{status.error}</div>
        )}
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-[11px] font-semibold text-gray-600">Full name</label>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-[11px] font-semibold text-gray-600">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                required
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-[11px] font-semibold text-gray-600">Phone</label>
              <input
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-[11px] font-semibold text-gray-600">Vehicle type</label>
              <input
                value={form.vehicleType}
                onChange={(event) => setForm((prev) => ({ ...prev, vehicleType: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-[11px] font-semibold text-gray-600">Vehicle plate</label>
              <input
                value={form.vehiclePlate}
                onChange={(event) => setForm((prev) => ({ ...prev, vehiclePlate: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-[11px] font-semibold text-gray-600">Driver license (PDF, image)</label>
            <label className="flex items-center justify-between rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-600 hover:border-emerald-500">
              <span>{licenseFile ? licenseFile.name : "Upload your license"}</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setLicenseFile(file);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={status.loading}
            className="w-full rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {status.loading ? "Submitting…" : "Apply for driver account"}
          </button>
        </form>
      </div>
    </div>
  </div>
  );
};

export default DriverApplyPage;
