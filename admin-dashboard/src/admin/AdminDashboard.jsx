import React from "react";

const AdminDashboard = () => {
  const role = localStorage.getItem("role");
  const businessId = localStorage.getItem("businessId");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl p-6">
        <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-600 mt-2">Role: {role || "unknown"}</p>
        <p className="text-sm text-gray-600">BusinessId: {businessId || "not linked"}</p>
        <p className="text-xs text-gray-500 mt-4">
          If you just got approved, log out and log back in to refresh your role/business.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;

