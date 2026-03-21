import React from "react";

const API_MENU_HIER = "http://localhost:4000/api/menu-hierarchy";
const API_BUSINESS = "http://localhost:4000/api/business";
const API_MENU_ITEMS = "http://localhost:4000/api/menu-items";
const API_MENU_MEDIA = "http://localhost:4000/api/menu-media";
const API_MEDIA = "http://localhost:4000/api/media";

const formatMoney = (amount, currency = "KES") => {
  try {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(Number(amount || 0));
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
};

const safeLower = (v) => String(v || "").toLowerCase();

const badge = (availability) => {
  const base = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border";
  if (availability === "available") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  return `${base} bg-gray-50 text-gray-700 border-gray-200`;
};

const signUrl = async ({ token, key }) => {
  if (!key) return null;
  const resp = await fetch(`${API_MEDIA}/signed?key=${encodeURIComponent(key)}&expiresInSeconds=600`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  if (!resp.ok || !data?.success) return null;
  return data.url || null;
};

export default function AdminMenuPage() {
  const businessId = localStorage.getItem("businessId") || "";

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  const [categories, setCategories] = React.useState([]);
  const [subcategories, setSubcategories] = React.useState([]);
  const [tree, setTree] = React.useState(null);
  const [imageUrls, setImageUrls] = React.useState({});

  // Filters
  const [menuType, setMenuType] = React.useState("all"); // cooked/noncooked/all
  const [categoryId, setCategoryId] = React.useState("");
  const [availability, setAvailability] = React.useState("all");
  const [query, setQuery] = React.useState("");

  // Create category
  const [catName, setCatName] = React.useState("");
  const [catType, setCatType] = React.useState("cooked");
  const [catSaving, setCatSaving] = React.useState(false);

  // Create subcategory
  const [subName, setSubName] = React.useState("");
  const [subSaving, setSubSaving] = React.useState(false);

  // Create item
  const [itemName, setItemName] = React.useState("");
  const [itemPrice, setItemPrice] = React.useState("");
  const [itemDesc, setItemDesc] = React.useState("");
  const [itemAvailability, setItemAvailability] = React.useState("available");
  const [itemSaving, setItemSaving] = React.useState(false);
  const [itemFile, setItemFile] = React.useState(null);
  const [itemSubcategoryId, setItemSubcategoryId] = React.useState("");

  // Edit modal
  const [editing, setEditing] = React.useState(null);
  const [editName, setEditName] = React.useState("");
  const [editPrice, setEditPrice] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");
  const [editAvailability, setEditAvailability] = React.useState("available");
  const [editCategoryId, setEditCategoryId] = React.useState("");
  const [editSubcategoryId, setEditSubcategoryId] = React.useState("");
  const [editSaving, setEditSaving] = React.useState(false);

  const loadCategories = React.useCallback(async (token) => {
    const resp = await fetch(`${API_MENU_HIER}/business/${businessId}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await resp.json();
    if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load categories");
    setCategories(Array.isArray(data.categories) ? data.categories : []);
  }, [businessId]);

  const loadTree = React.useCallback(async (token) => {
    const resp = await fetch(`${API_MENU_HIER}/business/${businessId}/tree`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await resp.json();
    if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load menu");
    setTree(data.tree || null);

    // Best-effort: sign item images for preview.
    const allItems = [];
    const cooked = data?.tree?.cooked || [];
    const noncooked = data?.tree?.noncooked || [];
    for (const group of [...cooked, ...noncooked]) {
      for (const it of group?.items || []) allItems.push(it);
      for (const sub of group?.subcategories || []) {
        for (const it of sub?.items || []) allItems.push(it);
      }
    }
    const keys = allItems.map((x) => x?.image?.key).filter(Boolean);
    const unique = Array.from(new Set(keys));
    const missing = unique.filter((k) => !imageUrls[k]);
    if (missing.length > 0) {
      const pairs = await Promise.all(missing.map(async (k) => [k, await signUrl({ token, key: k })]));
      setImageUrls((prev) => {
        const next = { ...prev };
        for (const [k, url] of pairs) if (url) next[k] = url;
        return next;
      });
    }
  }, [businessId, imageUrls]);

  const loadSubcategories = React.useCallback(
    async (token, nextCategoryId) => {
      if (!nextCategoryId) {
        setSubcategories([]);
        return;
      }
      const resp = await fetch(
        `${API_MENU_HIER}/business/${businessId}/categories/${nextCategoryId}/subcategories`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load subcategories");
      setSubcategories(Array.isArray(data.subcategories) ? data.subcategories : []);
    },
    [businessId]
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      if (!businessId) throw new Error("Missing businessId for this account.");
      await Promise.all([loadCategories(token), loadTree(token)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, [businessId, loadCategories, loadTree]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setItemSubcategoryId("");
    void loadSubcategories(token, categoryId);
  }, [categoryId, loadSubcategories]);

  const itemsFlat = React.useMemo(() => {
    const out = [];
    const cooked = tree?.cooked || [];
    const noncooked = tree?.noncooked || [];
    const groups = [...cooked, ...noncooked];
    for (const g of groups) {
      const cat = g.category;
      for (const it of g.items || []) {
        out.push({
          item: it,
          menuType: cat?.menuType || it.menuType || "cooked",
          categoryId: String(cat?._id || it.categoryId || ""),
          categoryName: cat?.name || it.category || "",
          subcategoryId: "",
          subcategoryName: "",
        });
      }
      for (const s of g.subcategories || []) {
        for (const it of s.items || []) {
          out.push({
            item: it,
            menuType: cat?.menuType || it.menuType || "cooked",
            categoryId: String(cat?._id || it.categoryId || ""),
            categoryName: cat?.name || it.category || "",
            subcategoryId: String(s?.subcategory?._id || it.subcategoryId || ""),
            subcategoryName: s?.subcategory?.name || "",
          });
        }
      }
    }
    return out;
  }, [tree]);

  const filtered = React.useMemo(() => {
    const q = safeLower(query).trim();
    return itemsFlat.filter((row) => {
      const it = row.item;
      if (menuType !== "all" && row.menuType !== menuType) return false;
      if (categoryId && row.categoryId !== String(categoryId)) return false;
      if (availability !== "all" && it.availability !== availability) return false;
      if (!q) return true;
      const parts = [
        it._id,
        it.name,
        it.description,
        row.categoryName,
        row.subcategoryName,
        it.availability,
        it.menuType,
      ]
        .map(safeLower)
        .join(" ");
      return parts.includes(q);
    });
  }, [availability, categoryId, itemsFlat, menuType, query]);

  const summary = React.useMemo(() => {
    const s = { total: itemsFlat.length, available: 0, unavailable: 0, categories: categories.length };
    for (const r of itemsFlat) {
      if (r.item?.availability === "available") s.available += 1;
      else s.unavailable += 1;
    }
    return s;
  }, [categories.length, itemsFlat]);

  const createCategory = async (e) => {
    e.preventDefault();
    setCatSaving(true);
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      const name = catName.trim();
      if (!name) throw new Error("Category name is required");

      const resp = await fetch(`${API_MENU_HIER}/business/${businessId}/categories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ menuType: catType, name, sortOrder: 0 }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to create category");
      setCatName("");
      setMessage("Category created");
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to create category");
    } finally {
      setCatSaving(false);
    }
  };

  const createSubcategory = async (e) => {
    e.preventDefault();
    setSubSaving(true);
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      if (!categoryId) throw new Error("Select a category first");
      const name = subName.trim();
      if (!name) throw new Error("Subcategory name is required");

      const resp = await fetch(`${API_MENU_HIER}/business/${businessId}/categories/${categoryId}/subcategories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name, sortOrder: 0 }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to create subcategory");
      setSubName("");
      setMessage("Subcategory created");
      await loadSubcategories(token, categoryId);
      await loadTree(token);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to create subcategory");
    } finally {
      setSubSaving(false);
    }
  };

  const createItem = async (e) => {
    e.preventDefault();
    setItemSaving(true);
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      if (!categoryId) throw new Error("Select a category first");
      const name = itemName.trim();
      if (!name) throw new Error("Item name is required");
      const price = Number(itemPrice);
      if (!Number.isFinite(price) || price < 0) throw new Error("Enter a valid price");

      const resp = await fetch(`${API_BUSINESS}/${businessId}/menu`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: itemDesc,
          price,
          categoryId,
          subcategoryId: itemSubcategoryId ? itemSubcategoryId : undefined,
          availability: itemAvailability,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to create menu item");

      const created = data.menuItem;
      // optional immediate image upload
      if (itemFile && created?._id) {
        const fd = new FormData();
        fd.append("image", itemFile);
        const imgResp = await fetch(`${API_MENU_MEDIA}/business/${businessId}/items/${created._id}/image`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const imgData = await imgResp.json();
        if (imgResp.ok && imgData?.success && imgData.imageKey) {
          const url = await signUrl({ token, key: imgData.imageKey });
          if (url) setImageUrls((p) => ({ ...p, [imgData.imageKey]: url }));
        }
      }

      setItemName("");
      setItemPrice("");
      setItemDesc("");
      setItemAvailability("available");
      setItemFile(null);
      setItemSubcategoryId("");
      setMessage("Menu item created");
      await loadTree(token);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to create menu item");
    } finally {
      setItemSaving(false);
    }
  };

  const toggleAvailability = async (row) => {
    const it = row?.item;
    if (!it?._id) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      const next = it.availability === "available" ? "unavailable" : "available";
      const resp = await fetch(`${API_MENU_ITEMS}/business/${businessId}/items/${it._id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ availability: next }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to update item");
      setMessage("Availability updated");
      await loadTree(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update item");
    }
  };

  const openEdit = async (row) => {
    const it = row?.item;
    if (!it?._id) return;
    setEditing(row);
    setEditName(it.name || "");
    setEditPrice(String(it.price ?? ""));
    setEditDesc(it.description || "");
    setEditAvailability(it.availability || "available");
    setEditCategoryId(row.categoryId || "");
    setEditSubcategoryId(row.subcategoryId || "");
    try {
      const token = localStorage.getItem("token");
      if (token && row.categoryId) await loadSubcategories(token, row.categoryId);
    } catch {
      // ignore
    }
  };

  const closeEdit = () => {
    if (editSaving) return;
    setEditing(null);
  };

  const saveEdit = async () => {
    if (!editing?.item?._id) return;
    setEditSaving(true);
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");

      const price = Number(editPrice);
      if (!Number.isFinite(price) || price < 0) throw new Error("Enter a valid price");

      const resp = await fetch(`${API_MENU_ITEMS}/business/${businessId}/items/${editing.item._id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDesc,
          price,
          availability: editAvailability,
          categoryId: editCategoryId || undefined,
          subcategoryId: editSubcategoryId || undefined,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to update menu item");
      setMessage("Menu item updated");
      setEditing(null);
      await loadTree(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update menu item");
    } finally {
      setEditSaving(false);
    }
  };

  const uploadImage = async (menuItemId, file) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      const fd = new FormData();
      fd.append("image", file);
      const resp = await fetch(`${API_MENU_MEDIA}/business/${businessId}/items/${menuItemId}/image`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to upload image");
      if (data.imageKey) {
        const url = await signUrl({ token, key: data.imageKey });
        if (url) setImageUrls((p) => ({ ...p, [data.imageKey]: url }));
      }
      setMessage("Image uploaded");
      await loadTree(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload image");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <p className="text-sm text-gray-600 mt-1">Create categories and manage menu items.</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="h-10 px-4 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {message ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-sm">{message}</div>
      ) : null}
      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Items</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">{summary.total}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Available</div>
          <div className="text-xl font-semibold text-emerald-700 mt-1">{summary.available}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Unavailable</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">{summary.unavailable}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Categories</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">{summary.categories}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        {/* Left: creation */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
            <div className="text-sm font-semibold text-gray-900">Create category</div>
            <form onSubmit={createCategory} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Menu type</label>
                <select
                  value={catType}
                  onChange={(e) => setCatType(e.target.value)}
                  className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="cooked">Cooked</option>
                  <option value="noncooked">Non-cooked</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="e.g. Burgers"
                />
              </div>
              <button
                type="submit"
                disabled={catSaving}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
              >
                {catSaving ? "Creating…" : "Create category"}
              </button>
            </form>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
            <div className="text-sm font-semibold text-gray-900">Create subcategory</div>
            <div className="text-xs text-gray-500 mt-1">Optional: subcategories help you organize items.</div>
            <form onSubmit={createSubcategory} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.menuType})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="e.g. Beef"
                />
              </div>
              <button
                type="submit"
                disabled={subSaving}
                className="w-full h-11 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-semibold disabled:opacity-50"
              >
                {subSaving ? "Creating…" : "Create subcategory"}
              </button>
            </form>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
            <div className="text-sm font-semibold text-gray-900">Create item</div>
            <form onSubmit={createItem} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.menuType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subcategory (optional)</label>
                <select
                  value={itemSubcategoryId}
                  onChange={(e) => setItemSubcategoryId(e.target.value)}
                  className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  disabled={!categoryId}
                >
                  <option value="">None</option>
                  {subcategories.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="e.g. Chicken Burger"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Price</label>
                  <input
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="e.g. 550"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Availability</label>
                  <select
                    value={itemAvailability}
                    onChange={(e) => setItemAvailability(e.target.value)}
                    className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
                <textarea
                  rows={3}
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-2xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Short description for customers"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Image (optional)</label>
                <input type="file" accept="image/*" onChange={(e) => setItemFile(e.target.files?.[0] || null)} />
              </div>

              <button
                type="submit"
                disabled={itemSaving}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
              >
                {itemSaving ? "Creating…" : "Create item"}
              </button>
            </form>
          </div>
        </div>

        {/* Right: list */}
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">Menu items</div>
              <div className="text-xs text-gray-500 mt-1">Search, filter and manage availability.</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 w-full md:w-auto">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select
                  value={menuType}
                  onChange={(e) => setMenuType(e.target.value)}
                  className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="all">All</option>
                  <option value="cooked">Cooked</option>
                  <option value="noncooked">Non-cooked</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Availability</label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="all">All</option>
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">All</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="name, category…"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 border border-gray-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs font-semibold text-gray-600">
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Availability</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-gray-600">
                        Loading…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-gray-600">
                        No menu items found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => {
                      const it = row.item;
                      const imgKey = it?.image?.key || null;
                      const imgUrl = imgKey ? imageUrls[imgKey] : null;
                      return (
                        <tr key={it._id} className="align-top">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                                {imgUrl ? (
                                  <img src={imgUrl} alt="item" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="text-xs text-gray-500">img</div>
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{it.name || "—"}</div>
                                <div className="text-xs text-gray-500 mt-1 line-clamp-1">{it.description || ""}</div>
                                <div className="text-[11px] text-gray-500 mt-1">{row.menuType}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-gray-700">
                            <div className="font-semibold">{row.categoryName || "—"}</div>
                            {row.subcategoryName ? (
                              <div className="text-xs text-gray-500 mt-1">{row.subcategoryName}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-4 text-gray-900 font-semibold whitespace-nowrap">
                            {formatMoney(it.price || 0, "KES")}
                          </td>
                          <td className="px-4 py-4">
                            <span className={badge(it.availability)}>{it.availability}</span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <label className="h-9 px-3 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 cursor-pointer">
                                Image
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) void uploadImage(it._id, f);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => toggleAvailability(row)}
                                className="h-9 px-3 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50"
                              >
                                Toggle
                              </button>
                              <button
                                type="button"
                                onClick={() => openEdit(row)}
                                className="h-9 px-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeEdit} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
              <div className="p-5 border-b border-gray-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Edit menu item</div>
                    <div className="text-xs text-gray-500 mt-1">{editing.item?._id}</div>
                  </div>
                  <button
                    type="button"
                    onClick={closeEdit}
                    disabled={editSaving}
                    className="h-9 px-3 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 disabled:opacity-50"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Category</label>
                    <select
                      value={editCategoryId}
                      onChange={async (e) => {
                        const next = e.target.value;
                        setEditCategoryId(next);
                        setEditSubcategoryId("");
                        try {
                          const token = localStorage.getItem("token");
                          if (token) await loadSubcategories(token, next);
                        } catch {
                          // ignore
                        }
                      }}
                      className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    >
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} ({c.menuType})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Subcategory</label>
                    <select
                      value={editSubcategoryId}
                      onChange={(e) => setEditSubcategoryId(e.target.value)}
                      className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      disabled={!editCategoryId}
                    >
                      <option value="">None</option>
                      {subcategories.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Name</label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Price</label>
                    <input
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Description</label>
                  <textarea
                    rows={4}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-2xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Availability</label>
                  <select
                    value={editAvailability}
                    onChange={(e) => setEditAvailability(e.target.value)}
                    className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>
              </div>

              <div className="p-5 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={editSaving}
                  className="h-10 px-4 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={editSaving}
                  className="h-10 px-4 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {editSaving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
