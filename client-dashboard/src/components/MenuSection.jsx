import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Grid3X3,
  Store,
  UtensilsCrossed,
  Coffee,
  CakeSlice,
  Hotel,
  Wine,
  ShoppingBasket,
  Sandwich,
  ForkKnife,
  Loader2,
} from "lucide-react";
import { API_BASE_URL } from "../lib/apiBase.js";
import { useToast } from "./ToastProvider.jsx";

const API_BASE = `${API_BASE_URL}/api`;

const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

const fmtMoney = (n) => {
  const v = Number(n || 0);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(v);
  } catch {
    return `KES ${Math.round(v)}`;
  }
};

function Pill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 px-4 rounded-xl text-sm font-medium border transition  ${
        active ? " border-2 border-yellow-400  items-center justify-center" : "bg-white border-2 border-gray-200  hover:bg-gray-50"
      }`}
    >
      <span className="inline-flex items-center gap-2">{children}</span>
    </button>
  );
}

const iconForBusinessCategory = (category) => {
  const s = String(category || "").toLowerCase();
  if (!s) return Grid3X3;
  if (s.includes("restaurant") || s.includes("resturant") || s.includes("diner") || s.includes("eat")) return UtensilsCrossed;
  if (s.includes("cafe") || s.includes("coffee") || s.includes("tea")) return Coffee;
  if (s.includes("bakery") || s.includes("cake") || s.includes("pastry")) return CakeSlice;
  if (s.includes("resort") || s.includes("hotel") || s.includes("lodge")) return ForkKnife;
  if (s.includes("bar") || s.includes("pub") || s.includes("club")) return Wine;
  if (s.includes("super") || s.includes("market") || s.includes("grocery") || s.includes("shop")) return ShoppingBasket;
  if (s.includes("butch") || s.includes("meat") || s.includes("grill") || s.includes("bbq")) return Sandwich;
  return Store;
};

export default function MenuSection({
  businessCategory,
  onBusinessCategoryChange,
  menuType,
  onMenuTypeChange,
}) {
  const [businesses, setBusinesses] = useState([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [error, setError] = useState("");
  const [openCard, setOpenCard] = useState(null);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState("");
  const [items, setItems] = useState([]);
  const [addingById, setAddingById] = useState({});

  const itemsAbortRef = useRef(null);
  const itemsCacheRef = useRef({});
  const detailsRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoadingBusinesses(true);
      try {
        const res = await fetch(`${API_BASE}/business?limit=200`, { signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to load businesses");
        setBusinesses(Array.isArray(data.businesses) ? data.businesses : []);
      } catch (e) {
        if (e?.name === "AbortError") return;
        setBusinesses([]);
      } finally {
        setLoadingBusinesses(false);
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const businessCategories = useMemo(() => {
    const cats = uniq(businesses.map((b) => b?.category));
    cats.sort((a, b) => String(a).localeCompare(String(b)));
    return ["", ...cats];
  }, [businesses]);

  useEffect(() => {
    const controller = new AbortController();
    const loadCards = async () => {
      setLoadingCards(true);
      setError("");
      try {
        const qs = new URLSearchParams();
        if (businessCategory) qs.set("businessCategory", businessCategory);
        if (menuType) qs.set("menuType", menuType);
        qs.set("limit", "300");
        const res = await fetch(`${API_BASE}/business/menu-category-cards?${qs.toString()}`, { signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to load menu");
        setCards(Array.isArray(data.cards) ? data.cards : []);
      } catch (e) {
        if (e?.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load menu");
        setCards([]);
      } finally {
        setLoadingCards(false);
      }
    };
    void loadCards();
    return () => controller.abort();
  }, [businessCategory, menuType]);

  useEffect(() => {
    if (itemsAbortRef.current) itemsAbortRef.current.abort();
    const controller = new AbortController();
    itemsAbortRef.current = controller;

    const cacheKey = `${businessCategory || "all"}:${menuType}:${openCard?.business?.id || "allbiz"}:${openCard?.id || "allcat"}`;
    const cached = itemsCacheRef.current[cacheKey];

    const load = async () => {
      setItemsLoading(true);
      setItemsError("");
      if (Array.isArray(cached)) setItems(cached);
      try {
        const qs = new URLSearchParams();
        if (businessCategory) qs.set("businessCategory", businessCategory);
        if (menuType) qs.set("menuType", menuType);
        if (openCard?.business?.id) qs.set("businessId", openCard.business.id);
        if (openCard?.id) qs.set("categoryId", openCard.id);
        qs.set("limit", "300");

        const res = await fetch(`${API_BASE}/business/menu-item-cards?${qs.toString()}`, { signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to load items");
        const list = Array.isArray(data.items) ? data.items : [];
        setItems(list);
        itemsCacheRef.current[cacheKey] = list;
      } catch (e) {
        if (e?.name === "AbortError") return;
        setItemsError(e instanceof Error ? e.message : "Failed to load items");
      } finally {
        setItemsLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [businessCategory, menuType, openCard?.business?.id, openCard?.id]);

  const addToCart = async (menuItem) => {
    setError("");
    const itemId = String(menuItem?.id || menuItem?._id || "");
    if (itemId) setAddingById((p) => ({ ...p, [itemId]: true }));
    try {
      const token = localStorage.getItem("token") || "";
      if (!token) throw new Error("Please login to add items to cart.");
      const resp = await fetch(`${API_BASE}/cart/add`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "menu", refId: menuItem.id, quantity: 1 }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to add to cart");
      toast({ variant: "success", message: "Added to cart" });
      window.dispatchEvent(new Event("gc_cart_updated"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to add to cart";
      setError(msg);
      toast({ variant: "error", message: msg });
    } finally {
      if (itemId) {
        setAddingById((p) => {
          const next = { ...p };
          delete next[itemId];
          return next;
        });
      }
    }
  };

  return (
    <section id="menu-section" className="p-6 pt-2">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <p className="text-sm text-gray-600 mt-1">Browse categories from businesses around you.</p>
        </div>

        <div className="flex items-center gap-2">
          <Pill active={menuType === "cooked"} onClick={() => onMenuTypeChange?.("cooked")}>
            Cooked
          </Pill>
          <Pill active={menuType === "noncooked"} onClick={() => onMenuTypeChange?.("noncooked")}>
            Non-cooked
          </Pill>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">Business Category</div>
        <div className="mt-2 flex flex-wrap gap-2 ">
          {businessCategories.map((cat) => (
            <Pill key={cat || "__all"} active={businessCategory === cat} onClick={() => onBusinessCategoryChange?.(cat)}>
              {(() => {
                const Icon = iconForBusinessCategory(cat);
                const label = cat ? cat : loadingBusinesses ? "Loading..." : "All";
                return (
                  <div className="flex items-center gap-2 justify-center">
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </div>
                );
              })()}
            </Pill>
          ))}
        </div>
      </div>

      {error ? (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      ) : null}

      <div className="mt-5">
        {loadingCards ? (
          <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
            <span className="inline-block w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin" />
            Updating menu…
          </div>
        ) : null}

        {!cards.length && !loadingCards ? (
          <div className="text-sm text-gray-600">No categories found for this filter.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {cards.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setOpenCard((prev) => (prev?.id === c.id ? null : c));
                  setTimeout(() => detailsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
                }}
                className="text-left bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[11px] px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                      {c.menuType === "cooked" ? "Cooked" : "Non-cooked"}
                    </div>
                    <div className="text-xs text-gray-400">Tap to view</div>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                      {c.categoryImageUrl ? (
                        <img
                          src={c.categoryImageUrl}
                          alt={c.categoryName}
                          className=" w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-xs text-gray-500">img</div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 truncate">{c.categoryName}</div>
                      <div className="mt-2 flex items-center gap-2">
                        {c?.business?.logoUrl ? (
                          <img
                            src={c.business.logoUrl}
                            alt={c.business.name}
                            className="w-6 h-6 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-200" />
                        )}
                        <div className="text-sm text-gray-700 truncate">{c?.business?.name || "Business"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={detailsRef} className="mt-6 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-gray-900 truncate">{openCard ? openCard.categoryName : "All items"}</div>
                <span className="text-[11px] px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                  {menuType === "cooked" ? "Cooked" : "Non-cooked"}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 min-w-0">
                {openCard?.business?.logoUrl ? (
                  <img
                    src={openCard.business.logoUrl}
                    alt={openCard.business.name}
                    className="w-7 h-7 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-200" />
                )}
                <div className="text-sm text-gray-700 truncate">{openCard?.business?.name || (businessCategory || "All businesses")}</div>
                {itemsLoading ? <div className="text-xs text-gray-400">Updating…</div> : null}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpenCard(null)}
              disabled={!openCard}
              className="h-9 px-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {openCard ? "Clear category" : "All items"}
            </button>
          </div>

          <div className="p-4">
            {itemsError ? (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{itemsError}</div>
            ) : null}

            {!items.length && itemsLoading ? (
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <span className="inline-block w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin" />
                Loading items…
              </div>
            ) : !items.length ? (
              <div className="text-sm text-gray-600">No items found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition"
                  >
                    <div className="h-36 bg-gray-100 relative overflow-hidden">
                      {it.imageUrl ? (
                        <>
                          <img
                            src={it.imageUrl}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-neutral-900/20" />
                          <img
                            src={it.imageUrl}
                            alt={it.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                          />
                        </>
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-sm text-gray-500">No image</div>
                      )}
                      {it?.business?.name ? (
                        <div className="absolute bottom-2 left-2 text-[11px] px-2 py-1 rounded-lg bg-orange-400/60 font-bold max-w-[90%] truncate">
                          {it.business.name}
                        </div>
                      ) : null}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-semibold text-gray-900 leading-snug">{it.name}</div>
                        <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">{fmtMoney(it.price)}</div>
                      </div>
                      {it.description ? (
                        <div className="text-sm text-gray-600 mt-2 line-clamp-2">{it.description}</div>
                      ) : (
                        <div className="text-sm text-gray-400 mt-2">No description</div>
                      )}
                      <button
                        type="button"
                        onClick={() => addToCart(it)}
                        disabled={Boolean(addingById[String(it?.id || it?._id || "")])}
                        aria-busy={Boolean(addingById[String(it?.id || it?._id || "")])}
                        className="mt-3 w-full h-8 rounded-xl bg-yellow-400 text-sm font-semibold hover:bg-yellow-500 duration-150 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                      >
                        {addingById[String(it?.id || it?._id || "")] ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Adding…
                          </>
                        ) : (
                          "Add to cart"
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
    </section>
  );
}
