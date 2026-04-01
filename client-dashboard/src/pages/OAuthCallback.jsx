import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const b64urlToStr = (s) => {
  try {
    const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
    const b64 = (s + pad).replaceAll("-", "+").replaceAll("_", "/");
    return atob(b64);
  } catch {
    return "";
  }
};

export default function OAuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const token = qs.get("token") || "";
    const u = qs.get("u") || "";

    if (token) localStorage.setItem("token", token);
    if (u) {
      const raw = b64urlToStr(u);
      try {
        const obj = JSON.parse(raw);
        localStorage.setItem("user", JSON.stringify(obj));
      } catch {
        // ignore
      }
    }
    try {
      sessionStorage.removeItem("fn_loc_prompt_dismissed");
      sessionStorage.removeItem("fn_location_enabled");
    } catch {
      // ignore
    }

    // Full refresh so the navbar + app state is consistent after social login.
    window.location.replace("/#ads-section");
  }, [location.search, navigate]);

  return (
    <div className="min-h-[60vh] grid place-items-center px-6">
      <div className="text-sm text-gray-700">Signing you in…</div>
    </div>
  );
}
