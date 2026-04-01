import React from "react";
import { Bell, Check } from "lucide-react";

const API_BASE = "http://localhost:4000/api";

const fetchJson = async (path, { method = "GET", token, body } = {}) => {
  const resp = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    },
    body: body && !(body instanceof FormData) ? JSON.stringify(body) : body,
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, data };
};

const formatDate = (value) => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
  }
};

const NotificationsPage = () => {
  const token = localStorage.getItem("token") || "";

  const [notifications, setNotifications] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const loadNotifications = React.useCallback(async () => {
    if (!token) {
      setError("Log in to view your notifications.");
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { ok, data } = await fetchJson("/notifications", { token });
      if (!ok || !data?.success) throw new Error(data?.message || "Failed to load notifications");
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch (err) {
      setNotifications([]);
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const markAsRead = React.useCallback(
    async (id) => {
      if (!token || busy) return;
      setBusy(true);
      try {
        const { ok, data } = await fetchJson(`/notifications/${id}/read`, { method: "POST", token });
        if (!ok || !data?.success) throw new Error(data?.message || "Failed to mark read");
        setNotifications((prev) =>
          prev.map((item) => (String(item._id) === String(id) ? { ...item, readAt: data?.notification?.readAt || new Date() } : item))
        );
        window.dispatchEvent(new Event("gc_notifications_updated"));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to mark notification read");
      } finally {
        setBusy(false);
      }
    },
    [token, busy]
  );

  const markAllRead = React.useCallback(async () => {
    if (!token || busy) return;
    setBusy(true);
    try {
      const { ok } = await fetchJson("/notifications/read-all", { method: "POST", token });
      if (!ok) throw new Error("Failed to mark all read");
      setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || new Date() })));
      window.dispatchEvent(new Event("gc_notifications_updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark all read");
    } finally {
      setBusy(false);
    }
  }, [token, busy]);

  React.useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-600" />
            Notifications
          </div>
          <p className="text-sm text-blue-500">Stay on top of business approvals, deliveries, and promos.</p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={!notifications.length || busy}
          className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 bg-blue-400 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Mark all read
        </button>
      </div>

      {error && !token ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error} Please log in via the navbar to see your notifications.
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">Loading notifications…</div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">No notifications yet.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((notification) => {
            const isRead = Boolean(notification.readAt);
            return (
              <div
                key={notification._id}
                className={`rounded-2xl border ${isRead ? "border-gray-200 bg-gray-50" : "border-emerald-200 bg-white"} p-4 shadow-sm`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <span>{notification.title || "Notification"}</span>
                      <span className="text-[11px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">
                        {notification.type || "update"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{notification.message}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-gray-500">{formatDate(notification.createdAt)}</div>
                    {isRead ? (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                        <Check className="h-3 w-3" />
                        Read
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markAsRead(notification._id)}
                        disabled={busy}
                        className="mt-1 text-[11px] font-semibold text-sky-600 hover:underline"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
