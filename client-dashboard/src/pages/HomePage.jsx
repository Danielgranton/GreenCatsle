import React, { useCallback, useEffect, useState } from "react";
import HeroSection from "../components/heresection.jsx";
import ClientMap from "../components/clientMap.jsx";
import MenuSection from "../components/MenuSection.jsx";

export default function HomePage() {
  const [businessCategory, setBusinessCategory] = useState("");
  const [menuType, setMenuType] = useState("cooked");
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(min-width: 1024px)").matches; // Tailwind `lg`
  });

  const onSelectBusiness = useCallback((b) => {
    if (b?.category) setBusinessCategory(b.category);
    setTimeout(() => {
      const el = document.getElementById("menu-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, []);

  useEffect(() => {
    const onToggle = () => setDiscoveryOpen((p) => !p);
    const onClose = () => setDiscoveryOpen(false);
    window.addEventListener("gc_discovery_toggle", onToggle);
    window.addEventListener("gc_discovery_close", onClose);
    return () => {
      window.removeEventListener("gc_discovery_toggle", onToggle);
      window.removeEventListener("gc_discovery_close", onClose);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(mql.matches);
    onChange();
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    if (isDesktop && discoveryOpen) setDiscoveryOpen(false);
  }, [isDesktop, discoveryOpen]);

  useEffect(() => {
    if (!discoveryOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setDiscoveryOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [discoveryOpen]);

  useEffect(() => {
    if (!discoveryOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [discoveryOpen]);

  const onSelectBusinessFromDrawer = useCallback(
    (b) => {
      setDiscoveryOpen(false);
      onSelectBusiness(b);
    },
    [onSelectBusiness]
  );

  return (
    <>
      <div className="flex flex-col lg:flex-row">
      <div className="w-full lg:w-[78%]">
        <div id="ads-section">
          <HeroSection />
        </div>
        <MenuSection
          businessCategory={businessCategory}
          onBusinessCategoryChange={setBusinessCategory}
          menuType={menuType}
          onMenuTypeChange={setMenuType}
        />
      </div>

      {isDesktop ? (
        <div className="w-[22%] h-[calc(100vh-64px)] sticky top-16 overflow-y-scroll border-l border-gray-300 p-2">
          <ClientMap onSelectBusiness={onSelectBusiness} />
        </div>
      ) : null}
    </div>

      {/* Mobile discovery drawer */}
      {!isDesktop ? (
        <div className={`fixed inset-0 z-[70] ${discoveryOpen ? "" : "pointer-events-none"}`}>
          <div
            className={`absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity duration-300 ${
              discoveryOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setDiscoveryOpen(false)}
            aria-hidden="true"
          />
          <div
            className={`absolute inset-0 bg-white shadow-2xl transition-transform duration-300 ease-out ${
              discoveryOpen ? "translate-x-0" : "translate-x-full"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Business discovery"
          >
            <div className="h-14 px-4 border-b border-gray-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">Business discovery</div>
              <button
                type="button"
                onClick={() => setDiscoveryOpen(false)}
                className="h-9 px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <div className="h-[calc(100vh-56px)] overflow-hidden p-3">
              {discoveryOpen ? <ClientMap onSelectBusiness={onSelectBusinessFromDrawer} /> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
