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

const signUrl = async ({ token, key, provider }) => {
  if (!key) return null;
  const p = encodeURIComponent(provider || "");
  const resp = await fetch(`${API_MEDIA}/signed?key=${encodeURIComponent(key)}&provider=${p}&expiresInSeconds=600`, {
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
  const [categoryImageUrls, setCategoryImageUrls] = React.useState({});
  const [tree, setTree] = React.useState(null);
  const [imageUrls, setImageUrls] = React.useState({});

  // Filters
  const [menuType, setMenuType] = React.useState("cooked"); // cooked/noncooked
  const [categoryId, setCategoryId] = React.useState("");
  const [availability, setAvailability] = React.useState("all");
  const [query, setQuery] = React.useState("");

  // Create category
  const [catName, setCatName] = React.useState("");
  const [catType, setCatType] = React.useState("cooked");
  const [catSaving, setCatSaving] = React.useState(false);
  const [catFile, setCatFile] = React.useState(null);

  // Upload category image (existing category)
  const [catImageCategoryId, setCatImageCategoryId] = React.useState("");
  const [catImageFile, setCatImageFile] = React.useState(null);
  const [catImageSaving, setCatImageSaving] = React.useState(false);

  // Create item
  const [itemName, setItemName] = React.useState("");
  const [itemPrice, setItemPrice] = React.useState("");
  const [itemDesc, setItemDesc] = React.useState("");
  const [itemAvailability, setItemAvailability] = React.useState("available");
  const [itemSaving, setItemSaving] = React.useState(false);
  const [itemFile, setItemFile] = React.useState(null);

  // Edit modal
  const [editing, setEditing] = React.useState(null);
  const [editName, setEditName] = React.useState("");
  const [editPrice, setEditPrice] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");
  const [editAvailability, setEditAvailability] = React.useState("available");
  const [editCategoryId, setEditCategoryId] = React.useState("");
  const [editSaving, setEditSaving] = React.useState(false);
  const [editDeleting, setEditDeleting] = React.useState(false);
  const [editImageUploading, setEditImageUploading] = React.useState(false);

  const uploadCategoryImage = React.useCallback(
    async ({ token, categoryId: nextCategoryId, file }) => {
      if (!nextCategoryId) throw new Error("Select a category");
      if (!file) throw new Error("Select an image file");
      const fd = new FormData();
      fd.append("image", file);
      const resp = await fetch(`${API_MENU_HIER}/business/${businessId}/categories/${nextCategoryId}/image`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to upload category image");
      const imageKey = data.imageKey || null;
      if (imageKey) {
        const url = await signUrl({ token, key: imageKey, provider: data.provider });
        if (url) setCategoryImageUrls((p) => ({ ...p, [imageKey]: url }));
      }
      return data;
    },
    [businessId]
  );

  const loadCategories = React.useCallback(async (token) => {
    const resp = await fetch(`${API_MENU_HIER}/business/${businessId}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await resp.json();
    if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load categories");
    const list = Array.isArray(data.categories) ? data.categories : [];
    setCategories(list);

    // Best-effort: sign category images for preview.
    const keys = list.map((c) => c?.image?.key).filter(Boolean);
    const unique = Array.from(new Set(keys));
    const missing = unique.filter((k) => !categoryImageUrls[k]);
    if (missing.length > 0) {
      const pairs = await Promise.all(missing.map(async (k) => {
        const cat = list.find((c) => c?.image?.key === k);
        return [k, await signUrl({ token, key: k, provider: cat?.image?.provider })];
      }));
      setCategoryImageUrls((prev) => {
        const next = { ...prev };
        for (const [k, url] of pairs) if (url) next[k] = url;
        return next;
      });
    }
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
    }
    const keys = allItems.map((x) => x?.image?.key).filter(Boolean);
    const unique = Array.from(new Set(keys));
    const missing = unique.filter((k) => !imageUrls[k]);
    if (missing.length > 0) {
      const pairs = await Promise.all(missing.map(async (k) => {
        const it = allItems.find((x) => x?.image?.key === k);
        return [k, await signUrl({ token, key: k, provider: it?.image?.provider })];
      }));
      setImageUrls((prev) => {
        const next = { ...prev };
        for (const [k, url] of pairs) if (url) next[k] = url;
        return next;
      });
    }
  }, [businessId, imageUrls]);

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
        });
      }
    }
    return out;
  }, [tree]);

  const filtered = React.useMemo(() => {
    const q = safeLower(query).trim();
    return itemsFlat.filter((row) => {
      const it = row.item;
      if (row.menuType !== menuType) return false;
      if (categoryId && row.categoryId !== String(categoryId)) return false;
      if (availability !== "all" && it.availability !== availability) return false;
      if (!q) return true;
      const parts = [
        it._id,
        it.name,
        it.description,
        row.categoryName,
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
      if (!catFile) throw new Error("Category image is required");

      const resp = await fetch(`${API_MENU_HIER}/business/${businessId}/categories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ menuType: catType, name, sortOrder: 0 }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to create category");

      const createdCategoryId = data?.category?._id ? String(data.category._id) : "";
      if (createdCategoryId) {
        await uploadCategoryImage({ token, categoryId: createdCategoryId, file: catFile });
      }
      setCatName("");
      setCatFile(null);
      setMessage("Category created");
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to create category");
    } finally {
      setCatSaving(false);
    }
  };

  const saveCategoryImage = async (e) => {
    e.preventDefault();
    setCatImageSaving(true);
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      await uploadCategoryImage({ token, categoryId: catImageCategoryId, file: catImageFile });
      setCatImageFile(null);
      setMessage("Category image updated");
      await loadCategories(token);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to upload category image");
    } finally {
      setCatImageSaving(false);
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
          const url = await signUrl({ token, key: imgData.imageKey, provider: imgData.provider });
          if (url) setImageUrls((p) => ({ ...p, [imgData.imageKey]: url }));
        }
      }

      setItemName("");
      setItemPrice("");
      setItemDesc("");
      setItemAvailability("available");
      setItemFile(null);
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
    if (row?.menuType) setMenuType(row.menuType);
    setEditing(row);
    setEditName(it.name || "");
    setEditPrice(String(it.price ?? ""));
    setEditDesc(it.description || "");
    setEditAvailability(it.availability || "available");
    setEditCategoryId(row.categoryId || "");
  };

  const closeEdit = () => {
    if (editSaving || editDeleting || editImageUploading) return;
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
        const url = await signUrl({ token, key: data.imageKey, provider: data.provider });
        if (url) setImageUrls((p) => ({ ...p, [data.imageKey]: url }));
      }
      setMessage("Image uploaded");
      await loadTree(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload image");
    }
  };

  const deleteEditingItem = async () => {
    const it = editing?.item;
    if (!it?._id) return;
    const ok = window.confirm(`Delete "${it.name || "this item"}"? This cannot be undone.`);
    if (!ok) return;

    setEditDeleting(true);
    setError("");
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");
      const resp = await fetch(`${API_MENU_ITEMS}/business/${businessId}/items/${it._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to delete item");
      setMessage("Item deleted");
      setEditing(null);
      await loadTree(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete item");
    } finally {
      setEditDeleting(false);
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
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCatFile(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                  required
                />
                <div className="text-[11px] text-gray-500 mt-1">Required: shows on the client menu.</div>
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
            <div className="text-sm font-semibold text-gray-900">Update category image</div>
            <div className="text-xs text-gray-500 mt-1">For categories created earlier.</div>
            <form onSubmit={saveCategoryImage} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select
                  value={catImageCategoryId}
                  onChange={(e) => setCatImageCategoryId(e.target.value)}
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
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                  {(() => {
                    const cat = categories.find((c) => String(c._id) === String(catImageCategoryId));
                    const key = cat?.image?.key || null;
                    const url = key ? categoryImageUrls[key] : null;
                    if (!url) return <div className="text-xs text-gray-500">img</div>;
                    return <img src={url} alt="category" className="w-full h-full object-cover" />;
                  })()}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">New image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCatImageFile(e.target.files?.[0] || null)}
                    className="w-full text-sm"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={catImageSaving}
                className="w-full h-11 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-semibold disabled:opacity-50"
              >
                {catImageSaving ? "Uploading…" : "Upload image"}
              </button>
            </form>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
            <div className="text-sm font-semibold text-gray-900">Create item</div>
            <form onSubmit={createItem} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Menu type</label>
                <select
                  value={menuType}
                  onChange={(e) => {
                    setMenuType(e.target.value);
                    setCategoryId("");
                  }}
                  className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="cooked">Cooked</option>
                  <option value="noncooked">Non-cooked</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Select category</option>
                  {categories
                    .filter((c) => c?.menuType === menuType)
                    .map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.menuType})
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
                  onChange={(e) => {
                    setMenuType(e.target.value);
                    setCategoryId("");
                  }}
                  className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
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
                  {categories
                    .filter((c) => c?.menuType === menuType)
                    .map((c) => (
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
            <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    Edit: {editing.item?.name || "Menu item"}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    ID: {editing.item?._id} • Type: {menuType}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={editSaving || editDeleting || editImageUploading}
                  className="h-9 px-3 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 disabled:opacity-50"
                >
                  Close
                </button>
              </div>

              <form
                className="flex-1 overflow-y-auto px-6 py-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveEdit();
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                  <div className="md:col-span-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Picture</div>
                    <div className="mt-2 rounded-2xl border border-gray-200 overflow-hidden bg-gray-50">
                      <div className="aspect-square w-full bg-gray-100 flex items-center justify-center">
                        {(() => {
                          const key = editing?.item?.image?.key || null;
                          const url = key ? imageUrls[key] : null;
                          if (!url) return <div className="text-sm text-gray-500">No image</div>;
                          return <img src={url} alt="item" className="w-full h-full object-cover" />;
                        })()}
                      </div>
                      <div className="p-3 flex items-center justify-between gap-3">
                        <div className="text-[11px] text-gray-500">Shown to customers.</div>
                        <label className="h-9 px-3 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 cursor-pointer inline-flex items-center">
                          {editImageUploading ? "Uploading…" : "Change"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={editImageUploading || editDeleting || editSaving}
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              e.target.value = "";
                              if (!f || !editing?.item?._id) return;
                              setEditImageUploading(true);
                              try {
                                await uploadImage(editing.item._id, f);
                              } finally {
                                setEditImageUploading(false);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-3 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">Category</label>
                      <select
                        value={editCategoryId}
                        onChange={(e) => setEditCategoryId(e.target.value)}
                        className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      >
                        <option value="">Select category</option>
                        {categories
                          .filter((c) => c?.menuType === menuType)
                          .map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name} ({c.menuType})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">Name</label>
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                          placeholder="e.g. Chicken Burger"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">Price (KES)</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                          placeholder="e.g. 550"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">Availability</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditAvailability("available")}
                          className={`h-9 px-4 rounded-xl text-sm font-semibold border transition ${
                            editAvailability === "available"
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          Available
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditAvailability("unavailable")}
                          className={`h-9 px-4 rounded-xl text-sm font-semibold border transition ${
                            editAvailability === "unavailable"
                              ? "bg-gray-900 border-gray-900 text-white"
                              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          Unavailable
                        </button>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-2">Unavailable items won’t show to customers.</div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">Description (optional)</label>
                      <textarea
                        rows={4}
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-2xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                        placeholder="Short description customers will see"
                      />
                    </div>
                  </div>
                </div>
              </form>

              <div className="px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={deleteEditingItem}
                  disabled={editSaving || editDeleting || editImageUploading}
                  className="h-10 px-4 rounded-xl text-sm font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50 mr-auto"
                >
                  {editDeleting ? "Deleting…" : "Delete"}
                </button>
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={editSaving || editDeleting || editImageUploading}
                  className="h-10 px-4 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={editSaving || editDeleting || editImageUploading}
                  className="h-10 px-4 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {editSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
