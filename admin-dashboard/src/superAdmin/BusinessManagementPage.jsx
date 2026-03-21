import React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

const API_BASE = "http://localhost:4000/api/superadmin";
const API_MEDIA = "http://localhost:4000/api/media";

const Nairobi = [-1.2921, 36.8219];

const safeAttr = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const makeLogoPinIcon = ({ logoUrl, selected = false }) => {
  if (!logoUrl) return null;
  const ring = selected ? "#111827" : "#10b981";
  const html = `
    <div style="position:relative;width:44px;height:56px;">
      <div style="width:44px;height:44px;border-radius:9999px;border:3px solid ${ring};background:#fff;overflow:hidden;box-shadow:0 8px 18px rgba(0,0,0,.25);">
        <img src="${safeAttr(logoUrl)}" style="width:100%;height:100%;object-fit:cover;display:block;" />
      </div>
      <div style="position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:14px solid ${ring};filter:drop-shadow(0 4px 6px rgba(0,0,0,.25));"></div>
    </div>
  `;
  return L.divIcon({
    className: "gc-leaflet-icon",
    html,
    iconSize: [44, 56],
    iconAnchor: [22, 56],
    popupAnchor: [0, -54],
  });
};

const signUrl = async ({ token, key }) => {
  if (!key) return null;
  const resp = await fetch(`${API_MEDIA}/signed?key=${encodeURIComponent(key)}&expiresInSeconds=600`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  if (!resp.ok || !data?.success) return null;
  return data.url || null;
};

const statusBadge = (status) => {
  const base = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border";
  if (status === "active") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  return `${base} bg-gray-50 text-gray-700 border-gray-200`;
};

const fmt = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0";
  return String(Math.round(num * 10) / 10);
};

const hasCoords = (b) =>
  Array.isArray(b?.location?.coordinates) &&
  b.location.coordinates.length === 2 &&
  Number.isFinite(Number(b.location.coordinates[0])) &&
  Number.isFinite(Number(b.location.coordinates[1]));

const FlyTo = ({ center, zoom }) => {
  const map = useMap();
  React.useEffect(() => {
    if (!center) return;
    map.flyTo(center, zoom ?? map.getZoom(), { duration: 0.8 });
  }, [center, map, zoom]);
  return null;
};

const MapReadyFix = () => {
  const map = useMap();
  React.useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(t);
  }, [map]);
  return null;
};

export default function BusinessManagementPage() {
  const [status, setStatus] = React.useState("active");
  const [category, setCategory] = React.useState("");
  const [q, setQ] = React.useState("");
  const [limit, setLimit] = React.useState(100);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [businesses, setBusinesses] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [actionLoadingId, setActionLoadingId] = React.useState("");
  const [logoUrlsByKey, setLogoUrlsByKey] = React.useState({});
  const logoUrlsByKeyRef = React.useRef({});

  React.useEffect(() => {
    logoUrlsByKeyRef.current = logoUrlsByKey;
  }, [logoUrlsByKey]);

  const selected = React.useMemo(
    () => businesses.find((b) => String(b._id) === String(selectedId)) || null,
    [businesses, selectedId]
  );

  const selectedLatLng = React.useMemo(() => {
    if (!selected || !hasCoords(selected)) return null;
    const [lng, lat] = selected.location.coordinates;
    return [Number(lat), Number(lng)];
  }, [selected]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");

      const qs = new URLSearchParams();
      qs.set("limit", String(limit));
      if (status) qs.set("status", status);
      if (category) qs.set("category", category);
      if (q.trim()) qs.set("q", q.trim());

      const resp = await fetch(`${API_BASE}/businesses/management?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load businesses");
      const list = Array.isArray(data.businesses) ? data.businesses : [];
      setBusinesses(list);
      if (selectedId && !list.some((b) => String(b._id) === String(selectedId))) setSelectedId("");

      const keys = Array.from(
        new Set(
          list
            .map((b) => b?.logo?.key)
            .filter(Boolean)
            .map((k) => String(k))
        )
      );
      const missing = keys.filter((k) => !logoUrlsByKeyRef.current?.[k]);
      if (missing.length) {
        const results = await Promise.allSettled(missing.map((key) => signUrl({ token, key })));
        const next = {};
        for (let i = 0; i < missing.length; i++) {
          const r = results[i];
          if (r.status === "fulfilled" && r.value) next[missing[i]] = r.value;
        }
        if (Object.keys(next).length) setLogoUrlsByKey((prev) => ({ ...prev, ...next }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load businesses");
    } finally {
      setLoading(false);
    }
  }, [category, limit, q, selectedId, status]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const deactivate = async (businessId) => {
    const ok = window.confirm("Remove this business from the system? This will deactivate it (no new orders).");
    if (!ok) return;
    setActionLoadingId(businessId);
    try {
      const token = localStorage.getItem("token");
      const resp = await fetch(`${API_BASE}/businesses/${businessId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "inactive" }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to deactivate business");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to deactivate business");
    } finally {
      setActionLoadingId("");
    }
  };

  const pins = React.useMemo(() => businesses.filter(hasCoords), [businesses]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Business management</h2>
          <p className="text-sm text-gray-600 mt-1">
            View approved businesses on the map, monitor health, and moderate access.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="h-10 px-4 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
        {/* Map */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-800">Business map</div>
              <div className="text-xs text-gray-500 mt-1">
                Showing <span className="font-semibold text-gray-900">{pins.length}</span> pinned businesses.
              </div>
            </div>
            {selected ? (
              <div className="text-xs text-gray-500">
                Focus: <span className="font-semibold text-gray-900">{selected.name}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 h-[280px] lg:h-[520px]">
            <MapContainer center={Nairobi} zoom={12} style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
              <MapReadyFix />
              <FlyTo center={selectedLatLng} zoom={15} />
              {pins.map((b) => {
                const [lng, lat] = b.location.coordinates;
                const position = [Number(lat), Number(lng)];
                const isSelected = String(b._id) === String(selectedId);
                const logoKey = b?.logo?.key ? String(b.logo.key) : "";
                const logoUrl = logoKey ? logoUrlsByKeyRef.current?.[logoKey] || logoUrlsByKey?.[logoKey] : "";
                return (
                  <Marker
                    key={b._id}
                    position={position}
                    icon={makeLogoPinIcon({ logoUrl, selected: isSelected }) || undefined}
                    eventHandlers={{
                      click: () => setSelectedId(String(b._id)),
                    }}
                  >
                    <Popup>
                      <div className="space-y-1">
                        <div className="font-semibold">{b.name}</div>
                        <div className="text-xs text-gray-600">{b.category}</div>
                        <div className="text-xs text-gray-600">{b.address}</div>
                        <div className="text-xs text-gray-600">
                          Rating: {fmt(b?.metrics?.reviews?.averageRating)} ({b?.metrics?.reviews?.ratingCount || 0})
                        </div>
                        {isSelected ? <div className="text-xs text-emerald-700 font-semibold">Selected</div> : null}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          <div className="mt-3 text-xs text-gray-500">
            Tip: click a pin to open business details and jump to it in the list.
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6">
          <div className="flex flex-col gap-3">
            <div className="text-sm font-semibold text-gray-800">Businesses</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Search</label>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Name, address…"
                  className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="">All</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">All</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="hotel">Hotel</option>
                  <option value="cafe">Cafe</option>
                  <option value="bar">Bar</option>
                  <option value="resort">Resort</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Limit</label>
                <select
                  value={String(limit)}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-900">{businesses.length}</span> businesses.
            </div>
          </div>

          <div className="mt-4 border border-gray-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs font-semibold text-gray-600">
                    <th className="px-4 py-3">Business</th>
                    <th className="px-4 py-3">Reviews</th>
                    <th className="px-4 py-3">Complaints</th>
                    <th className="px-4 py-3">Adverts</th>
                    <th className="px-4 py-3">Orders</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td className="px-4 py-6 text-gray-600" colSpan={6}>
                        Loading…
                      </td>
                    </tr>
                  ) : businesses.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-gray-600" colSpan={6}>
                        No businesses found.
                      </td>
                    </tr>
                  ) : (
                    businesses.map((b) => {
                      const isSelected = String(b._id) === String(selectedId);
                      const reviews = b?.metrics?.reviews || {};
                      const complaints = b?.metrics?.complaints || {};
                      const adverts = b?.metrics?.adverts || {};
                      const orders = b?.metrics?.orders || {};
                      const openComplaints = (complaints.open || 0) + (complaints.in_progress || 0);
                      const lastOrderAt = orders.lastOrderAt ? new Date(orders.lastOrderAt).toLocaleDateString() : "—";

                      return (
                        <tr
                          key={b._id}
                          className={`align-top cursor-pointer ${isSelected ? "bg-emerald-50/40" : "hover:bg-gray-50"}`}
                          onClick={() => setSelectedId(String(b._id))}
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-semibold text-gray-900">{b.name}</div>
                                <div className="text-gray-600">{b.category}</div>
                                <div className="text-gray-500 mt-1 line-clamp-2">{b.address}</div>
                                <div className="mt-2">
                                  <span className={statusBadge(b.status)}>{b.status}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-gray-700 whitespace-nowrap">
                            <div className="font-semibold">{fmt(reviews.averageRating)}</div>
                            <div className="text-xs text-gray-500">{reviews.ratingCount || 0} ratings</div>
                          </td>
                          <td className="px-4 py-4 text-gray-700 whitespace-nowrap">
                            <div className="font-semibold">{openComplaints}</div>
                            <div className="text-xs text-gray-500">open / in progress</div>
                          </td>
                          <td className="px-4 py-4 text-gray-700 whitespace-nowrap">
                            <div className="font-semibold">{adverts.active || 0}</div>
                            <div className="text-xs text-gray-500">{adverts.total || 0} total</div>
                          </td>
                          <td className="px-4 py-4 text-gray-700 whitespace-nowrap">
                            <div className="font-semibold">{orders.orderCount || 0}</div>
                            <div className="text-xs text-gray-500">last: {lastOrderAt}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deactivate(String(b._id));
                                }}
                                disabled={actionLoadingId === String(b._id) || b.status === "inactive"}
                                className="h-9 px-3 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {selected ? (
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{selected.name}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Owner:{" "}
                    <span className="font-semibold text-gray-900">{selected.ownerId?.name || "—"}</span>{" "}
                    <span className="text-gray-500">({selected.ownerId?.email || "—"})</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId("")}
                  className="h-9 px-3 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800"
                >
                  Clear
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-sm">
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <div className="text-xs text-gray-500">Complaints</div>
                  <div className="mt-2 text-gray-700">
                    Open: <span className="font-semibold">{selected.metrics?.complaints?.open || 0}</span>
                  </div>
                  <div className="text-gray-700">
                    In progress: <span className="font-semibold">{selected.metrics?.complaints?.in_progress || 0}</span>
                  </div>
                  <div className="text-gray-700">
                    Resolved: <span className="font-semibold">{selected.metrics?.complaints?.resolved || 0}</span>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <div className="text-xs text-gray-500">Adverts</div>
                  <div className="mt-2 text-gray-700">
                    Active: <span className="font-semibold">{selected.metrics?.adverts?.active || 0}</span>
                  </div>
                  <div className="text-gray-700">
                    Pending pay: <span className="font-semibold">{selected.metrics?.adverts?.pending_payment || 0}</span>
                  </div>
                  <div className="text-gray-700">
                    Archived: <span className="font-semibold">{selected.metrics?.adverts?.archived || 0}</span>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <div className="text-xs text-gray-500">Location</div>
                  <div className="mt-2 text-gray-700 line-clamp-3">{selected.address}</div>
                  {hasCoords(selected) ? (
                    <div className="text-xs text-gray-500 mt-2">
                      Lat/Lng:{" "}
                      {fmt(selected.location.coordinates[1])}, {fmt(selected.location.coordinates[0])}
                    </div>
                  ) : (
                    <div className="text-xs text-amber-700 mt-2">Missing coordinates</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
