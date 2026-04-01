import React, { useCallback, useState } from "react";
import HeroSection from "../components/heresection.jsx";
import ClientMap from "../components/clientMap.jsx";
import MenuSection from "../components/MenuSection.jsx";

export default function HomePage() {
  const [businessCategory, setBusinessCategory] = useState("");
  const [menuType, setMenuType] = useState("cooked");

  const onSelectBusiness = useCallback((b) => {
    if (b?.category) setBusinessCategory(b.category);
    setTimeout(() => {
      const el = document.getElementById("menu-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, []);

  return (
    <div className="flex">
      <div className="w-[78%]">
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

      <div className="w-[22%] h-[calc(100vh-64px)] sticky top-16 overflow-y-scroll border-l border-gray-300 p-2">
        <ClientMap onSelectBusiness={onSelectBusiness} />
      </div>
    </div>
  );
}
