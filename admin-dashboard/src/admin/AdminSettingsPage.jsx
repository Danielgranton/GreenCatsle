import React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

const API_BUSINESS = "http://localhost:4000/api/business";
const API_SETTINGS = "http://localhost:4000/api/business-settings";
const API_MEDIA = "http://localhost:4000/api/media";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

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

const inputClass =
  "w-full h-11 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500";

const labelClass = "block text-xs font-medium text-gray-600 mb-2";

const signUrl = async ({ token, key }) => {
  if (!key) return null;
  const resp = await fetch(`${API_MEDIA}/signed?key=${encodeURIComponent(key)}&expiresInSeconds=600`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  if (!resp.ok || !data?.success) return null;
  return data.url || null;
};

const ClickToSetMarker = ({ onPick }) => {
  useMapEvents({
    click(e) {
      if (!e?.latlng) return;
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
};

const MapViewController = ({ center, zoom }) => {
  const map = useMap();
  React.useEffect(() => {
    if (!center) return;
    map.setView(center, zoom, { animate: true });
    // common fix for "blank map" when container size changes after mount
    setTimeout(() => map.invalidateSize(), 0);
  }, [center, zoom, map]);
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

export default function AdminSettingsPage() {
  const businessId = localStorage.getItem("businessId") || "";
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  const [business, setBusiness] = React.useState(null);
  const [logoUrl, setLogoUrl] = React.useState("");

  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [lat, setLat] = React.useState("");
  const [lng, setLng] = React.useState("");

  const center = React.useMemo(() => {
    const latN = Number(lat);
    const lngN = Number(lng);
    if (Number.isFinite(latN) && Number.isFinite(lngN)) return [latN, lngN];
    return [-1.2921, 36.8219]; // Nairobi fallback
  }, [lat, lng]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      if (!businessId) throw new Error("Missing businessId for this account.");

      const resp = await fetch(`${API_BUSINESS}/${businessId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load business");
      const b = data.business;
      setBusiness(b);
      setName(b?.name || "");
      setAddress(b?.address || "");
      const coords = b?.location?.coordinates;
      if (Array.isArray(coords) && coords.length === 2) {
        setLng(String(coords[0]));
        setLat(String(coords[1]));
      }

      const signed = await signUrl({ token, key: b?.logo?.key || null });
      setLogoUrl(signed || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load business");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onPick = ({ lat: nextLat, lng: nextLng }) => {
    setLat(String(nextLat));
    setLng(String(nextLng));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      if (!businessId) throw new Error("Missing businessId for this account.");

      const latN = Number(lat);
      const lngN = Number(lng);
      if (!Number.isFinite(latN) || !Number.isFinite(lngN)) throw new Error("Pick a valid location on the map");

      const resp = await fetch(`${API_SETTINGS}/business/${businessId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address,
          location: { coordinates: [lngN, latN] },
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) {
        throw new Error(data?.message || `Failed to save settings (HTTP ${resp.status})`);
      }
      setMessage("Settings saved");
      setBusiness(data.business);
      if (data?.business?.name != null) setName(data.business.name);
      if (data?.business?.address != null) setAddress(data.business.address);
      const coords = data?.business?.location?.coordinates;
      if (Array.isArray(coords) && coords.length === 2) {
        setLng(String(coords[0]));
        setLat(String(coords[1]));
      }
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      if (!businessId) throw new Error("Missing businessId for this account.");

      const fd = new FormData();
      fd.append("image", file);
      const resp = await fetch(`${API_SETTINGS}/business/${businessId}/logo`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to upload logo");

      const signed = await signUrl({ token, key: data.logoKey });
      setLogoUrl(signed || "");
      setMessage("Logo updated");
      setBusiness(data.business || business);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload logo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-10 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-600 mt-1">Update your business profile and location.</p>
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

      {message ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-sm">{message}</div>
      ) : null}
      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
        {/* Map card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6">
          <div className="text-sm font-semibold text-gray-800">Business location</div>
          <div className="text-xs text-gray-500 mt-1">Click on the map to move the pin.</div>

          <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 h-[280px] lg:h-[520px]">
            <MapContainer center={center} zoom={15} className="h-full w-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
              <MapReadyFix />
              <MapViewController center={center} zoom={15} />
              <ClickToSetMarker onPick={onPick} />
              {Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) ? (
                <Marker
                  position={[Number(lat), Number(lng)]}
                  icon={makeLogoPinIcon({ logoUrl }) || defaultIcon}
                  draggable
                  eventHandlers={{
                    dragend: (e) => {
                      const pos = e?.target?.getLatLng?.();
                      if (pos) onPick({ lat: pos.lat, lng: pos.lng });
                    },
                  }}
                >
                  <Popup>
                    <div className="text-sm font-semibold">{business?.name || "Business"}</div>
                    <div className="text-xs text-gray-600 mt-1">{address || business?.address || "—"}</div>
                  </Popup>
                </Marker>
              ) : null}
            </MapContainer>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Latitude</label>
              <input value={lat} readOnly className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Longitude</label>
              <input value={lng} readOnly className={inputClass} />
            </div>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6">
          <div className="text-sm font-semibold text-gray-800">Business profile</div>

          <div className="mt-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
              {logoUrl ? <img src={logoUrl} alt="logo" className="w-full h-full object-cover" /> : <span className="text-xs text-gray-500">Logo</span>}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900">{business?.name || name || "—"}</div>
              <div className="text-xs text-gray-500 mt-1">Category: {business?.category || "—"}</div>
              <label className="mt-2 inline-flex items-center h-9 px-3 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 cursor-pointer">
                Change logo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadLogo(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <div className="text-xs text-gray-500 mt-2">Stored in cloud when `STORAGE_PROVIDER=s3`.</div>
            </div>
          </div>

          <form onSubmit={save} className="mt-6 space-y-4">
            <div>
              <label className={labelClass}>Business name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Address</label>
              <textarea
                rows={4}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-2xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
