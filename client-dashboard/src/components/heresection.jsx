import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RefreshCw } from "lucide-react";

const ADS_API = "http://localhost:4000/api/adverts/feed";

const safeNum = (v, fallback) => {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export default function HeroSection() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mediaKey, setMediaKey] = useState(0);

  const startedAtRef = useRef(0);
  const elapsedRef = useRef(0);

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
    startedAtRef.current = Date.now();
    elapsedRef.current = 0;
    setRemainingMs(durationMs);
    setMediaError(false);
    setMediaKey((k) => k + 1);
  }, [active, durationMs, items.length]);

  useEffect(() => {
    if (!items.length) return;
    if (paused) return;
    const t = setInterval(() => {
      const elapsed = elapsedRef.current + (Date.now() - startedAtRef.current);
      const left = Math.max(0, durationMs - elapsed);
      setRemainingMs(left);
      if (left <= 0) setActive((i) => (i + 1) % items.length);
    }, 200);
    return () => clearInterval(t);
  }, [durationMs, items.length, paused]);

  useEffect(() => {
    if (!items.length) return;
    if (paused) {
      elapsedRef.current += Date.now() - startedAtRef.current;
    } else {
      startedAtRef.current = Date.now();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  useEffect(() => {
    const next = items.length ? items[(active + 1) % items.length] : null;
    if (next?.mediaType !== "image" || !next?.mediaUrl) return;
    const img = new Image();
    img.src = next.mediaUrl;
  }, [active, items]);

  const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
  const activeCount = items.length ? `${active + 1}/${items.length}` : "0/0";

  return (
    <section className="p-6 space-y-2">
      <div className="flex items-start justify-between gap-4">
        
          <h1 className="text-xl font-semibold text-yellow-600">Discover what’s trending</h1>
          <p className="text-sm text-gray-600 mt-1">Featured promos from nearby businesses.</p>
     
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      ) : null}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="aspect-[16/7] bg-gray-100 relative">
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-black/70 text-white">
              {remainingSeconds}s
            </div>
            <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-black/40 text-white">
              {activeCount}
            </div>
          </div>

          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-600">Loading adverts…</div>
          ) : !activeItem ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-600">No adverts yet.</div>
          ) : mediaError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-gray-700 bg-gray-50">
              <div>Failed to load advert media.</div>
              <button
                type="button"
                onClick={() => {
                  setMediaError(false);
                  setMediaKey((k) => k + 1);
                }}
                className="h-10 px-4 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          ) : activeItem.mediaType === "video" ? (
            <video
              key={`${activeItem.id}-${mediaKey}`}
              src={activeItem.mediaUrl}
              className="w-full h-full object-cover "
              autoPlay
              muted
              playsInline
              loop
              onError={() => setMediaError(true)}
            />
          ) : (
            <div className="absolute inset-0">
              {/* Blurred backdrop to avoid empty side bars */}
              <img
                key={`bg-${activeItem.id}-${mediaKey}`}
                src={activeItem.mediaUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-neutral-900/30" />
              {/* Foreground media (keeps full image visible) */}
              <img
                key={`${activeItem.id}-${mediaKey}`}
                src={activeItem.mediaUrl}
                alt={activeItem.title || "Advert"}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                onError={() => setMediaError(true)}
              />
            </div>
          )}

          {activeItem ? (
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-white/15 text-white border border-white/15">
                  Sponsored
                </span>
                <div className="text-white font-semibold text-base">{activeItem.title || "—"}</div>
              </div>
              {activeItem.note ? <div className="text-white/90 text-xs mt-1 line-clamp-2">{activeItem.note}</div> : null}

              {activeItem?.business ? (
                <div className="mt-3 flex items-center gap-2">
                  {activeItem.business.logoUrl ? (
                    <img
                      src={activeItem.business.logoUrl}
                      alt={activeItem.business.name}
                      className="w-7 h-7 rounded-full object-cover border border-white/30"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                  <div className="min-w-0">
                    <div className="text-white/95 text-xs font-semibold truncate">{activeItem.business.name}</div>
                    <div className="text-white/70 text-[11px] truncate">
                      {activeItem.business.category || ""} {activeItem.business.address ? `• ${activeItem.business.address}` : ""}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {items.length ? (
          <div className="bg-white border-t border-gray-200  flex items-center justify-between">
             <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActive((i) => (items.length ? (i - 1 + items.length) % items.length : 0))}
            disabled={!items.length}
            className="h-5 w-5 grid place-items-center rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            aria-label="Previous advert"
            title="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            disabled={!items.length}
            className="h-5 w-5 grid place-items-center rounded-xl bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40"
            aria-label={paused ? "Play adverts" : "Pause adverts"}
            title={paused ? "Play" : "Pause"}
          >
            {paused ? <Play className="w-2 h-2" /> : <Pause className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={() => setActive((i) => (items.length ? (i + 1) % items.length : 0))}
            disabled={!items.length}
            className="h-5 w-5 grid place-items-center rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            aria-label="Next advert"
            title="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
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
         </div> 
        ) : null}
      </div>
    </section>
  );
}
