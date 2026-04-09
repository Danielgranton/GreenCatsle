import React from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Eye, EyeOff, Loader2, Mail, Phone, Save, Shield, UserRound } from "lucide-react";
import { API_BASE_URL } from "../lib/apiBase.js";
import { useToast } from "../components/ToastProvider.jsx";

const API_BASE = `${API_BASE_URL}/api`;

const api = async (path, { method = "GET", token, body } = {}) => {
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

const slimUserForStorage = (u) => {
  if (!u || typeof u !== "object") return null;
  const id = u?.id || u?._id || null;
  const avatarKey = u?.avatarKey || u?.avatar?.key || null;
  return {
    id,
    name: u?.name || "",
    email: u?.email || "",
    phone: u?.phone || "",
    role: u?.role || "",
    status: u?.status || "",
    businessId: u?.businessId || null,
    avatarKey,
  };
};

const initials = (name) => {
  const s = String(name || "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p.slice(0, 1).toUpperCase()).join("") || "U";
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || "";
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const lastErrorRef = React.useRef("");
  const lastMessageRef = React.useRef("");
  const lastPwMsgRef = React.useRef("");

  const [me, setMe] = React.useState(null);
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const fileRef = React.useRef(null);

  const [editMode, setEditMode] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");

  const [curPassword, setCurPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [showCur, setShowCur] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [pwBusy, setPwBusy] = React.useState(false);
  const [pwMsg, setPwMsg] = React.useState("");

  React.useEffect(() => {
    if (error && error !== lastErrorRef.current) {
      lastErrorRef.current = error;
      toast({ variant: "error", message: error });
    }
  }, [error, toast]);

  React.useEffect(() => {
    if (message && message !== lastMessageRef.current) {
      lastMessageRef.current = message;
      toast({ variant: "success", message });
    }
  }, [message, toast]);

  React.useEffect(() => {
    if (pwMsg && pwMsg !== lastPwMsgRef.current) {
      lastPwMsgRef.current = pwMsg;
      toast({ variant: "success", message: pwMsg });
    }
  }, [pwMsg, toast]);

  const loadMe = React.useCallback(async () => {
    if (!token) {
      setLoading(false);
      setMe(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { ok, data } = await api("/users/me", { token });
      if (!ok || !data?.success) throw new Error(data?.message || "Failed to load profile");
      const u = data?.user || null;
      setMe(u);
      setName(String(u?.name || ""));
      setEmail(String(u?.email || ""));
      setPhone(String(u?.phone || ""));

      const key = u?.avatar?.key || u?.avatarKey || null;
      if (key) {
        const r = await api(`/media/signed?key=${encodeURIComponent(key)}&expiresInSeconds=600`, { token });
        setAvatarUrl(r.ok && r.data?.success ? String(r.data.url || "") : "");
      } else {
        setAvatarUrl("");
      }

      try {
        const slim = slimUserForStorage(u);
        if (slim) localStorage.setItem("user", JSON.stringify(slim));
        window.dispatchEvent(new Event("gc_user_updated"));
      } catch {
        // ignore
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const saveProfile = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      };
      if (!payload.name) throw new Error("Name is required");
      if (!payload.email) throw new Error("Email is required");

      const { ok, data } = await api("/users/me", { method: "PUT", token, body: payload });
      if (!ok || !data?.success) throw new Error(data?.message || "Failed to update profile");
      setMessage("Profile updated");
      setEditMode(false);
      await loadMe();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update profile");
    } finally {
      setBusy(false);
    }
  };

  const onPickAvatar = async (file) => {
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const { ok, data } = await api("/users/me/avatar", { method: "PUT", token, body: fd });
      if (!ok || !data?.success) throw new Error(data?.message || "Failed to upload avatar");

      const key = String(data.avatarKey || "");
      if (key) {
        const signed = await api(`/media/signed?key=${encodeURIComponent(key)}&expiresInSeconds=600`, { token });
        setAvatarUrl(signed.ok && signed.data?.success ? String(signed.data.url || "") : "");
      }

      try {
        const prev = (() => {
          const raw = localStorage.getItem("user");
          if (!raw) return null;
          return JSON.parse(raw);
        })();
        const next = { ...(prev && typeof prev === "object" ? prev : {}), avatarKey: key };
        localStorage.setItem("user", JSON.stringify(next));
        window.dispatchEvent(new Event("gc_user_updated"));
      } catch {
        // ignore
      }
      setMessage("Avatar updated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload avatar");
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    setPwBusy(true);
    setPwMsg("");
    setError("");
    try {
      const currentPassword = String(curPassword || "");
      const newPw = String(newPassword || "");
      if (!currentPassword || !newPw) throw new Error("Enter current and new password");
      if (newPw.length < 8) throw new Error("New password must be at least 8 characters");

      const { ok, data } = await api("/users/me/change-password", {
        method: "POST",
        token,
        body: { currentPassword, newPassword: newPw },
      });
      if (!ok || !data?.success) throw new Error(data?.message || "Failed to change password");

      if (data?.token) localStorage.setItem("token", String(data.token));
      if (data?.user) localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("gc_user_updated"));

      setCurPassword("");
      setNewPassword("");
      setPwMsg("Password updated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setPwBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <div className="text-lg font-semibold text-yellow-600">Profile</div>
          <div className="text-sm text-gray-600 mt-2 bg-red-100 p-4 rounded-2xl font-bold text-center">Log in to view and edit your profile.</div>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-green-100 hover:bg-gray-50 text-gray-800"
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-2xl font-bold text-gray-900">Profile</div>
          <div className="text-sm text-gray-600 mt-1">Manage your FoodNest account details.</div>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditMode(false);
                  setMessage("");
                  setError("");
                  setName(String(me?.name || ""));
                  setEmail(String(me?.email || ""));
                  setPhone(String(me?.phone || ""));
                }}
                disabled={busy}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveProfile}
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-60 inline-flex items-center gap-2"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMessage("");
                setError("");
                setEditMode(true);
              }}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-semibold disabled:opacity-60"
            >
              Edit profile
            </button>
          )}
        </div>
      </div>

      {(error || message) && (
        <div className="mt-4">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>
          ) : null}
          {message ? (
            <div className="rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm px-4 py-3 mt-2">{message}</div>
          ) : null}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 grid place-items-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full grid place-items-center bg-gradient-to-br from-green-50 to-blue-50">
                    <div className="text-xl font-bold text-gray-800">{initials(me?.name)}</div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click?.()}
                disabled={busy || loading}
                className="absolute -bottom-2 -right-2 h-9 w-9 rounded-full bg-gray-900 text-white grid place-items-center shadow-md hover:bg-black disabled:opacity-60"
                aria-label="Change avatar"
                title="Change avatar"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  void onPickAvatar(f);
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-semibold text-gray-900 truncate">{me?.name || "—"}</div>
              <div className="text-sm text-gray-600 mt-1 truncate">{me?.email || "—"}</div>
              <div className="mt-3 inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                <Shield className="h-3.5 w-3.5" />
                <span className="capitalize">{me?.role || "user"}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            {loading ? "Loading your profile…" : "Tip: Use a square image for best results."}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <div className="text-sm font-semibold text-gray-900">Account details</div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-xs font-medium text-gray-600">Full name</div>
              <div className="mt-2 relative">
                <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!editMode || busy || loading}
                  className="w-full rounded-xl border border-gray-200 bg-white px-10 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-200 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Your name"
                />
              </div>
            </label>

            <label className="block">
              <div className="text-xs font-medium text-gray-600">Email</div>
              <div className="mt-2 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!editMode || busy || loading}
                  className="w-full rounded-xl border border-gray-200 bg-white px-10 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-200 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="you@example.com"
                />
              </div>
            </label>

            <label className="block md:col-span-2">
              <div className="text-xs font-medium text-gray-600">Phone (optional)</div>
              <div className="mt-2 relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!editMode || busy || loading}
                  className="w-full rounded-xl border border-gray-200 bg-white px-10 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-200 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="+254…"
                />
              </div>
            </label>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              {loading ? " " : `Last updated: ${me?.updatedAt ? new Date(me.updatedAt).toLocaleString() : "—"}`}
            </div>
            <button
              type="button"
              onClick={loadMe}
              disabled={busy || loading}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-800 disabled:opacity-60"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="lg:col-span-3 rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sm font-semibold text-gray-900">Security</div>
              <div className="text-xs text-gray-600 mt-1">Change your password. This invalidates other sessions.</div>
            </div>
            {pwMsg ? <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">{pwMsg}</div> : null}
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-xs font-medium text-gray-600">Current password</div>
              <div className="mt-2 relative">
                <input
                  type={showCur ? "text" : "password"}
                  value={curPassword}
                  onChange={(e) => setCurPassword(e.target.value)}
                  disabled={pwBusy || loading}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 pr-10 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-200 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCur((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showCur ? "Hide password" : "Show password"}
                >
                  {showCur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <label className="block">
              <div className="text-xs font-medium text-gray-600">New password</div>
              <div className="mt-2 relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={pwBusy || loading}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 pr-10 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-200 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Min 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
          </div>

          <div className="mt-5 flex items-center justify-end">
            <button
              type="button"
              onClick={changePassword}
              disabled={pwBusy || loading}
              className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-semibold disabled:opacity-60 inline-flex items-center gap-2"
            >
              {pwBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              Update password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
