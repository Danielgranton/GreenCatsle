import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { defaultIcon } from "../lib/leafletConfig";
import { LocateFixed, Search, X } from "lucide-react";
import { apiUrl } from "../lib/apiBase.js";

const Nairobi = [-1.2921, 36.8219];

const safeLower = (v) => String(v || "").toLowerCase();

const isFiniteLatLng = (v) =>
  Array.isArray(v) && v.length === 2 && Number.isFinite(Number(v[0])) && Number.isFinite(Number(v[1]));

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
    if (!isFiniteLatLng(center)) return;
    map.flyTo([Number(center[0]), Number(center[1])], zoom ?? 15, { duration: 0.8 });
  }, [center, map, zoom]);
  return null;
};

const hasCoords = (b) =>
  Array.isArray(b?.location?.coordinates) &&
  b.location.coordinates.length === 2 &&
  Number.isFinite(Number(b.location.coordinates[0])) &&
  Number.isFinite(Number(b.location.coordinates[1]));

function Pill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 px-3 rounded-full text-xs font-semibold border transition ${
        active ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function ClientMap({ onSelectBusiness }) {
  const [businesses, setBusinesses] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sheet, setSheet] = useState("peek"); // peek | half | full
  const [userLatLng, setUserLatLng] = useState(null);
  const [locStatus, setLocStatus] = useState("idle"); // idle | requesting | granted | denied | error
  const [locMsg, setLocMsg] = useState("");
  const [showLocPrompt, setShowLocPrompt] = useState(false);
  const [hasAuth, setHasAuth] = useState(() => Boolean(localStorage.getItem("token")));
  const requestingLocRef = useRef(false);

  const dragRef = useRef({
    active: false,
    startY: 0,
    startTranslate: 0,
    translate: 0,
    maxTranslate: 0,
    minTranslate: 0,
  });
  const sheetRef = useRef(null);
  const sheetContentRef = useRef(null);

  // Fetch businesses from API
  useEffect(() => {
    const fetchBusinesses = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(apiUrl("/api/business"));
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to load businesses");
        setBusinesses(Array.isArray(data.businesses) ? data.businesses : []);
      } catch (err) {
        setBusinesses([]);
        setError(err instanceof Error ? err.message : "Failed to load businesses");
      } finally {
        setLoading(false);
      }
    };
    fetchBusinesses();
  }, []);

  useEffect(() => {
    const onStorage = () => setHasAuth(Boolean(localStorage.getItem("token")));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const readCached = () => {
      try {
        const raw = sessionStorage.getItem("fn_user_latlng");
        if (!raw) return;
        const obj = JSON.parse(raw);
        const lat = Number(obj?.lat);
        const lng = Number(obj?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        setUserLatLng([lat, lng]);
      } catch {
        // ignore
      }
    };
    if (!hasAuth) return;
    readCached();
    window.addEventListener("fn_user_latlng_updated", readCached);
    return () => window.removeEventListener("fn_user_latlng_updated", readCached);
  }, [hasAuth]);

  useEffect(() => {
    // Show a one-time prompt to enable location (Bolt/Uber style).
    if (!hasAuth) {
      setShowLocPrompt(false);
      return;
    }
    try {
      const dismissed = sessionStorage.getItem("fn_loc_prompt_dismissed") === "1";
      const enabled = sessionStorage.getItem("fn_location_enabled") === "1";
      if (!dismissed && !enabled) setShowLocPrompt(true);
    } catch {
      setShowLocPrompt(true);
    }
  }, [hasAuth]);

  const categories = useMemo(() => {
    const list = Array.from(new Set(businesses.map((b) => b?.category).filter(Boolean)));
    list.sort((a, b) => String(a).localeCompare(String(b)));
    return list;
  }, [businesses]);

  const pins = useMemo(() => businesses.filter(hasCoords), [businesses]);

  const filteredPins = useMemo(() => {
    const q = safeLower(query).trim();
    return pins.filter((b) => {
      if (category && String(b?.category || "") !== String(category)) return false;
      if (!q) return true;
      const hay = [b?._id, b?.name, b?.category, b?.address].map(safeLower).join(" ");
      return hay.includes(q);
    });
  }, [pins, query, category]);

  const selectedBusiness = filteredPins.find((b) => b._id === selectedId) || filteredPins[0] || null;
  const selectedLatLngRaw = selectedBusiness
    ? [Number(selectedBusiness.location.coordinates[1]), Number(selectedBusiness.location.coordinates[0])]
    : null;
  const selectedLatLng = isFiniteLatLng(selectedLatLngRaw) ? selectedLatLngRaw : null;
  const requestLocation = useCallback(async () => {
    if (requestingLocRef.current) return;
    requestingLocRef.current = true;

    setLocMsg("");
    if (!hasAuth) {
      setLocStatus("denied");
      setLocMsg("Please login to enable location.");
      requestingLocRef.current = false;
      return;
    }
    if (!("geolocation" in navigator)) {
      setLocStatus("error");
      setLocMsg("Geolocation is not supported on this device/browser.");
      requestingLocRef.current = false;
      return;
    }

    setLocStatus("requesting");
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const lat = Number(pos?.coords?.latitude);
      const lng = Number(pos?.coords?.longitude);
      const accuracy = Number(pos?.coords?.accuracy);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error("Failed to read location.");
      }

      if (Number.isFinite(accuracy) && accuracy > 2000) {
        setLocMsg("Your location looks approximate. Turn on GPS/location accuracy for better results.");
      }

      setUserLatLng([lat, lng]);
      setLocStatus("granted");

      try {
        sessionStorage.setItem("fn_location_enabled", "1");
        sessionStorage.setItem("fn_user_latlng", JSON.stringify({ lat, lng, accuracy, at: Date.now() }));
      } catch {
        // ignore
      }

      setShowLocPrompt(false);
    } catch (e) {
      const code = e?.code;
      if (code === 1) {
        setLocStatus("denied");
        setLocMsg("Permission denied. Enable location in browser settings to use this feature.");
      } else {
        setLocStatus("error");
        setLocMsg("Could not get your location. Please try again.");
      }
    } finally {
      requestingLocRef.current = false;
    }
  }, [hasAuth]);

  useEffect(() => {
    try {
      const enabled = sessionStorage.getItem("fn_location_enabled") === "1";
      if (hasAuth && enabled && !userLatLng) {
        void requestLocation();
      }
    } catch {
      // ignore
    }
  }, [hasAuth, requestLocation, userLatLng]);

  const sheetTranslateForState = (state, maxTranslate) => {
    if (state === "full") return Math.max(0, Math.round(maxTranslate * 0.15));
    if (state === "half") return Math.max(0, Math.round(maxTranslate * 0.45));
    return Math.max(0, Math.round(maxTranslate * 0.78)); // peek
  };

  const applySheetTranslate = (translate) => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transform = `translateY(${translate}px)`;
    dragRef.current.translate = translate;
  };

  const snapSheet = (state) => {
    const el = sheetRef.current;
    if (!el) return;
    const maxTranslate = Math.max(0, el.offsetHeight - 120);
    dragRef.current.maxTranslate = maxTranslate;
    const t = sheetTranslateForState(state, maxTranslate);
    el.style.transition = "transform 220ms cubic-bezier(.2,.8,.2,1)";
    applySheetTranslate(t);
    window.setTimeout(() => {
      if (sheetRef.current) sheetRef.current.style.transition = "";
    }, 240);
    setSheet(state);
  };

  useEffect(() => {
    // Initialize translate on mount & resize.
    const init = () => {
      const el = sheetRef.current;
      if (!el) return;
      const maxTranslate = Math.max(0, el.offsetHeight - 120);
      dragRef.current.maxTranslate = maxTranslate;
      applySheetTranslate(sheetTranslateForState(sheet, maxTranslate));
    };
    init();
    window.addEventListener("resize", init);
    return () => window.removeEventListener("resize", init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAuth]);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const maxTranslate = Math.max(0, el.offsetHeight - 120);
    dragRef.current.maxTranslate = maxTranslate;
    applySheetTranslate(sheetTranslateForState(sheet, maxTranslate));
  }, [sheet, filteredPins.length]);

  const onSheetPointerDown = (e) => {
    if (!sheetRef.current) return;
    // If scrolling inside content, don't start a drag unless at top.
    if (sheetContentRef.current && sheetContentRef.current.scrollTop > 0) return;

    dragRef.current.active = true;
    dragRef.current.startY = e.clientY;
    dragRef.current.startTranslate = dragRef.current.translate || 0;
    sheetRef.current.setPointerCapture?.(e.pointerId);
  };

  const onSheetPointerMove = (e) => {
    if (!dragRef.current.active) return;
    const el = sheetRef.current;
    if (!el) return;
    const dy = e.clientY - dragRef.current.startY;
    const maxTranslate = dragRef.current.maxTranslate || Math.max(0, el.offsetHeight - 120);
    const next = Math.max(0, Math.min(maxTranslate, dragRef.current.startTranslate + dy));
    applySheetTranslate(next);
  };

  const onSheetPointerUp = () => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;

    const el = sheetRef.current;
    if (!el) return;
    const maxTranslate = dragRef.current.maxTranslate || Math.max(0, el.offsetHeight - 120);
    const t = dragRef.current.translate || 0;

    const fullT = sheetTranslateForState("full", maxTranslate);
    const halfT = sheetTranslateForState("half", maxTranslate);
    const peekT = sheetTranslateForState("peek", maxTranslate);

    const dFull = Math.abs(t - fullT);
    const dHalf = Math.abs(t - halfT);
    const dPeek = Math.abs(t - peekT);

    const nextState = dFull <= dHalf && dFull <= dPeek ? "full" : dHalf <= dPeek ? "half" : "peek";
    snapSheet(nextState);
  };

  return (
    <div className="flex flex-col h-full w-full space-y-3">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900">Map</div>
            <div className="text-xs text-gray-500 mt-1">
              {loading ? "Loading…" : `${filteredPins.length} businesses shown`}
            </div>
          </div>
          <div className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Tap a pin
          </div>
        </div>

        {locMsg ? (
          <div className="mt-3 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-xl p-3">
            {locMsg}
          </div>
        ) : null}

        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search business name…"
              className="w-full h-10 pl-9 pr-10 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg grid place-items-center hover:bg-gray-100"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            <Pill active={!category} onClick={() => setCategory("")}>
              All
            </Pill>
            {categories.slice(0, 10).map((c) => (
              <Pill key={c} active={category === c} onClick={() => setCategory(c)}>
                {c}
              </Pill>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
        ) : null}
      </div>

      <div className="flex-1 min-h-[420px] bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden relative">
        <div className="absolute inset-0 z-0">
          <MapContainer
            center={userLatLng || Nairobi}
            zoom={userLatLng ? 15 : 13}
            style={{ height: "100%", width: "100%" }}
            className="relative z-0"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            <FlyTo center={selectedLatLng} />
            <FlyTo center={userLatLng} zoom={15} />

            {userLatLng ? (
              <CircleMarker
                center={userLatLng}
                radius={8}
                pathOptions={{ color: "#10b981", weight: 3, fillColor: "#10b981", fillOpacity: 0.25 }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent={false}>
                  Your location
                </Tooltip>
              </CircleMarker>
            ) : null}

            {filteredPins.map((b) => {
              const [lng, lat] = b.location.coordinates;
              const logoUrl = b?.logoUrl || b?.logo?.url;

              return (
                <Marker
                  key={b._id}
                  position={[Number(lat), Number(lng)]}
                  icon={makeLogoPinIcon({ logoUrl })}
                  eventHandlers={{
                    click: () => {
                      setSelectedId(b._id);
                      onSelectBusiness?.(b);
                      snapSheet("peek");
                    },
                  }}
                >
                  <Popup>
                    <div className="space-y-1">
                      <div className="font-semibold">{b.name}</div>
                      <div className="text-xs text-gray-600">{b.category}</div>
                      <div className="text-xs text-gray-600">{b.address}</div>
                      <button
                        type="button"
                        className="mt-2 h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                        onClick={() => onSelectBusiness?.(b)}
                      >
                        View menu
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Floating Locate button (Bolt style) */}
        {hasAuth ? (
          <button
            type="button"
            onClick={() => void requestLocation()}
            disabled={locStatus === "requesting"}
            className={`absolute z-30 right-4 bottom-24 h-12 w-12 rounded-full shadow-lg border transition grid place-items-center ${
              userLatLng ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-gray-200 text-gray-800"
            } ${locStatus === "requesting" ? "opacity-70" : "hover:shadow-xl"}`}
            aria-label={userLatLng ? "Re-center to your location" : "Use your current location"}
            title={userLatLng ? "Re-center" : "Use my location"}
          >
            {locStatus === "requesting" ? (
              <span className="inline-block w-5 h-5 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin" />
            ) : (
              <LocateFixed className="w-5 h-5" />
            )}
          </button>
        ) : null}

        {/* One-time location prompt */}
        {hasAuth && showLocPrompt && !userLatLng ? (
          <div className="absolute z-30 left-4 right-4 bottom-40">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900">Enable location?</div>
                  <div className="text-xs text-gray-600 mt-1">
                    FoodNest uses your location to show businesses near you (you can turn this off anytime).
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowLocPrompt(false);
                    try {
                      sessionStorage.setItem("fn_loc_prompt_dismissed", "1");
                    } catch {
                      // ignore
                    }
                  }}
                  className="h-9 w-9 rounded-xl grid place-items-center hover:bg-gray-100 text-gray-600"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={locStatus === "requesting"}
                  onClick={() => void requestLocation()}
                  className="flex-1 h-11 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {locStatus === "requesting" ? "Requesting…" : "Allow location"}
                </button>
                <button
                  type="button"
                  disabled={locStatus === "requesting"}
                  onClick={() => {
                    setShowLocPrompt(false);
                    try {
                      sessionStorage.setItem("fn_loc_prompt_dismissed", "1");
                    } catch {
                      // ignore
                    }
                  }}
                  className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Bottom-sheet list */}
        <div
          ref={sheetRef}
          className="absolute left-0 right-0 bottom-0 z-20 bg-white border-t border-gray-200 rounded-t-2xl shadow-2xl touch-none"
          style={{ transform: "translateY(0px)" }}
          onPointerDown={onSheetPointerDown}
          onPointerMove={onSheetPointerMove}
          onPointerUp={onSheetPointerUp}
          onPointerCancel={onSheetPointerUp}
        >
          <div className="px-4 pt-3 pb-2">
            <div className="w-12 h-1.5 rounded-full bg-gray-300 mx-auto" />
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-gray-900">Businesses</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    snapSheet(sheet === "peek" ? "half" : sheet === "half" ? "full" : "peek");
                  }}
                  className="text-xs font-semibold text-gray-600 hover:text-gray-900"
                >
                  {sheet === "peek" ? "Expand" : sheet === "half" ? "More" : "Collapse"}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuery("");
                    setCategory("");
                  }}
                  className="text-xs font-semibold text-gray-600 hover:text-gray-900"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">{filteredPins.length} results</div>
          </div>

          <div
            ref={sheetContentRef}
            className="px-3 pb-4 overflow-y-auto"
            style={{ maxHeight: "70vh", touchAction: "pan-y" }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              {loading ? (
                <div className="text-sm text-gray-600 px-2">Loading…</div>
              ) : filteredPins.length === 0 ? (
                <div className="text-sm text-gray-600 px-2">No businesses match your filters.</div>
              ) : (
                filteredPins.map((b) => {
                  const isSelected = b._id === selectedId;
                  const logoUrl = b?.logoUrl || b?.logo?.url;
                  return (
                    <div
                      key={b._id}
                      type="button"
                      onClick={() => {
                        setSelectedId(b._id);
                        snapSheet("peek");
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition ${
                        isSelected ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={b.name}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 truncate">{b.name}</div>
                          <div className="text-xs text-gray-600 truncate">{b.category}</div>
                          {b.address ? <div className="text-[11px] text-gray-500 truncate">{b.address}</div> : null}
                        </div>
                        <button
                          type="button"
                          className="h-9 px-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBusiness?.(b);
                            snapSheet("peek");
                          }}
                        >
                          Menu
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ClientMap);
