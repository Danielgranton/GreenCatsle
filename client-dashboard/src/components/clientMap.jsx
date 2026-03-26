import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { defaultIcon } from "../lib/leafletConfig";

const Nairobi = [-1.2921, 36.8219];

const safeAttr = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const makeLogoPinIcon = ({ logoUrl }) => {
  if (!logoUrl) return defaultIcon;
  const html = `
    <div style="position:relative;width:44px;height:56px;">
      <div style="width:44px;height:44px;border-radius:9999px;border:3px solid #10b981;background:#fff;overflow:hidden;box-shadow:0 8px 18px rgba(0,0,0,.25);">
        <img src="${safeAttr(logoUrl)}" style="width:100%;height:100%;object-fit:cover;display:block;" />
      </div>
      <div style="position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:14px solid #10b981;"></div>
    </div>
  `;
  return L.divIcon({
    className: "client-map-icon",
    html,
    iconSize: [44, 56],
    iconAnchor: [22, 56],
    popupAnchor: [0, -54],
  });
};

// Fly to selected marker
const FlyTo = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom ?? 15, { duration: 0.8 });
  }, [center, map, zoom]);
  return null;
};

const hasCoords = (b) =>
  Array.isArray(b?.location?.coordinates) &&
  b.location.coordinates.length === 2 &&
  Number.isFinite(Number(b.location.coordinates[0])) &&
  Number.isFinite(Number(b.location.coordinates[1]));

export default function ClientMap() {
  const [businesses, setBusinesses] = useState([]);
  const [selectedId, setSelectedId] = useState("");

  // Fetch businesses from API
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/business");
        const data = await res.json();
        if (res.ok) setBusinesses(data.businesses || []);
      } catch (err) {
        console.error("Error fetching businesses:", err);
      }
    };
    fetchBusinesses();
  }, []);

  const pins = businesses.filter(hasCoords);
  const selectedBusiness = pins.find((b) => b._id === selectedId);
  const selectedLatLng = selectedBusiness
    ? [Number(selectedBusiness.location.coordinates[1]), Number(selectedBusiness.location.coordinates[0])]
    : null;

  return (
    <div className="flex flex-col h-full w-full space-y-4">
      {/* Info box */}
      <div className="bg-white border-l-4 border-green-500 shadow-md p-4 rounded-lg w-full mx-auto">
        <h2 className="text-green-700 font-semibold mb-2 text-sm">Find food businesses</h2>
        <ul className="text-gray-700 list-disc list-inside space-y-1 text-sm">
          <li>Find your favorite or nearby food businesses.</li>
          <li>See each business on the map.</li>
          <li>Click a marker for details.</li>
        </ul>
      </div>

      {/* Map */}
      <div className="flex-1 w-full h-[500px] rounded-xl overflow-hidden shadow-sm border border-gray-200">
        <MapContainer center={Nairobi} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <FlyTo center={selectedLatLng} />

          {pins.map((b) => {
            const [lng, lat] = b.location.coordinates;
            const logoUrl = b?.logo?.url; // Assume businesses have `logo.url`
            const isSelected = b._id === selectedId;

            return (
              <Marker
                key={b._id}
                position={[Number(lat), Number(lng)]}
                icon={makeLogoPinIcon({ logoUrl })}
                eventHandlers={{ click: () => setSelectedId(b._id) }}
              >
                <Popup>
                  <div className="space-y-1">
                    <div className="font-semibold">{b.name}</div>
                    <div className="text-xs text-gray-600">{b.category}</div>
                    <div className="text-xs text-gray-600">{b.address}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <p className="text-sm text-gray-500 text-center">Tip: Click on a marker to view business details</p>
    </div>
  );
}