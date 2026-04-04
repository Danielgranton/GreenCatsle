export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export const apiUrl = (path) => {
  const p = String(path || "");
  if (!p) return API_BASE_URL;
  if (p.startsWith("http")) return p;
  if (!API_BASE_URL) return p.startsWith("/") ? p : `/${p}`;
  return `${API_BASE_URL}${p.startsWith("/") ? "" : "/"}${p}`;
};

