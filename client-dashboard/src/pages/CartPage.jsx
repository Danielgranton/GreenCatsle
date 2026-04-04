import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import { MapPin, Phone, Receipt, CreditCard, Wallet, Smartphone, Loader2, CheckCircle, FileText, Truck } from "lucide-react";
import { io } from "socket.io-client";
import { API_BASE_URL } from "../lib/apiBase.js";

const socket = API_BASE_URL ? io(API_BASE_URL) : io();
const API_BASE = `${API_BASE_URL}/api`;

const money = (n) => {
  const v = Number(n || 0);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(v);
  } catch {
    return `KES ${Math.round(v)}`;
  }
};

const toRadians = (value) => (typeof value === "number" ? (value * Math.PI) / 180 : 0);

const haversineDistanceKm = (lat1, lng1, lat2, lng2) => {
  const r = 6371; // Earth radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return r * c;
};

const ratePerKm = 30;

const calculateDeliveryFee = (distanceKm) => {
  const fee = Math.round(Math.max(0, distanceKm) * ratePerKm);
  return {
    fee,
    zoneLabel: "Flat rate",
    perKmRate: ratePerKm,
  };
};

function RouteBoundsUpdater({ bounds }) {
  const map = useMap();
  React.useEffect(() => {
    if (!bounds || bounds.length === 0) return;
    map.fitBounds(bounds, { padding: [20, 20], maxZoom: 16 });
  }, [map, bounds]);
  return null;
}

function CheckoutRouteMap({ routeBounds, businessCoordinates, deliveryCoords, routeLine }) {
  if (!routeBounds?.length && !businessCoordinates && !deliveryCoords) return null;
  const center = businessCoordinates
    ? [businessCoordinates[1], businessCoordinates[0]]
    : deliveryCoords
    ? [deliveryCoords.lat, deliveryCoords.lng]
    : [0, 0];
  return (
    <div className="mb-4 h-52 w-full overflow-hidden rounded-3xl border border-gray-200 shadow-inner">
      <MapContainer bounds={routeBounds || undefined} center={center} zoom={13} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <RouteBoundsUpdater bounds={routeBounds || undefined} />
        {businessCoordinates && <Marker position={[businessCoordinates[1], businessCoordinates[0]]} />}
        {deliveryCoords && <Marker position={[deliveryCoords.lat, deliveryCoords.lng]} />}
        {routeLine.length > 0 && <Polyline positions={routeLine.map((pt) => [pt.lat, pt.lng])} color="#2563eb" weight={4} />}
      </MapContainer>
    </div>
  );
}

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

export default function CartPage() {
  const token = localStorage.getItem("token") || "";

  const [loading, setLoading] = React.useState(false);
  const [mutatingKey, setMutatingKey] = React.useState("");
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [cart, setCart] = React.useState([]);
  const [cartBusinessId, setCartBusinessId] = React.useState("");
  const [imageUrls, setImageUrls] = React.useState({});
  const [businessLocation, setBusinessLocation] = React.useState(null);
  const [businessInfo, setBusinessInfo] = React.useState(null);
  const [distanceKm, setDistanceKm] = React.useState(null);
  const [deliveryFee, setDeliveryFee] = React.useState(0);
  const [deliveryZoneLabel, setDeliveryZoneLabel] = React.useState("");
  const [deliveryPerKmRate, setDeliveryPerKmRate] = React.useState(0);
  const [routeLine, setRouteLine] = React.useState([]);
  const [routeStats, setRouteStats] = React.useState(null);

  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [checkoutLines, setCheckoutLines] = React.useState([]);
  const [checkoutTotal, setCheckoutTotal] = React.useState(0);
  const [payDeliveryFee, setPayDeliveryFee] = React.useState(true);
  const [deliveryAddress, setDeliveryAddress] = React.useState("");
  const [deliveryPhone, setDeliveryPhone] = React.useState("");
  const [deliveryNote, setDeliveryNote] = React.useState("");
  const [deliveryCoords, setDeliveryCoords] = React.useState(null); // { lat, lng }
  const [locBusy, setLocBusy] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState("cash"); // cash | mpesa | paypal | card
  const [paymentPhone, setPaymentPhone] = React.useState("");
  const [placingOrder, setPlacingOrder] = React.useState(false);
  const [paying, setPaying] = React.useState(false);
  const [placedOrderId, setPlacedOrderId] = React.useState("");
  const [paymentMeta, setPaymentMeta] = React.useState(null);
  const [autoLocationAttempted, setAutoLocationAttempted] = React.useState(false);

  const businessCoordinates =
    businessLocation && Array.isArray(businessLocation.coordinates) && businessLocation.coordinates.length >= 2
      ? businessLocation.coordinates
      : null;
  const businessMapHref = businessCoordinates
    ? `https://maps.google.com/?q=${Number(businessCoordinates[1])},${Number(businessCoordinates[0])}`
    : "";

  const routeBounds = React.useMemo(() => {
    if (routeLine.length > 0) return routeLine.map((pt) => [pt.lat, pt.lng]);
    const points = [];
    if (businessCoordinates) points.push([businessCoordinates[1], businessCoordinates[0]]);
    if (deliveryCoords) points.push([deliveryCoords.lat, deliveryCoords.lng]);
    return points.length ? points : null;
  }, [routeLine, businessCoordinates, deliveryCoords]);

  const navigate = useNavigate();

  const loadBusinessLocation = React.useCallback(async (businessId) => {
    if (!businessId) {
      setBusinessLocation(null);
      setBusinessInfo(null);
      return;
    }
    try {
      const { ok, data } = await api(`/business/${businessId}/public`);
      if (ok && data?.success && data.business?.location) {
        setBusinessLocation(data.business.location);
        setBusinessInfo({
          name: data.business.name,
          address: data.business.address,
          category: data.business.category,
          rating: data.business.rating,
        });
        return;
      }
    } catch {
      // ignore
    }
    setBusinessLocation(null);
    setBusinessInfo(null);
  }, []);

  const loadCart = React.useCallback(async ({ silent = false } = {}) => {
    if (!token) return;
    if (!silent) setLoading(true);
    setError("");
    setMessage("");
    try {
      const { ok, data } = await api("/cart/get", { token });
      if (!ok || !data?.success) throw new Error(data?.message || "Failed to load cart");
      const lines = Array.isArray(data.cart) ? data.cart : [];
      setCart(lines);
      const nextBusinessId = data?.cartBusinessId ? String(data.cartBusinessId) : "";
      setCartBusinessId(nextBusinessId);
      void loadBusinessLocation(nextBusinessId);
      const count = lines.reduce((sum, l) => sum + Math.max(0, Number(l?.quantity || 0)), 0);
      window.dispatchEvent(new CustomEvent("gc_cart_updated", { detail: { count } }));

      const keys = Array.from(new Set(lines.map((l) => l?.imageKey).filter(Boolean)));
      const missing = keys.filter((k) => !imageUrls[k]);
      if (missing.length) {
        const pairs = await Promise.all(
          missing.map(async (key) => {
            const r = await api(`/media/signed?key=${encodeURIComponent(key)}&expiresInSeconds=600`, { token });
            return [key, r.ok && r.data?.success ? r.data.url : null];
          })
        );
        setImageUrls((prev) => {
          const next = { ...prev };
          for (const [k, url] of pairs) if (url) next[k] = url;
          return next;
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cart");
      setCart([]);
      setCartBusinessId("");
      setBusinessLocation(null);
      window.dispatchEvent(new CustomEvent("gc_cart_updated", { detail: { count: 0 } }));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [imageUrls, token, loadBusinessLocation]);

  React.useEffect(() => {
    void loadCart();
  }, [loadCart]);

  React.useEffect(() => {
    if (paymentMethod !== "mpesa") return;
    if (paymentPhone.trim()) return;
    if (!deliveryPhone.trim()) return;
    setPaymentPhone(deliveryPhone.trim());
  }, [deliveryPhone, paymentMethod, paymentPhone]);

  React.useEffect(() => {
    if (
      !deliveryCoords ||
      !businessLocation ||
      !Array.isArray(businessLocation.coordinates) ||
      businessLocation.coordinates.length < 2
    ) {
      setDistanceKm(null);
      setDeliveryFee(0);
      setDeliveryZoneLabel("");
      setDeliveryPerKmRate(0);
      return;
    }
    const [lng, lat] = businessLocation.coordinates;
    const latNum = Number(lat);
    const lngNum = Number(lng);
    const userLat = Number(deliveryCoords.lat);
    const userLng = Number(deliveryCoords.lng);
    if (![latNum, lngNum, userLat, userLng].every((v) => Number.isFinite(v))) {
      setDistanceKm(null);
      setDeliveryFee(0);
      setDeliveryZoneLabel("");
      setDeliveryPerKmRate(0);
      return;
    }
    const distance = haversineDistanceKm(latNum, lngNum, userLat, userLng);
    const rounded = Math.round(distance * 100) / 100;
    setDistanceKm(rounded);
    const { fee, zoneLabel, perKmRate } = calculateDeliveryFee(distance);
    setDeliveryFee(fee);
    setDeliveryZoneLabel(zoneLabel);
    setDeliveryPerKmRate(perKmRate);
  }, [businessLocation, deliveryCoords]);

  React.useEffect(() => {
    if (!businessCoordinates || !deliveryCoords) {
      setRouteLine([]);
      setRouteStats(null);
      return;
    }
    const controller = new AbortController();
    const url = `https://router.project-osrm.org/route/v1/driving/${businessCoordinates[0]},${businessCoordinates[1]};${deliveryCoords.lng},${deliveryCoords.lat}?overview=full&geometries=geojson`;
    const fetchRoute = async () => {
      try {
        const resp = await fetch(url, { signal: controller.signal });
        if (!resp.ok) throw new Error("Routing unavailable");
        const data = await resp.json();
        const route = data?.routes?.[0];
        if (!route) throw new Error("Route not found");
        const coords = (route.geometry?.coordinates || []).map(([lng, lat]) => ({ lat, lng }));
        setRouteLine(coords);
        setRouteStats({
          distanceKm: Number.isFinite(route.distance) ? route.distance / 1000 : null,
          durationMin: Number.isFinite(route.duration) ? route.duration / 60 : null,
        });
      } catch (error) {
        if (error?.name === "AbortError") return;
        setRouteLine([]);
        setRouteStats(null);
      }
    };

    fetchRoute();
    return () => controller.abort();
  }, [businessCoordinates, deliveryCoords]);

  const subtotal = React.useMemo(() => {
    return cart.reduce((sum, l) => sum + Number(l?.price || 0) * Number(l?.quantity || 0), 0);
  }, [cart]);

  React.useEffect(() => {
    if (!checkoutOpen) return;
    setCheckoutTotal(subtotal + (payDeliveryFee ? deliveryFee : 0));
  }, [checkoutOpen, subtotal, deliveryFee, payDeliveryFee]);

  const addOne = async (line) => {
    setError("");
    setMessage("");
    setMutatingKey(`${line.kind}:${line.refId}`);
    const { ok, data } = await api("/cart/add", { method: "POST", token, body: { kind: line.kind, refId: line.refId, quantity: 1 } });
    if (!ok || !data?.success) {
      setError(data?.message || "Failed to update cart");
      setMutatingKey("");
      return;
    }
    await loadCart({ silent: true });
    setMutatingKey("");
  };

  const removeOne = async (line) => {
    setError("");
    setMessage("");
    setMutatingKey(`${line.kind}:${line.refId}`);
    const { ok, data } = await api("/cart/remove", { method: "POST", token, body: { kind: line.kind, refId: line.refId, quantity: 1 } });
    if (!ok || !data?.success) {
      setError(data?.message || "Failed to update cart");
      setMutatingKey("");
      return;
    }
    await loadCart({ silent: true });
    setMutatingKey("");
  };

  const removeLine = async (line) => {
    setError("");
    setMessage("");
    setMutatingKey(`${line.kind}:${line.refId}`);
    const qty = Math.max(1, Number(line.quantity || 1));
    const { ok, data } = await api("/cart/remove", { method: "POST", token, body: { kind: line.kind, refId: line.refId, quantity: qty } });
    if (!ok || !data?.success) {
      setError(data?.message || "Failed to remove item");
      setMutatingKey("");
      return;
    }
    await loadCart({ silent: true });
    setMutatingKey("");
  };

  const clearCart = async () => {
    setError("");
    setMessage("");
    setMutatingKey("clear");
    const { ok, data } = await api("/cart/clear", { method: "POST", token });
    if (!ok || !data?.success) {
      setError(data?.message || "Failed to clear cart");
      setMutatingKey("");
      return;
    }
    setMessage("Cart cleared");
    await loadCart({ silent: true });
    setMutatingKey("");
  };

  const openCheckout = () => {
    setError("");
    setMessage("");
    setPaymentMeta(null);
    setPlacedOrderId("");
    setCheckoutLines(cart);
    setPayDeliveryFee(true);
    setCheckoutTotal(subtotal + deliveryFee);
    setLocBusy(false);
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        const p = typeof u?.phone === "string" ? u.phone.trim() : "";
        if (p && !deliveryPhone.trim()) setDeliveryPhone(p);
        if (p && !paymentPhone.trim()) setPaymentPhone(p);
      }
    } catch {
      // ignore
    }
    if (!deliveryPhone.trim()) {
      void (async () => {
        try {
          const { ok, data } = await api("/users/me", { token });
          if (!ok || !data?.success) return;
          const p = typeof data?.user?.phone === "string" ? data.user.phone.trim() : "";
          if (p) {
            setDeliveryPhone((prev) => (prev.trim() ? prev : p));
            setPaymentPhone((prev) => (prev.trim() ? prev : p));
          }
        } catch {
          // ignore
        }
      })();
    }
    // Best-effort: prefill from sessionStorage if the user already enabled location on the map.
    try {
      const raw = sessionStorage.getItem("fn_user_latlng");
      if (raw) {
        const obj = JSON.parse(raw);
        const lat = Number(obj?.lat);
        const lng = Number(obj?.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setDeliveryCoords({ lat, lng });
          if (!deliveryAddress.trim()) setDeliveryAddress("My current location");
        }
      }
    } catch {
      // ignore
    }
    setCheckoutOpen(true);
  };

  const closeCheckout = () => {
    if (placingOrder || paying) return;
    setCheckoutOpen(false);
    setAutoLocationAttempted(false);
  };

const placeOrderAndPay = async () => {
  setError("");
  setMessage("");
  setPlacingOrder(true);

  try {
    // 1. Validate basics
    const businessId =
      cartBusinessId ||
      cart.find((l) => l?.businessId)?.businessId ||
      "";

    if (!businessId)
      throw new Error("This cart is not linked to a business.");

    const addr = deliveryAddress.trim();
    if (!addr) throw new Error("Delivery address is required");

    const contactPhone = deliveryPhone.trim();
    if (!contactPhone) throw new Error("Phone number is required");

    if (paymentMethod === "mpesa" && !paymentPhone.trim()) {
      throw new Error("M-Pesa number is required");
    }

    // 2. Prepare items
    const items = checkoutLines
      .filter((l) => l?.kind === "menu")
      .map((l) => ({
        menuItemId: l.refId,
        name: l.name,
        price: Number(l.price || 0),
        quantity: Number(l.quantity || 1),
      }));

    const services = checkoutLines
      .filter((l) => l?.kind === "service")
      .map((l) => ({
        serviceId: l.refId,
        name: l.name,
        price: Number(l.price || 0),
        quantity: Number(l.quantity || 1),
      }));

    const totalAmount = checkoutTotal;

    // 3. Create order (IMPORTANT: status should be "pending" in backend)
    const { ok, data } = await api("/orders", {
      method: "POST",
      token,
      body: {
        businessId,
        deliveryAddress: addr,
        deliveryCoordinates: deliveryCoords
          ? {
              type: "Point",
              coordinates: [
                Number(deliveryCoords.lng),
                Number(deliveryCoords.lat),
              ],
            }
          : undefined,
        totalAmount,
        deliveryFee,
        deliveryDistanceKm: Number.isFinite(distanceKm)
          ? distanceKm
          : undefined,
        contactPhone,
        items,
        services,
        note: deliveryNote || "",
      },
    });

    if (!ok || !data?.success)
      throw new Error(data?.message || "Failed to place order");

    const orderId = String(data.order._id);
    setPlacedOrderId(orderId);

    // 4. Start payment
    setPaying(true);
    setPaymentMeta(null);

    const pResp = await api("/payments/payment", {
      method: "POST",
      token,
      body: {
        orderId,
        method: paymentMethod,
        phone:
          paymentMethod === "mpesa"
            ? paymentPhone.trim()
            : undefined,
      },
    });

    setPaying(false);

    if (!pResp.ok || !pResp.data?.success) {
      setMessage(
        "Order created, but payment failed. You can retry payment."
      );
      return; //  DO NOT CLEAR CART
    }

    setPaymentMeta(pResp.data?.meta || null);

    // 5. Handle payment methods (NO premature success)
    if (paymentMethod === "cash") {
      // Cash = instantly confirmed
      setMessage("Order placed. Pay cash on delivery.");

      await api("/cart/clear", { method: "POST", token });
      window.dispatchEvent(
        new CustomEvent("gc_cart_updated", { detail: { count: 0 } })
      );
      await loadCart({ silent: true });

    } else if (paymentMethod === "mpesa") {
      setMessage(
        "Order placed! You will receive a payment prompt on your phone. Complete it to confirm the order."
      );

      // DO NOT CLEAR CART YET
      // Wait for backend confirmation (callback)

    } else if (
      paymentMethod === "paypal" &&
      pResp.data?.meta?.approvalUrl
    ) {
      setMessage("Redirecting to PayPal...");
      window.location.href = pResp.data.meta.approvalUrl;

    } else if (
      paymentMethod === "card" &&
      pResp.data?.meta?.clientSecret
    ) {
      setMessage("Complete card payment...");

      // Card flow handled separately (Stripe UI etc.)
    }

  } catch (e) {
    setError(
      e instanceof Error
        ? e.message
        : "Checkout failed. Try again."
    );
    setPaying(false);
  } finally {
    setPlacingOrder(false);
  }
};

useEffect(() => {
  socket.on("mpesa_payment_success", (data) => {
    if(data.orderId === placedOrderId) {
      setPaymentMeta(data);
      setMessage(data.message);
      if (data.paymentStatus === "Successful"){
        api("/cart/clear", {method: "POST", token})
        window.dispatchEvent(
          new CustomEvent("gc_cart_updated", { detail: { count: 0 } })
        );
         loadCart({ silent: true });
      }
    }
  })

  return () => socket.off("mpesa_payment_success")
}, [placedOrderId])

  const useMyLocation = async () => {
    setError("");
    setLocBusy(true);
    try {
      if (!("geolocation" in navigator)) throw new Error("Geolocation is not supported on this device/browser.");
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p),
          (e) => reject(e),
          { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 }
        );
      });
      const lat = Number(pos?.coords?.latitude);
      const lng = Number(pos?.coords?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("Failed to read location.");
      setDeliveryCoords({ lat, lng });
      if (!deliveryAddress.trim()) setDeliveryAddress("My current location");
      try {
        sessionStorage.setItem("fn_user_latlng", JSON.stringify({ lat, lng, at: Date.now() }));
      } catch {
        // ignore
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not get your location");
    } finally {
      setLocBusy(false);
    }
  };

  React.useEffect(() => {
    if (!checkoutOpen || autoLocationAttempted || deliveryCoords) return;
    if (!("geolocation" in navigator)) return;
    const tryLocation = async () => {
      if (navigator.permissions?.query) {
        try {
          const status = await navigator.permissions.query({ name: "geolocation" });
          if (status.state === "denied") return;
        } catch {
          // ignore
        }
      }
      await useMyLocation();
    };
    setAutoLocationAttempted(true);
    void tryLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutOpen, autoLocationAttempted, deliveryCoords]);



  const checkoutSubtotal = React.useMemo(() => {
    return (checkoutLines || []).reduce(
      (sum, l) => sum + Number(l?.price || 0) * Number(l?.quantity || 0),
      0
    );
  }, [checkoutLines]);

  

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      { !token ? (
        <div>
          <h1 className="text-2xl font-semibold text-yellow-600">Cart</h1>
          <p className="text-sm text-gray-600 mt-2 text-center bg-red-100 p-4 rounded-2xl font-bold">Please login to view your cart.</p>
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold text-yellow-600 ">Cart</h1>
              <p className="text-sm text-gray-600 mt-2 bg-green-50 p-4 rounded-2xl font-bold text-center">Review your items before checkout.</p>
            </div>
            <button
          type="button"
          disabled={loading || mutatingKey === "clear" || cart.length === 0}
          onClick={clearCart}
          className="h-10 px-4 rounded-xl border border-gray-200 cursor-pointer text-black bg-red-300 text-sm font-bold  hover:bg-red-400 disabled:opacity-50"
        >
          {mutatingKey === "clear" ? "Clearing…" : "Clear cart"}
        </button>
      </div>
        </div>
      )}
     

      {message ? (
        <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-sm">{message}</div>
      ) : null}
      {error ? (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">Items</div>
              <div className="text-xs text-gray-500">{cart.length} line(s)</div>
            </div>

            {cart.length === 0 ? (
              <div>
                <div className="p-6 text-sm text-gray-600">Your cart is empty.</div>
                <button type="button" onClick={() => navigate("/")} className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-green-100 text-sm font-semibold text-gray-700 hover:bg-green-200 duration-200">Browse products</button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {cart.map((line, idx) => {
                  const imgUrl = line?.imageKey ? imageUrls[line.imageKey] : null;
                  const qty = Number(line.quantity || 1);
                  const price = Number(line.price || 0);
                  const key = `${line.kind}:${line.refId}`;
                  const busy = mutatingKey === key;
                  return (
                    <div key={key} className={`p-4 flex items-start gap-4 ${busy ? "opacity-80" : ""}`}>
                      <div className="w-20 h-20 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                        {imgUrl ? (
                          <img src={imgUrl} alt={line.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="text-xs text-gray-500">img</div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{line.name || "Item"}</div>
                            <div className="text-xs text-gray-500 mt-1">Type: {line.kind}</div>
                          </div>
                          <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">{money(price * qty)}</div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                          <div className="inline-flex items-center gap-2 border border-gray-200 rounded-xl p-1 bg-white">
                            <button
                              type="button"
                              onClick={() => removeOne(line)}
                              disabled={busy}
                              className="h-6 w-6 text-center rounded-full bg-indigo-100 hover:bg-indigo-200 text-gray-700 "
                            >
                              −
                            </button>
                            <div className="min-w-8 text-center text-sm font-semibold text-gray-900">{qty}</div>
                            <button
                              type="button"
                              onClick={() => addOne(line)}
                              disabled={busy}
                              className="h-6 w-6 text-center rounded-full bg-green-100 hover:bg-green-200 text-gray-700"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeLine(line)}
                            disabled={busy}
                            className="text-sm font-semibold text-red-600 hover:text-red-700"
                          >
                            {busy ? "Updating…" : "Remove"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <div className="text-sm font-semibold text-gray-900">Summary</div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between text-gray-700">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900">{money(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-700">
                <span>Delivery</span>
                <span className="text-gray-500">Calculated at checkout</span>
              </div>
            </div>
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={openCheckout}
              className="mt-5 w-full h-11 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
            >
              Checkout
            </button>
            <div className="text-[11px] text-gray-500 mt-3">Checkout flow is the next step.</div>
          </div>
        </div>
      </div>

      {checkoutOpen ? (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => closeCheckout()} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-orange-500">FoodNest Checkout</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Total: <span className="font-semibold text-green-500">{money(checkoutTotal || checkoutSubtotal)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={placingOrder || paying}
                    onClick={closeCheckout}
                    className="h-9 px-3 rounded-xl text-sm font-semibold bg-red-100 hover:bg-red-200  disabled:opacity-50"
                  >
                    Close
                  </button>
                </div>


              </div>

              <div className="flex-1 overflow-y-auto  py-5 bg-gray-50/30 custom-scrollbar">
                <div className="max-w-xl mx-auto flex flex-col gap-5">
                  {(routeBounds && routeBounds.length > 0) || businessCoordinates || deliveryCoords ? (
                    <div className="w-full ">
                      <CheckoutRouteMap
                        routeBounds={routeBounds}
                        businessCoordinates={businessCoordinates}
                        deliveryCoords={deliveryCoords}
                        routeLine={routeLine}
                      />
                      {routeStats && routeStats.distanceKm && routeStats.durationMin ? (
                        <div className="text-[12px] text-gray-600">
                          Route: {routeStats.distanceKm.toFixed(2)} km • {Math.round(routeStats.durationMin)} min
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="w-full">
                    <div className="space-y-4 pb-12">
                       
                        <>
                          <div className="rounded-3xl border border-gray-400 p-5">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-semibold text-black">Delivery details</div>
                                <div className="text-xs text-black mt-1">
                                  Confirm your address, contact, and delivery notes before placing the order.
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 grid gap-4">
                              <div className="relative rounded-2xl border border-gray-200/80 bg-white/70 backdrop-blur-md p-4 shadow-sm transition-shadow hover:shadow">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-green-500" /> Address & Location
                                </div>
                                <div className="relative mt-1">
                                  <textarea
                                    rows={2}
                                    value={deliveryAddress}
                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-blue-300 resize-none transition-all duration-200"
                                    placeholder="Apartment, estate, landmark…"
                                  />
                                </div>
                                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-600 bg-gray-50/80 px-3 py-2 rounded-xl border border-gray-100">
                                  {deliveryCoords ? (
                                    <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                      GPS Saved:
                                      <span className="font-mono bg-white px-1.5 py-0.5 rounded shadow-sm border border-emerald-100">
                                        {deliveryCoords.lat.toFixed(4)}, {deliveryCoords.lng.toFixed(4)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="flex items-center gap-1 text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Enable location for precision</span>
                                  )}
                                  <button
                                    type="button"
                                    disabled={locBusy}
                                    onClick={useMyLocation}
                                    className="h-8 px-3 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-700 shadow-sm hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-50 transition-all flex items-center gap-1.5"
                                  >
                                    {locBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                                    {locBusy ? "Locating…" : deliveryCoords ? "Update GPS" : "Use my location"}
                                  </button>
                                </div>
                                {distanceKm !== null ? (
                                  <div className="mt-1 flex items-center gap-2 text-[12px] font-medium text-emerald-800 bg-yellow-100 px-3 py-2 rounded-lg border border-yellow-100/50">
                                    <Truck className="w-3.5 h-3.5" /> Approx {distanceKm.toFixed(2)} km • Delivery {money(deliveryFee)}
                                  </div>
                                ) : null}
                              </div>

                              {deliveryFee > 0 && (
                                <div className="relative rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 to-teal-50/40 p-5 shadow-sm flex items-center justify-between gap-4 overflow-hidden">
                                  <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-white/40 to-transparent pointer-events-none"></div>
                                  <div className="relative z-10">
                                    <div className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                                      <Wallet className="w-4 h-4 text-emerald-600" />
                                      Pay delivery fee online?
                                    </div>
                                    <div className="text-[12px] text-emerald-700 mt-1 max-w-[280px] leading-relaxed">If unchecked, you will pay <strong className="font-semibold text-emerald-900">{money(deliveryFee)}</strong> in cash to the rider upon arrival.</div>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer shrink-0 z-10 transition-transform active:scale-95">
                                    <input type="checkbox" checked={payDeliveryFee} onChange={(e) => setPayDeliveryFee(e.target.checked)} className="sr-only peer" />
                                    <div className="w-12 h-6 bg-emerald-200/60 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-5 after:w-5 after:shadow-sm after:transition-all peer-checked:bg-emerald-500 border border-gray-200/50"></div>
                                  </label>
                                </div>
                              )}

                              <div className="rounded-2xl border border-gray-200/80 bg-white/70 backdrop-blur-md p-4 shadow-sm grid gap-4 grid-cols-1">
                                <div>
                                  <div className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5 mb-1.5">
                                    <Phone className="w-3.5 h-3.5 text-gray-400" /> Contact Number <span className="text-red-500 ml-auto">*</span>
                                  </div>
                                  <div className="relative">
                                    <input
                                      value={deliveryPhone}
                                      onChange={(e) => setDeliveryPhone(e.target.value)}
                                      className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50/50 px-3 text-[13px] font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all duration-200"
                                      placeholder="2547XXXXXXXX"
                                      inputMode="tel"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5 mb-1.5">
                                    <FileText className="w-3.5 h-3.5 text-gray-400" /> Delivery Note
                                  </div>
                                  <input
                                    value={deliveryNote}
                                    onChange={(e) => setDeliveryNote(e.target.value)}
                                    className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50/50 px-3 text-[13px] font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all duration-200"
                                    placeholder="Gate code, call on arrival…"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                        </>
                    </div>
                  </div>

                  <div className="w-full relative">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 shadow-[0_15px_30px_rgba(15,23,42,0.06)] overflow-hidden">
                      {/* Receipt top crinkle effect simulated with border */}
                      <div className="h-2 w-full bg-[radial-gradient(circle,transparent_4px,#f9fafb_4px)] bg-[length:12px_12px] -mt-1 border-b border-gray-200/50"></div>
                      
                      <div className="p-5">
                        <div className="flex items-center justify-between gap-4 border-b border-dashed border-gray-200 pb-3">
                          <div>
                            <div className="text-[13px] font-extrabold text-gray-900 tracking-tight flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5 text-emerald-600" /> Order Summary</div>
                            <div className="text-[11px] text-gray-500 font-medium">Items, delivery & total.</div>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100/50 px-2 py-0.5 rounded border border-emerald-200/50">
                            {checkoutLines.length} {checkoutLines.length === 1 ? "item" : "items"}
                          </span>
                        </div>
                        
                        {businessInfo && (
                          <div className="mt-3 flex items-center gap-3 rounded-xl bg-white p-2.5 shadow-sm border border-gray-100">
                            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center">
                              <MapPin className="h-3 w-3 text-emerald-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-bold text-gray-900 truncate">{businessInfo.name}</div>
                              <div className="text-[10px] text-gray-500 truncate">{businessInfo.address}</div>
                            </div>
                            {businessMapHref && (
                              <a
                                href={businessMapHref}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded transition"
                              >
                                Map
                              </a>
                            )}
                          </div>
                        )}

                        <div className="mt-4 space-y-3 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                          {checkoutLines.length === 0 ? (
                            <div className="text-xs text-gray-500 text-center py-2 font-medium italic">Cart is empty.</div>
                          ) : (
                            checkoutLines.map((l, idx) => (
                              <div
                                key={`${l.kind}:${l.refId}:${idx}`}
                                className="flex items-start justify-between gap-2 group"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="text-[13px] font-bold text-gray-800 break-words flex items-center gap-1.5">
                                    <div className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-emerald-400"></div>
                                    {l.name || "Item"}
                                  </div>
                                  <div className="text-[10px] font-medium text-gray-500 ml-2.5">
                                    {l.kind} • {Number(l.quantity || 1)} × {money(l.price || 0)}
                                  </div>
                                </div>
                                <div className="text-[13px] font-black text-gray-900 whitespace-nowrap">
                                  {money(Number(l.price || 0) * Number(l.quantity || 0))}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="mt-4 space-y-2 rounded-xl bg-white shadow-sm p-3 text-[13px] border border-gray-100">
                          <div className="flex items-center justify-between text-gray-600 font-medium">
                            <span>Subtotal</span>
                            <span className="font-bold text-gray-800">{money(checkoutSubtotal)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-gray-600 font-medium">Delivery fee</span>
                              {distanceKm !== null && (
                                <span className="block text-[9px] uppercase font-bold text-emerald-600/80">
                                  {deliveryZoneLabel} ({distanceKm.toFixed(1)} km)
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-gray-800">{money(deliveryFee)}</span>
                          </div>
                          <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-2 mt-1">
                            <span className="font-black text-gray-900 uppercase text-[12px] tracking-wide">Total</span>
                            <span className="text-base font-black text-emerald-600 drop-shadow-sm">
                              {money(checkoutTotal || checkoutSubtotal + deliveryFee)}
                            </span>
                          </div>
                        </div>

                      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-[13px] font-semibold text-gray-900">Payment method</div>
                                <div className="text-[11px] text-gray-500">Select one and add the follow-up details.</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-3">
                              {[
                                { id: "cash", label: "Cash", icon: Receipt },
                                { id: "mpesa", label: "M-Pesa", icon: Smartphone },
                                { id: "paypal", label: "PayPal", icon: CreditCard },
                                { id: "card", label: "Card", icon: Wallet },
                              ].map(({ id, label, icon: Icon }) => (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => setPaymentMethod(id)}
                                  className={`relative group flex flex-row items-center gap-2 h-10 px-3 rounded-xl border text-[13px] font-bold transition-all duration-200 overflow-hidden ${
                                    paymentMethod === id
                                      ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-[0_2px_8px_rgba(16,185,129,0.1)]"
                                      : "border-gray-200 bg-white text-gray-500 hover:border-emerald-300 hover:bg-emerald-50/30 hover:text-emerald-600"
                                  }`}
                                >
                                  {paymentMethod === id && (
                                    <div className="absolute top-1 right-1 p-1">
                                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                    </div>
                                  )}
                                  <Icon className={`w-4 h-4 transition-transform duration-200 ${paymentMethod === id ? "text-emerald-500 scale-110" : "text-gray-400 group-hover:scale-110"}`} />
                                  <span>{label}</span>
                                </button>
                              ))}
                            </div>
                            {paymentMethod === "mpesa" && (
                              <div className="mt-3 rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50/50 p-3 text-sm text-gray-700 relative overflow-hidden">
                                <div className="absolute -top-2 -right-2 p-2 opacity-5 pointer-events-none">
                                  <Smartphone className="w-16 h-16" />
                                </div>
                                <div className="relative z-10">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[12px] font-bold text-emerald-800 flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5"/> M-Pesa Number</span>
                                    <span className="text-[9px] font-bold tracking-wider text-white bg-emerald-500 px-1.5 py-0.5 rounded shadow-sm">INSTANT PUSH</span>
                                  </div>
                                  <input
                                    value={paymentPhone}
                                    onChange={(e) => setPaymentPhone(e.target.value)}
                                    className="w-full h-9 rounded-lg border border-white/50 bg-white/80 backdrop-blur shadow-sm px-3 text-[13px] font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    placeholder="2547XXXXXXXX"
                                    inputMode="tel"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        <div className=" flex items-center justify-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100/50 py-2 rounded-lg">
                          <Truck className="w-3.5 h-3.5" /> Fast Delivery Assured
                        </div>
                      </div>
                      <div className="h-2 w-full bg-[radial-gradient(circle,transparent_4px,#f9fafb_4px)] bg-[length:12px_12px] border-t border-gray-200/50 transform rotate-180"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-end gap-2">
                {!placedOrderId ? (
                  <>
                    <button
                      type="button"
                      onClick={closeCheckout}
                      disabled={placingOrder || paying}
                      className="h-9 px-4 rounded-lg text-[13px] font-semibold bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={placeOrderAndPay}
                      disabled={placingOrder || paying || checkoutLines.length === 0}
                      className="h-10 px-5 rounded-xl text-[14px] font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:from-emerald-500 hover:to-teal-400 shadow-[0_4px_10px_rgba(16,185,129,0.2)] hover:shadow-[0_6px_15px_rgba(16,185,129,0.3)] disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-[1px] transition-all duration-300 flex items-center justify-center gap-1.5"
                    >
                      {placingOrder || paying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="tracking-wide">Processing...</span>
                        </>
                      ) : (
                        `Pay for Order`
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={closeCheckout}
                    className="h-10 px-6 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 shadow-md transition"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
