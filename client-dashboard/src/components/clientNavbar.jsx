import React, { useMemo, useRef, useState , useEffect} from "react";
import {
  Bell,
  User,
  Home,
  Utensils,
  ShoppingCart,
  Settings,
  LogOutIcon,
  ListOrdered,
  AtSign,
  Eye,
  EyeOff,
  Lock,
  UserRound,
  X,
  Globe,
  Share2,
  Camera
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";

const API_USERS = "http://localhost:4000/api/users";
const API_OAUTH = "http://localhost:4000/api/oauth";
const API_CART = "http://localhost:4000/api/cart";
const API_NOTIFICATIONS = "http://localhost:4000/api/notifications";

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
};

const ClientNavbar = () => {
  const navItems = [
    { name: "Home", path: "/#ads-section", icon: Home , className : "text-yellow-500" },
    { name: "Menu", path: "/#menu-section", icon: Utensils , className : "text-blue-600" },
    { name: "Cart", path: "/cart", icon: ShoppingCart, className : "text-orange-600" },
    { name: "Notifications", path: "/notifications", icon: Bell, className : "text-amber-500" },
    { name: "Account",  icon: User, className : "text-green-300" },
  ];

  const [dropDown, setDropDown] = useState(false);
  const location = useLocation();
  const [authUser, setAuthUser] = useState(() => readStoredUser());
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // login | register
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authFieldErrors, setAuthFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);

  const dropDownRef = useRef();
  const authFirstFieldRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
        if (dropDownRef.current && !dropDownRef.current.contains(event.target)) {
            setDropDown(false);
        }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, []);

  useEffect(() => {
    const onStorage = () => setAuthUser(readStoredUser());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const onUser = () => setAuthUser(readStoredUser());
    window.addEventListener("gc_user_updated", onUser);
    return () => window.removeEventListener("gc_user_updated", onUser);
  }, []);

  const loadNotificationCount = async () => {
    try {
      const token = localStorage.getItem("token") || "";
      if (!token) {
        setNotifCount(0);
        return;
      }
      const resp = await fetch(`${API_NOTIFICATIONS}/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.success) {
        setNotifCount(0);
        return;
      }
      setNotifCount(Number(data.count) || 0);
    } catch {
      setNotifCount(0);
    }
  };

  useEffect(() => {
    void loadNotificationCount();
    const onNotif = () => void loadNotificationCount();
    window.addEventListener("gc_notifications_updated", onNotif);
    window.addEventListener("storage", onNotif);
    return () => {
      window.removeEventListener("gc_notifications_updated", onNotif);
      window.removeEventListener("storage", onNotif);
    };
  }, []);

  const accountLabel = useMemo(() => {
    const name = authUser?.name ? String(authUser.name) : "";
    if (!name) return "Account";
    return name.split(" ")[0] || "Account";
  }, [authUser?.name]);

  useEffect(() => {
    if (!authOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !authBusy) setAuthOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [authBusy, authOpen]);

  useEffect(() => {
    if (!authOpen) return;
    setTimeout(() => authFirstFieldRef.current?.focus?.(), 0);
  }, [authMode, authOpen]);

  const submitAuth = async () => {
    setAuthBusy(true);
    setAuthError("");
    setAuthFieldErrors({});
    try {
      const email = authEmail.trim();
      const password = authPassword;
      const name = authName.trim();

      const errs = {};
      if (authMode === "register" && !name) errs.name = "Name is required";
      if (!email) errs.email = "Email is required";
      if (!password) errs.password = "Password is required";
      if (authMode === "register" && password && String(password).length < 8) errs.password = "Min 8 characters";
      if (Object.keys(errs).length) {
        setAuthFieldErrors(errs);
        setAuthBusy(false);
        return;
      }

      const payload = authMode === "register" ? { name, email, password } : { email, password };

      const resp = await fetch(`${API_USERS}/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Authentication failed");

      if (data.token) localStorage.setItem("token", data.token);
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
      setAuthUser(data.user || null);
      setAuthOpen(false);
      setAuthEmail("");
      setAuthPassword("");
      setAuthName("");
      setShowPassword(false);
      window.dispatchEvent(new Event("gc_cart_updated"));
      try {
        sessionStorage.removeItem("fn_loc_prompt_dismissed");
        sessionStorage.removeItem("fn_location_enabled");
      } catch {
        // ignore
      }
      // Hard refresh to ensure the whole app picks up the new auth state everywhere.
      window.location.reload();
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setAuthBusy(false);
    }
  };

  const loadCartCount = async () => {
    try {
      const token = localStorage.getItem("token") || "";
      if (!token) {
        setCartCount(0);
        return;
      }
      const resp = await fetch(`${API_CART}/get`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.success) {
        setCartCount(0);
        return;
      }
      const lines = Array.isArray(data.cart) ? data.cart : [];
      const count = lines.reduce((sum, l) => sum + Math.max(0, Number(l?.quantity || 0)), 0);
      setCartCount(Number.isFinite(count) ? count : 0);
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    void loadCartCount();
    const onCart = (e) => {
      const maybe = e?.detail?.count;
      if (Number.isFinite(maybe)) setCartCount(maybe);
      else void loadCartCount();
    };
    window.addEventListener("gc_cart_updated", onCart);
    window.addEventListener("storage", onCart);
    return () => {
      window.removeEventListener("gc_cart_updated", onCart);
      window.removeEventListener("storage", onCart);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuthUser(null);
    setCartCount(0);
    setDropDown(false);
    try {
      sessionStorage.removeItem("fn_loc_prompt_dismissed");
      sessionStorage.removeItem("fn_location_enabled");
    } catch {
      // ignore
    }
    // Hard refresh to reset app state.
    window.location.reload();
  };

  return (
    <>
    <header className="flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3 shadow-sm sticky top-0 z-50">
      
      {/* Logo */}
      <div className="flex items-center cursor-pointer">
        <img
          onClick={() => navigate("/")}
          src="/systemlogo.png"
          alt="logo"
          className="h-60 -mt-25 -mb-22 w-auto object-contain"
        />
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-8">
        {navItems.filter(Boolean).map((item) => {
          const Icon = item.icon;

            if (item.name === "Account") {
            return (
                <div key={item.name} className="relative" ref={dropDownRef}>
                
                {/* Account Button */}
                <div
                    onClick={() => setDropDown(!dropDown)}
                    className="flex items-center gap-2 text-sm font-medium cursor-pointer text-gray-600 hover:text-green-600"
                >
                    <Icon className={`h-5 w-5 ${item.className}`} />
                    <span>{accountLabel}</span>
                </div>

                {/* Dropdown */}
                {dropDown && (
                    <div className="absolute right-0 mt-6 w-52 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-50">
                      {authUser ? (
                        <>
                          <NavLink
                            to="/profile"
                            onClick={() => setDropDown(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-green-600 transition"
                          >
                            <User className="h-5 w-5 text-green-300" />
                            <span>Profile</span>
                          </NavLink>
                          <NavLink
                            to="/orders"
                            onClick={() => setDropDown(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-green-600 transition"
                          >
                            <ListOrdered className="h-5 w-5 text-orange-600" />
                            <span>Orders</span>
                          </NavLink>
                          <NavLink
                            to="/settings"
                            onClick={() => setDropDown(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-green-600 transition"
                          >
                            <Settings className="h-5 w-5 text-blue-600" />
                            <span>Settings</span>
                          </NavLink>
                          <button
                            type="button"
                            onClick={logout}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-red-600 transition"
                          >
                            <LogOutIcon className="h-5 w-5 text-amber-500" />
                            <span>Logout</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setDropDown(false);
                              setAuthMode("login");
                              setAuthOpen(true);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-green-600 transition"
                          >
                            <User className="h-5 w-5 text-green-300" />
                            <span>Login</span>
                          </button>
                        </>
                      )}

                    </div>
                )}
                </div>
            );
            }

          const path = typeof item.path === "string" ? item.path : "";
          const isSectionLink = path.includes("/#");
          const sectionId = isSectionLink ? path.split("#")[1] : "";
          const isActive = isSectionLink
            ? location.pathname === "/" && location.hash === `#${sectionId}`
            : location.pathname === path;

          return (
            <NavLink
              key={path || item.name}
              to={path || "/"}
              className={`flex items-center gap-2 text-sm font-medium transition-all duration-200 relative ${
                isActive ? "text-green-600" : "text-gray-500 hover:text-green-600"
              }`}
            >
              <Icon className={`h-5 w-5 font-bold ${item.className}`} />
              <span className="relative">
                {item.name}
                {item.name === "Cart" && cartCount > 0 ? (
                  <span className="absolute -top-3 -right-5 min-w-5 h-5 px-1 rounded-full bg-red-400 text-white text-[11px] font-bold grid place-items-center">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                ) : null}
                {item.name === "Notifications" && notifCount > 0 ? (
                  <span className="absolute -top-3 -right-5 min-w-5 h-5 px-1 rounded-full bg-blue-500 text-white text-[11px] font-bold grid place-items-center">
                    {notifCount > 99 ? "99+" : notifCount}
                  </span>
                ) : null}
              </span>
              {isActive ? (
                <span className="absolute -bottom-2 left-0 w-full h-[2px] bg-green-600 rounded-full" />
              ) : null}
            </NavLink>
          );
        })}
      </nav>
    </header>

    {authOpen ? (
      <div className="fixed inset-0 z-[60]">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          onClick={() => {
            if (authBusy) return;
            setAuthOpen(false);
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label={authMode === "login" ? "Login" : "Register"}
          >
            <div className="p-5 border-b border-gray-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900">FoodNest</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {authMode === "login" ? "Welcome back — sign in to continue." : "Create your account in seconds."}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={() => setAuthOpen(false)}
                  className="h-9 w-9 rounded-xl text-gray-600 hover:bg-gray-100 grid place-items-center disabled:opacity-50"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError("");
                    setAuthFieldErrors({});
                  }}
                  className={`h-9 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${
                    authMode === "login" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={() => {
                    setAuthMode("register");
                    setAuthError("");
                    setAuthFieldErrors({});
                  }}
                  className={`h-9 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${
                    authMode === "register" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            <form
              className="p-5 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submitAuth();
              }}
            >
              {authError ? (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{authError}</div>
              ) : null}

              {authMode === "register" ? (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Full name</label>
                  <div
                    className={`h-11 flex items-center gap-2 px-3 rounded-xl border bg-white ${
                      authFieldErrors.name ? "border-red-300" : "border-gray-200"
                    } focus-within:ring-2 focus-within:ring-emerald-500/20`}
                  >
                    <UserRound className="w-4 h-4 text-gray-400" />
                    <input
                      ref={authFirstFieldRef}
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="flex-1 h-full text-sm outline-none"
                      placeholder="e.g. Jane Doe"
                      autoComplete="name"
                    />
                  </div>
                  {authFieldErrors.name ? <div className="text-[11px] text-red-600 mt-1">{authFieldErrors.name}</div> : null}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Email</label>
                  <div
                    className={`h-11 flex items-center gap-2 px-3 rounded-xl border bg-white ${
                      authFieldErrors.email ? "border-red-300" : "border-gray-200"
                    } focus-within:ring-2 focus-within:ring-emerald-500/20`}
                  >
                    <AtSign className="w-4 h-4 text-gray-400" />
                    <input
                      ref={authFirstFieldRef}
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="flex-1 h-full text-sm outline-none"
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>
                  {authFieldErrors.email ? <div className="text-[11px] text-red-600 mt-1">{authFieldErrors.email}</div> : null}
                </div>
              )}

              {authMode === "register" ? (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Email</label>
                  <div
                    className={`h-11 flex items-center gap-2 px-3 rounded-xl border bg-white ${
                      authFieldErrors.email ? "border-red-300" : "border-gray-200"
                    } focus-within:ring-2 focus-within:ring-emerald-500/20`}
                  >
                    <AtSign className="w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="flex-1 h-full text-sm outline-none"
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>
                  {authFieldErrors.email ? <div className="text-[11px] text-red-600 mt-1">{authFieldErrors.email}</div> : null}
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Password</label>
                <div
                  className={`h-11 flex items-center gap-2 px-3 rounded-xl border bg-white ${
                    authFieldErrors.password ? "border-red-300" : "border-gray-200"
                  } focus-within:ring-2 focus-within:ring-emerald-500/20`}
                >
                  <Lock className="w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="flex-1 h-full text-sm outline-none"
                    placeholder="••••••••"
                    autoComplete={authMode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="h-8 w-8 rounded-lg grid place-items-center text-gray-600 hover:bg-gray-100"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {authMode === "register" ? (
                  <div className="text-[11px] text-gray-500 mt-1">Use at least 8 characters.</div>
                ) : null}
                {authFieldErrors.password ? (
                  <div className="text-[11px] text-red-600 mt-1">{authFieldErrors.password}</div>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={authBusy}
                className="w-full h-11 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {authBusy ? "Please wait…" : authMode === "login" ? "Login" : "Create account"}
              </button>

              <div className="relative py-2">
                <div className="h-px bg-gray-200" />
                <div className="absolute inset-0 grid place-items-center">
                  <span className="text-[11px] font-semibold text-gray-500 bg-white px-3">or continue with</span>
                </div>
              </div>

              <div className=" flex flex-wrap gap-2">
                <a
                  href={`${API_OAUTH}/google/start`}
                  className="h-11 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition inline-flex items-center justify-center gap-2 text-sm font-semibold text-gray-800"
                >
                  <Globe className="w-4 h-4" />
                  Google
                </a>
                <a
                  href={`${API_OAUTH}/meta/start?mode=facebook`}
                  className="h-11 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition inline-flex items-center justify-center gap-2 text-sm font-semibold text-gray-800"
                >
                  <Share2 className="w-4 h-4" />
                  Facebook
                </a>
                <a
                  href={`${API_OAUTH}/meta/start?mode=instagram`}
                  className="h-11 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition inline-flex items-center justify-center gap-2 text-sm font-semibold text-gray-800"
                >
                  <Camera className="w-4 h-4" />
                  Instagram
                </a>
              </div>

              <div className="text-xs text-gray-500 text-center">
                By continuing you agree to FoodNest’s terms and privacy policy.
              </div>
            </form>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
};

export default ClientNavbar;
