import React, { useEffect, useMemo, useState } from "react";

const ADS_API = "http://localhost:4000/api/adverts/feed";

const safeNum = (v, fallback) => {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const HeroSection = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const resp = await fetch(`${ADS_API}?limit=10`, { signal: controller.signal });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load adverts");
        const list = Array.isArray(data.items) ? data.items : [];
        setItems(list);
        setActive(0);
      } catch (e) {
        if (e?.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load adverts");
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const activeItem = items[active] || null;
  const durationMs = useMemo(() => {
    const seconds = safeNum(activeItem?.durationSeconds, 10);
    return clamp(Math.round(seconds * 1000), 2000, 20000);
  }, [activeItem?.durationSeconds]);

  useEffect(() => {
    if (!items.length) return;
    const t = setTimeout(() => {
      setActive((i) => (i + 1) % items.length);
    }, durationMs);
    return () => clearTimeout(t);
  }, [durationMs, items.length, active]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Discover what’s trending</h1>
          <p className="text-sm text-gray-600 mt-1">Featured promos from nearby businesses.</p>
        </div>
        <button
          type="button"
          onClick={() => setActive((i) => (items.length ? (i + 1) % items.length : 0))}
          disabled={!items.length}
          className="h-10 px-4 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      ) : null}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="aspect-[16/7] bg-gray-100 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-600">Loading adverts…</div>
          ) : !activeItem ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-600">No adverts yet.</div>
          ) : activeItem.mediaType === "video" ? (
            <video
              key={activeItem.id}
              src={activeItem.mediaUrl}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
              loop
            />
          ) : (
            <img
              src={activeItem.mediaUrl}
              alt={activeItem.title || "Advert"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}

          {activeItem ? (
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
              <div className="text-white font-semibold text-base">{activeItem.title || "Sponsored"}</div>
              <div className="text-white/80 text-xs mt-1">
                Showing {active + 1}/{items.length} • {Math.round(durationMs / 1000)}s
              </div>
            </div>
          ) : null}
        </div>

        {items.length ? (
          <div className="p-4 flex flex-wrap gap-2">
            {items.map((it, idx) => (
              <button
                key={it.id || idx}
                type="button"
                onClick={() => setActive(idx)}
                className={`h-2.5 rounded-full transition-all ${
                  idx === active ? "w-10 bg-emerald-600" : "w-2.5 bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Show advert ${idx + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default HeroSection;
