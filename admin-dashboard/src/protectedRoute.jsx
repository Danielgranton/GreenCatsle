
import { Navigate } from "react-router-dom";
import React from "react";

export const ProtectedRoute = ({ children, allowedRoles, redirectTo = "/login", syncUser = true }) => {
  const token = localStorage.getItem("token");
  const [checking, setChecking] = React.useState(Boolean(syncUser));
  const [role, setRole] = React.useState(localStorage.getItem("role"));

  React.useEffect(() => {
    if (!syncUser) {
      setChecking(false);
      return;
    }
    if (!token) {
      setChecking(false);
      return;
    }

    const controller = new AbortController();
    fetch("http://localhost:4000/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data?.success) throw new Error(data?.message || "Unauthorized");
        const nextRole = data?.user?.role;
        const businessId = data?.user?.businessId || "";
        if (nextRole) {
          localStorage.setItem("role", nextRole);
          setRole(nextRole);
        }
        localStorage.setItem("businessId", businessId);
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("businessId");
        setRole(null);
      })
      .finally(() => setChecking(false));

    return () => controller.abort();
  }, [syncUser, token]);

  if (!token) return <Navigate to="/login" replace />;

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700">
        Checking session…
      </div>
    );
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!role || !allowedRoles.includes(role)) return <Navigate to={redirectTo} replace />;
  }

  return children;
};
