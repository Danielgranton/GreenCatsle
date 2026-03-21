import React from "react";

const USERS_BASE = "http://localhost:4000/api/users";
const MEDIA_BASE = "http://localhost:4000/api/media";

const inputClass =
  "w-full h-11 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500";

const labelClass = "block text-xs font-medium text-gray-600 mb-2";

const fetchSignedUrl = async ({ token, key }) => {
  if (!key) return null;
  const resp = await fetch(`${MEDIA_BASE}/signed?key=${encodeURIComponent(key)}&expiresInSeconds=600`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  if (!resp.ok || !data?.success) return null;
  return data.url || null;
};

export default function AccountPage() {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  const [user, setUser] = React.useState(null);
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [prefsInApp, setPrefsInApp] = React.useState(true);
  const [prefsEmail, setPrefsEmail] = React.useState(false);

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [pwSaving, setPwSaving] = React.useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");

      const resp = await fetch(`${USERS_BASE}/me`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load profile");
      const u = data.user;
      setUser(u);
      setName(u?.name || "");
      setEmail(u?.email || "");
      setPhone(u?.phone || "");
      setPrefsInApp(u?.notificationPrefs?.inApp !== false);
      setPrefsEmail(Boolean(u?.notificationPrefs?.email));

      const signed = await fetchSignedUrl({ token, key: u?.avatar?.key || null });
      if (signed) setAvatarUrl(signed);
      else setAvatarUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      const resp = await fetch(`${USERS_BASE}/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, phone }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to update profile");
      setMessage("Profile updated");
      localStorage.setItem("profileUpdatedAt", String(Date.now()));
      window.dispatchEvent(new Event("profileUpdated"));
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      const fd = new FormData();
      fd.append("image", file);
      const resp = await fetch(`${USERS_BASE}/me/avatar`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to upload photo");
      const signed = await fetchSignedUrl({ token, key: data.avatarKey });
      if (signed) setAvatarUrl(signed);
      setMessage("Profile photo updated");
      localStorage.setItem("profileUpdatedAt", String(Date.now()));
      window.dispatchEvent(new Event("profileUpdated"));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload photo");
    } finally {
      setSaving(false);
    }
  };

  const savePrefs = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      const resp = await fetch(`${USERS_BASE}/me/notification-prefs`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inApp: prefsInApp, email: prefsEmail }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to update preferences");
      setMessage("Notification preferences updated");
      localStorage.setItem("profileUpdatedAt", String(Date.now()));
      window.dispatchEvent(new Event("profileUpdated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update preferences");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwSaving(true);
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      const resp = await fetch(`${USERS_BASE}/me/change-password`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to change password");
      if (data.token) localStorage.setItem("token", data.token);
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Password updated");
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  };

  const logoutAll = async () => {
    const ok = window.confirm("Log out all sessions? This will sign you out everywhere, including this device.");
    if (!ok) return;
    setLogoutAllLoading(true);
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      const resp = await fetch(`${USERS_BASE}/me/logout-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to logout sessions");
      localStorage.removeItem("token");
      window.location.href = "/login";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to logout sessions");
    } finally {
      setLogoutAllLoading(false);
    }
  };

  const initials = React.useMemo(() => {
    const n = String(name || user?.name || "").trim();
    if (!n) return "SA";
    const parts = n.split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] || "A").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
  }, [name, user?.name]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-10 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Account</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your profile, security and preferences.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem("token");
            window.location.href = "/login";
          }}
          className="h-10 px-4 rounded-xl bg-red-100 hover:bg-red-200 text-gray-800 text-sm font-semibold"
        >
          Logout
        </button>
      </div>

      {message ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-sm">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
        {/* Profile */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-800">My profile</div>
            {loading ? <div className="text-xs text-gray-500">Loading…</div> : null}
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gray-900 text-white flex items-center justify-center overflow-hidden">
              {avatarUrl ? <img alt="avatar" src={avatarUrl} className="w-full h-full object-cover" /> : initials}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900">{user?.name || name || "—"}</div>
              <div className="text-xs text-gray-500 mt-1">{user?.email || email || "—"}</div>
              <div className="mt-2">
                <label className="inline-flex items-center h-9 px-3 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  Upload photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadAvatar(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                    
              </div>
            </div>
          </div>

          <form onSubmit={saveProfile} className="mt-6 space-y-4">
            <div>
              <label className={labelClass}>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </form>

           <div className="bg-gray-100 rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6 mt-11">
            <div className="text-sm font-semibold text-gray-800">Activity</div>
            <div className="mt-3 text-sm text-gray-700">
              <div>
                Role: <span className="font-semibold">{user?.role || "—"}</span>
              </div>
              <div className="mt-1">
                Last login: <span className="font-semibold">{user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : "—"}</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-3">
              Tip: your notifications list acts as a lightweight activity feed.
            </div>
          </div>
        </div>

        {/* Security + Prefs */}
        <div className="space-y-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6">
            <div className="text-sm font-semibold text-gray-800">Security</div>
            <form onSubmit={changePassword} className="mt-4 space-y-4">
              <div>
                <label className={labelClass}>Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={pwSaving}
                className="w-full h-12 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-semibold disabled:opacity-50"
              >
                {pwSaving ? "Updating…" : "Change password"}
              </button>
            </form>

            <div className="mt-4">
              <button
                type="button"
                onClick={logoutAll}
                disabled={logoutAllLoading}
                className="w-full h-12 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 font-semibold disabled:opacity-50"
              >
                {logoutAllLoading ? "Working…" : "Logout all sessions"}
              </button>
              <div className="text-xs text-gray-500 mt-2">
                This invalidates all JWT sessions using `tokenVersion`.
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6">
            <div className="text-sm font-semibold text-gray-800">Notifications</div>
            <div className="mt-4 space-y-3">
              <label className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-gray-200">
                <div>
                  <div className="text-sm font-semibold text-gray-900">In-app notifications</div>
                  <div className="text-xs text-gray-500 mt-1">Bell alerts inside the dashboard.</div>
                </div>
                <input
                  type="checkbox"
                  checked={prefsInApp}
                  onChange={(e) => setPrefsInApp(e.target.checked)}
                  className="h-5 w-5"
                />
              </label>

              <label className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-gray-200">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Email notifications</div>
                  <div className="text-xs text-gray-500 mt-1">Store preference (email delivery can be added later).</div>
                </div>
                <input
                  type="checkbox"
                  checked={prefsEmail}
                  onChange={(e) => setPrefsEmail(e.target.checked)}
                  className="h-5 w-5"
                />
              </label>

              <button
                type="button"
                onClick={() => void savePrefs()}
                disabled={saving}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save preferences"}
              </button>
            </div>
          </div>

         
        </div>
      </div>
    </div>
  );
}
