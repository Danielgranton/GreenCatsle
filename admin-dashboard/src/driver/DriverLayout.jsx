import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Home, Shield, MapPin } from "lucide-react";

const driverNav = [
  { path: "/driver", label: "Dashboard", icon: Home },
  { path: "/driver/apply", label: "Apply for account", icon: Shield },
  { path: "/jobs", label: "Public job board", icon: MapPin },
];

const DriverLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("businessId");
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden lg:flex w-64 flex-col border-r border-gray-200 bg-white p-6">
        <div className="mb-8">
          <div className="text-lg font-semibold text-gray-900">Driver Portal</div>
          <p className="text-xs text-gray-500 mt-1">Track deliveries and availability</p>
        </div>
        <nav className="flex-1 space-y-2">
          {driverNav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  isActive ? "bg-emerald-50 text-emerald-700" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 lg:hidden">
          <div className="text-lg font-semibold text-gray-900">Driver Portal</div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Logout
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DriverLayout;
