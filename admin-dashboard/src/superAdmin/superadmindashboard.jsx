import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

import {
  LayoutDashboard,
  Menu as MenuIcon,
  Wallet,
  DollarSign,
  MessageSquare,
  Megaphone,
  Bell,
  Building2,
  Activity,
  X,
  MapPin,
  Shield,
} from 'lucide-react';

const NOTIFICATIONS_BASE = 'http://localhost:4000/api/notifications';

const routeForNotification = (n) => {
  const type = n?.type;
  if (type === 'business_application') return '/superadmin/businesses';
  if (type === 'payout_request') return '/superadmin/payout-approvals';
  if (type === 'complaint') return '/superadmin/all-complaints';
  if (type === 'advert') return '/superadmin/adverts';
  return '/superadmin/platform';
};

const formatWhen = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleString();
};




export default function SuperAdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState({ name: 'Super Admin', role: 'superadmin' });
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');

  const superAdminNavItems = [
    { path: '/superadmin/platform', icon: LayoutDashboard, label: 'Platform Overview' ,className: 'text-orange-400' },
    { path: '/superadmin/businesses', icon: Building2, label: 'Business Applications', className: 'text-green-300' },
    { path: '/superadmin/business-management', icon: MapPin, label: 'Business Management', className: 'text-green-700' },
    { path: '/superadmin/adverts', icon: Megaphone, label: 'Adverts', className: 'text-pink-700' },
    { path: '/superadmin/system-wallet', icon: Wallet, label: 'System Wallet', className: 'text-blue-700' },
    { path: '/superadmin/payout-approvals', icon: DollarSign, label: 'Payout Approvals', className: 'text-pink-700' },
    { path: '/superadmin/all-complaints', icon: MessageSquare, label: 'All Complaints', className: 'text-indigo-300' },
    { path: '/superadmin/driver-applications', icon: Shield, label: 'Driver Applications', className: 'text-fuchsia-400' },
    { path: '/superadmin/webhook-health', icon: Activity, label: 'Webhook Health', className: 'text-amber-500' },
  ];

  const navItems = superAdminNavItems;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const controller = new AbortController();
    const loadMe = () => {
      fetch('http://localhost:4000/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((data) => {
          if (!data?.success || !data?.user) return;
          setCurrentUser({
            name: data.user.name || 'Super Admin',
            role: data.user.role || 'superadmin',
            avatarKey: data.user.avatar?.key || null,
          });
          if (data.user.role) localStorage.setItem('role', data.user.role);
        })
        .catch(() => {});
    };

    loadMe();

    const onStorage = (e) => {
      if (e.key === 'profileUpdatedAt') loadMe();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('profileUpdated', loadMe);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('profileUpdated', loadMe);
      controller.abort();
    };
  }, []);

  const loadAvatarUrl = async (avatarKey) => {
    try {
      if (!avatarKey) {
        setAvatarUrl('');
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) return;
      const resp = await fetch(
        `http://localhost:4000/api/media/signed?key=${encodeURIComponent(avatarKey)}&expiresInSeconds=600`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await resp.json();
      if (resp.ok && data?.success && data?.url) setAvatarUrl(data.url);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadAvatarUrl(currentUser?.avatarKey);
  }, [currentUser?.avatarKey]);

  const loadUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const resp = await fetch(`${NOTIFICATIONS_BASE}/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (resp.ok && data?.success) setUnreadCount(Number(data.count) || 0);
    } catch {
      // ignore
    }
  };

  const loadNotifications = async ({ includeRead = false } = {}) => {
    setNotificationsLoading(true);
    setNotificationsError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Missing token. Please log in again.');
      const qs = new URLSearchParams();
      qs.set('limit', '30');
      if (includeRead) qs.set('includeRead', 'true');

      const resp = await fetch(`${NOTIFICATIONS_BASE}?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || 'Failed to load notifications');
      const list = Array.isArray(data.notifications) ? data.notifications : [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.readAt).length);
    } catch (e) {
      setNotificationsError(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const resp = await fetch(`${NOTIFICATIONS_BASE}/${id}/read`, {
        method: 'POST',
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
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const resp = await fetch(`${NOTIFICATIONS_BASE}/read-all`, {
        method: 'POST',
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
  };

  useEffect(() => {
    void loadUnreadCount();
    const t = setInterval(() => {
      void loadUnreadCount();
    }, 25000);
    return () => clearInterval(t);
  }, []);

  const todayValue = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const initials = useMemo(() => {
    const parts = String(currentUser?.name || '').trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || 'A';
    const second = parts[1]?.[0] || '';
    return (first + second).toUpperCase();
  }, [currentUser?.name]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-green-50 border-r border-gray-300 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full ">
          {/* Logo & Role Switcher */}
          <div className="p-6 border-b border-gray-500 ">
            <div className="flex flex-col items-center justify-between mb-4 ">
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
              <span className="text-sm font-medium text-gray-900">Super Admin</span>
              <div className="text-xs text-gray-600 mt-1">Platform control</div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 font-bold ${item.className || "text-gray-400"}`} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Logout */}
            <button
              onClick={() => {
                localStorage.removeItem('token');
                window.location.reload();
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 bg-red-200 hover:bg-red-300 w-full mt-4"
            >
              <LogOut className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-300 px-6 py-4 shadow-sm">
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
                className="px-4 py-2 border border-orange-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 "
              />
            </div>

            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => {
                    const next = !notificationsOpen;
                    setNotificationsOpen(next);
                    if (next) void loadNotifications({ includeRead: false });
                  }}
                  className="relative p-2 hover:bg-gray-100 rounded-lg "
                >
                  <Bell className="w-5 h-5 text-red-600" />
                  {unreadCount > 0 ? (
                    <>
                      <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-green-600 text-white text-[10px] font-semibold flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    </>
                  ) : null}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-orange-400">Notifications</h3>
                        <button
                          type="button"
                          onClick={markAllRead}
                          disabled={markingAll || unreadCount === 0}
                          className="h-8 px-3 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 disabled:opacity-50"
                        >
                          {markingAll ? 'Marking…' : 'Mark all read'}
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Unread: <span className="font-semibold text-gray-900">{unreadCount}</span>
                      </div>
                    </div>

                    {notificationsError ? (
                      <div className="p-4 text-sm text-red-700 bg-red-50 border-b border-red-200">
                        {notificationsError}
                      </div>
                    ) : null}

                    <div className="max-h-[360px] overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="p-4 text-sm text-gray-600">Loading…</div>
                      ) : notifications.length === 0 ? (
                        <div className="p-4 text-sm text-gray-600">No new notifications.</div>
                      ) : (
                        notifications.map((n) => {
                          const isRead = Boolean(n.readAt);
                          return (
                            <button
                              key={n._id}
                              type="button"
                              className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 ${
                                isRead ? '' : 'bg-emerald-50/40'
                              }`}
                              onClick={() => {
                                if (!isRead) void markRead(String(n._id));
                                setNotificationsOpen(false);
                                navigate(routeForNotification(n));
                              }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 truncate">
                                    {n.title || 'Notification'}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                                    {n.message || '—'}
                                  </div>
                                  <div className="text-[11px] text-gray-500 mt-2">{formatWhen(n.createdAt)}</div>
                                </div>
                                {!isRead ? (
                                  <span className="mt-1 inline-block w-2 h-2 rounded-full bg-emerald-600" />
                                ) : null}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    <div className="p-3">
                      <button
                        type="button"
                        className="w-full h-9 rounded-lg text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50"
                        onClick={() => void loadNotifications({ includeRead: true })}
                        disabled={notificationsLoading}
                      >
                        Show recent (incl. read)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    const next = !profileOpen;
                    setProfileOpen(next);
                    if (next) setNotificationsOpen(false);
                  }}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100"
                >
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900">{currentUser?.name || 'Admin'}</p>
                    <p className="text-xs text-gray-600">Super Admin</p>
                  </div>
                  <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                </button>

                {profileOpen ? (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                      <div className="text-sm font-semibold text-gray-900 truncate">{currentUser?.name || 'Admin'}</div>
                      <div className="text-xs text-gray-500 mt-1">Manage your account</div>
                    </div>
                    <div className="p-2">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          navigate('/superadmin/account');
                        }}
                        className="w-full text-left h-10 px-3 rounded-lg text-sm font-semibold hover:bg-gray-50"
                      >
                        My Account
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          navigate('/superadmin/system-settings');
                        }}
                        className="w-full text-left h-10 px-3 rounded-lg text-sm font-semibold hover:bg-gray-50"
                      >
                        System Settings
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          navigate('/superadmin/support');
                        }}
                        className="w-full text-left h-10 px-3 rounded-lg text-sm font-semibold hover:bg-gray-50"
                      >
                        Support
                      </button>
                      <div className="h-px bg-gray-200 my-2" />
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem('token');
                          window.location.href = '/login';
                        }}
                        className="w-full text-left h-10 px-3 rounded-lg text-sm font-semibold bg-red-50 hover:bg-red-100 text-red-700"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/.1 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Notifications Overlay */}
      {notificationsOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setNotificationsOpen(false)}
        />
      )}

      {/* Profile Overlay */}
      {profileOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setProfileOpen(false)}
        />
      )}
    </div>
  );
}
