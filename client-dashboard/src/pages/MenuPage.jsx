import React, { useState } from "react";
import MenuSection from "../components/MenuSection.jsx";

export default function MenuPage() {
  const [businessCategory, setBusinessCategory] = useState("");
  const [menuType, setMenuType] = useState("cooked");

  return (
    <div className="max-w-6xl mx-auto">
      <MenuSection
        businessCategory={businessCategory}
        onBusinessCategoryChange={setBusinessCategory}
        menuType={menuType}
        onMenuTypeChange={setMenuType}
      />
    </div>
  );
}

