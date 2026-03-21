import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingBag,
  Menu as MenuIcon,
  Megaphone,
  Wallet,
  DollarSign,
  MessageSquare,
  Star,
  Settings,
  Bell,
  FileText,
  X,
} from "lucide-react";

const API_ME = "http://localhost:4000/api/users/me";
const API_BUSINESS = "http://localhost:4000/api/business";
const API_MEDIA = "http://localhost:4000/api/media";
const NOTIFICATIONS_BASE = "http://localhost:4000/api/notifications";

const signUrl = async ({ token, key }) => {
  if (!key) return "";
  const resp = await fetch(`${API_MEDIA}/signed?key=${encodeURIComponent(key)}&expiresInSeconds=600`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  if (!resp.ok || !data?.success) return "";
  return data.url || "";
};

const routeForNotification = (n) => {
  const type = n?.type;
  if (type === "payout_request") return "/admin/payouts";
  if (type === "complaint") return "/admin/complaints";
  if (type === "review") return "/admin/reviews";
  if (type === "order") return "/admin/orders";
  if (type === "advert") return "/admin/adverts";
  return "/admin";
};

const supportEmail = "support@greencastle.co.ke";

const formatWhen = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString();
};

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState({ name: "Admin", role: "admin", email: "", avatarKey: "" });
  const [businessSummary, setBusinessSummary] = React.useState({ name: "", address: "", logoUrl: "" });
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notifications, setNotifications] = React.useState([]);
  const [notificationsLoading, setNotificationsLoading] = React.useState(false);
  const [notificationsError, setNotificationsError] = React.useState("");
  const [markingAll, setMarkingAll] = React.useState(false);
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [profileForm, setProfileForm] = React.useState({ name: "", email: "" });
  const [profileMessage, setProfileMessage] = React.useState("");
  const [profileError, setProfileError] = React.useState("");
  const [profileSaving, setProfileSaving] = React.useState(false);
  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordMessage, setPasswordMessage] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");

  const navItems = React.useMemo(
    () => [
      { path: "/admin", icon: LayoutDashboard, label: "Overview" ,className: 'text-orange-400' },
      { path: "/admin/orders", icon: ShoppingBag, label: "Orders", className: 'text-green-300' },
      { path: "/admin/job-applications", icon: FileText, label: "Job Applications" , className: 'text-amber-800' },
      { path: "/admin/menu", icon: MenuIcon, label: "Menu", className: 'text-amber-500' },
      { path: "/admin/adverts", icon: Megaphone, label: "Adverts" , className: 'text-pink-700' },
      { path: "/admin/wallet", icon: Wallet, label: "Wallet" ,className: 'text-green-700' },
      { path: "/admin/payouts", icon: DollarSign, label: "Payouts", className: 'text-blue-700' },
      { path: "/admin/complaints", icon: MessageSquare, label: "Complaints", className: 'text-indigo-300' },
      { path: "/admin/reviews", icon: Star, label: "Reviews" , className: 'text-indigo-500' },
      { path: "/admin/settings", icon: Settings, label: "Settings" , className: 'text-amber-500' },
    ],
    []
  );

  const loadBusinessSummary = React.useCallback(async ({ token, businessId, signal }) => {
    if (!token || !businessId) return;
    try {
      const resp = await fetch(`${API_BUSINESS}/${businessId}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success || !data?.business) return;
      const b = data.business;
      const signed = await signUrl({ token, key: b?.logo?.key || "" });
      setBusinessSummary({
        name: b?.name || "",
        address: b?.address || "",
        logoUrl: signed || "",
      });
    } catch {
      // silent: sidebar should still render without business info
    }
  }, []);

  const loadAvatarUrl = React.useCallback(async (avatarKey) => {
    if (!avatarKey) {
      setAvatarUrl("");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const resp = await fetch(
        `${API_MEDIA}/signed?key=${encodeURIComponent(avatarKey)}&expiresInSeconds=600`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await resp.json();
      if (resp.ok && data?.success && data?.url) {
        setAvatarUrl(data.url);
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    void loadAvatarUrl(currentUser?.avatarKey);
  }, [currentUser?.avatarKey, loadAvatarUrl]);

  React.useEffect(() => {
    setProfileForm({
      name: currentUser?.name || "",
      email: currentUser?.email || "",
    });
  }, [currentUser?.name, currentUser?.email]);

  const handleProfileInput = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileMessage("");
    setProfileError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      const resp = await fetch(API_ME, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileForm.name.trim(),
          email: profileForm.email.trim(),
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to update profile");
      setCurrentUser((prev) => ({ ...prev, name: data.user?.name || prev.name, email: data.user?.email || prev.email }));
      setProfileMessage("Profile updated");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirmation must match");
      return;
    }
    setPasswordError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      const resp = await fetch(`${API_ME}/change-password`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to change password");
      setPasswordMessage("Password updated");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Failed to change password");
    }
  };

  const handleAvatarUpload = async (file) => {
    setAvatarUploading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      const fd = new FormData();
      fd.append("image", file);
      const resp = await fetch(`${API_ME}/avatar`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to upload avatar");
      setCurrentUser((prev) => ({ ...prev, avatarKey: data.avatarKey || prev.avatarKey }));
      void loadAvatarUrl(data.avatarKey || currentUser.avatarKey);
      setProfileMessage("Photo updated");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Failed to upload photo");
    } finally {
      setAvatarUploading(false);
    }
  };

  const loadUnreadCount = React.useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const resp = await fetch(`${NOTIFICATIONS_BASE}/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (resp.ok && data?.success) setUnreadCount(Number(data.count) || 0);
    } catch {
      // ignore
    }
  }, []);

  const loadNotifications = React.useCallback(async ({ includeRead = false } = {}) => {
    setNotificationsLoading(true);
    setNotificationsError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      const qs = new URLSearchParams();
      qs.set("limit", "30");
      if (includeRead) qs.set("includeRead", "true");

      const resp = await fetch(`${NOTIFICATIONS_BASE}?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load notifications");
      const list = Array.isArray(data.notifications) ? data.notifications : [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.readAt).length);
    } catch (e) {
      setNotificationsError(e instanceof Error ? e.message : "Failed to load notifications");
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const markRead = React.useCallback(async (id) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const resp = await fetch(`${NOTIFICATIONS_BASE}/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) return;
      setNotifications((prev) =>
        prev.map((n) =>
          String(n._id) === String(id)
            ? { ...n, readAt: data.notification?.readAt || new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  }, []);

  const markAllRead = React.useCallback(async () => {
    setMarkingAll(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const resp = await fetch(`${NOTIFICATIONS_BASE}/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) return;
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  }, []);

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const controller = new AbortController();
    fetch(API_ME, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data?.success || !data?.user) return;
        setCurrentUser({
          name: data.user.name || "Admin",
          role: data.user.role || "admin",
          email: data.user.email || "",
          avatarKey: data.user.avatar?.key || "",
        });
        if (data.user.role) localStorage.setItem("role", data.user.role);
        if (data.user.businessId) {
          localStorage.setItem("businessId", data.user.businessId);
          void loadBusinessSummary({ token, businessId: data.user.businessId, signal: controller.signal });
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [loadBusinessSummary]);

  React.useEffect(() => {
    void loadUnreadCount();
    const t = setInterval(() => {
      void loadUnreadCount();
    }, 25000);
    return () => clearInterval(t);
  }, [loadUnreadCount]);

  const todayValue = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const initials = React.useMemo(() => {
    const parts = String(currentUser?.name || "").trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "A";
    const second = parts[1]?.[0] || "";
    return (first + second).toUpperCase();
  }, [currentUser?.name]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-green-50 border-r border-gray-300 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-300">
            <div className="flex flex-col items-center justify-between mb-4">
              <img src="/systemlogo.png" alt="logo" className="w-60 h-60 -mt-25 -ml-5 -mb-20" />
              <h1 className="text-xl font-semibold text-gray-900">Control Room</h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full p-3 bg-gray-200 rounded-lg">
              <span className="text-sm font-medium text-gray-900">Business Admin</span>
              <div className="mt-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                  {businessSummary.logoUrl ? (
                    <img src={businessSummary.logoUrl} alt="Business logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-gray-500">Logo</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {businessSummary.name || "Business"}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {businessSummary.address || "Address not set"}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 truncate">
                    ID: {localStorage.getItem("businessId") || "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== "/admin" && location.pathname.startsWith(`${item.path}/`));
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <item.icon className={`w-5 h-5 font-bold ${item.className || "text-gray-500"}`} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <button
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("role");
                localStorage.removeItem("businessId");
                window.location.href = "/login";
              }}
              className="mt-2 mb-5 flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 bg-red-200 hover:bg-red-300 w-full"
            >
              <LogOut className="w-5 h-5 text-red-600"  />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col lg:ml-64">
        <header className="bg-white border-b border-gray-300 px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <MenuIcon className="w-5 h-5" />
            </button>

            <div className="flex-1 lg:flex-none">
              <input
                type="date"
                defaultValue={todayValue}
                className="px-4 py-2 border border-orange-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-900"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => {
                    const next = !notificationsOpen;
                    setNotificationsOpen(next);
                    if (next) {
                      void loadNotifications({ includeRead: false });
                      setProfileOpen(false);
                    }
                  }}
                  className="relative p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {unreadCount > 0 ? (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : String(unreadCount)}
                    </span>
                  ) : null}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        <button
                          type="button"
                          onClick={() => void markAllRead()}
                          disabled={markingAll || unreadCount === 0}
                          className="text-xs font-semibold text-gray-700 hover:text-gray-900 disabled:opacity-50"
                        >
                          {markingAll ? "Marking…" : "Mark all read"}
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[360px] overflow-y-auto">
                      {notificationsError ? (
                        <div className="p-4 text-sm text-red-700">{notificationsError}</div>
                      ) : notificationsLoading ? (
                        <div className="p-4 text-sm text-gray-600">Loading…</div>
                      ) : notifications.length === 0 ? (
                        <div className="p-4 text-sm text-gray-600">No notifications.</div>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {notifications.map((n) => {
                            const unread = !n.readAt;
                            return (
                              <button
                                key={n._id}
                                type="button"
                                onClick={() => {
                                  void markRead(n._id);
                                  setNotificationsOpen(false);
                                  navigate(routeForNotification(n));
                                }}
                                className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                                  unread ? "bg-emerald-50/40" : "bg-white"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-gray-900 truncate">
                                      {n.title || "Notification"}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1 line-clamp-2">{n.message || "—"}</div>
                                    <div className="text-[11px] text-gray-500 mt-2">{formatWhen(n.createdAt)}</div>
                                  </div>
                                  {unread ? <span className="mt-1 w-2 h-2 rounded-full bg-emerald-600" /> : null}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="p-3 border-t border-gray-200 bg-gray-50">
                      <button
                        type="button"
                        onClick={() => void loadNotifications({ includeRead: true })}
                        className="w-full h-9 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm font-semibold text-gray-800"
                      >
                        View read notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900">{currentUser?.name || "Admin"}</p>
                  <p className="text-xs text-gray-600">Business Admin</p>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    const next = !profileOpen;
                    setProfileOpen(next);
                    if (next) setNotificationsOpen(false);
                    event.stopPropagation();
                  }}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="User avatar" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-gray-900">{initials}</span>
                  )}
                </button>
                {profileOpen && (
                  <div
                    className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-gray-200 bg-white shadow-lg"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="rounded-t-2xl bg-white p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full border border-gray-200 bg-gray-100">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="User avatar" className="h-full w-full rounded-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm font-semibold text-gray-500">
                              {initials}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{currentUser?.name || "Admin"}</p>
                          <p className="text-xs text-gray-600">{currentUser?.email || "no email set"}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-gray-500">
                        Update your account, change password, or contact support.
                      </p>
                    </div>
                    <div className="border-t border-gray-100 p-4 space-y-3">
                      {profileMessage ? (
                        <div className="rounded-xl bg-emerald-50 p-2 text-xs font-semibold text-emerald-700">
                          {profileMessage}
                        </div>
                      ) : null}
                      {profileError ? (
                        <div className="rounded-xl bg-red-50 p-2 text-xs font-semibold text-red-700">
                          {profileError}
                        </div>
                      ) : null}
                      <form onSubmit={saveProfile} className="space-y-3">
                        <div>
                          <label className="text-[11px] font-semibold text-gray-600">Full name</label>
                          <input
                            name="name"
                            value={profileForm.name}
                            onChange={handleProfileInput}
                            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-gray-600">Email</label>
                          <input
                            name="email"
                            type="email"
                            value={profileForm.email}
                            onChange={handleProfileInput}
                            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={profileSaving}
                          className="w-full rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {profileSaving ? "Saving…" : "Save profile"}
                        </button>
                      </form>
                      <div className="pt-3 border-t border-gray-100 space-y-3">
                        {passwordMessage ? (
                          <div className="rounded-xl bg-emerald-50 p-2 text-xs font-semibold text-emerald-700">
                            {passwordMessage}
                          </div>
                        ) : null}
                        {passwordError ? (
                          <div className="rounded-xl bg-red-50 p-2 text-xs font-semibold text-red-700">
                            {passwordError}
                          </div>
                        ) : null}
                        <form onSubmit={changePassword} className="space-y-3">
                          <div>
                            <label className="text-[11px] font-semibold text-gray-600">Current password</label>
                            <input
                              name="currentPassword"
                              type="password"
                              value={passwordForm.currentPassword}
                              onChange={(event) =>
                                setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                              }
                              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-gray-600">New password</label>
                            <input
                              name="newPassword"
                              type="password"
                              value={passwordForm.newPassword}
                              onChange={(event) =>
                                setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                              }
                              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-gray-600">Confirm new password</label>
                            <input
                              name="confirmPassword"
                              type="password"
                              value={passwordForm.confirmPassword}
                              onChange={(event) =>
                                setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                              }
                              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                            />
                          </div>
                          <button
                            type="submit"
                            className="w-full rounded-xl bg-gray-900 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                          >
                            Change password
                          </button>
                        </form>
                      </div>
                      <div className="pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                            <span>{avatarUploading ? "Uploading…" : "Upload photo"}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) void handleAvatarUpload(file);
                                event.target.value = "";
                              }}
                            />
                          </label>
                          <a
                            href={`mailto:${supportEmail}?subject=Admin%20Support`}
                            className="rounded-xl border border-transparent px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-100"
                          >
                            Contact support
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {notificationsOpen && (
        <div className="fixed inset-0 z-30" onClick={() => setNotificationsOpen(false)} />
      )}
      {profileOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setProfileOpen(false)} />
      )}
    </div>
  );
};

export default AdminLayout;
