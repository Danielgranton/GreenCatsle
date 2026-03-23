import React from "react";

const DriverDashboardPage = () => {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Welcome back, driver</h1>
            <p className="text-xs text-gray-500">Stay online to receive delivery requests.</p>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">online</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500">Active orders</p>
            <p className="text-2xl font-semibold text-gray-900">0</p>
          </div>
          <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500">Earnings today</p>
            <p className="text-2xl font-semibold text-gray-900">Ksh 0</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700">How it works</h2>
        <ul className="mt-3 space-y-3 text-xs text-gray-600">
          <li>1. Stay signed in while you are available.</li>
          <li>2. Accept delivery requests that appear via the mobile/web socket.</li>
          <li>3. Update status once you pick up and drop off the order.</li>
        </ul>
        <p className="mt-3 text-[11px] text-gray-500">
          Real-time orders and tracking will appear here once a dispatcher assigns you. If nothing shows up, verify
          that your profile is approved and your driver status is set to active.
        </p>
      </div>
    </div>
  );
};

export default DriverDashboardPage;
