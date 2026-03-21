import userModel from "../models/userModel.js";
import foodModel from "../models/foodModel.js";
import MenuItem from "../models/menuModel.js";
import Service from "../models/serviceModel.js";

const toInt = (v, fallback = 1) => {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

const sameId = (a, b) => String(a) === String(b);

const normalizeKind = (kind) => {
  const k = String(kind || "").toLowerCase();
  if (k === "menuitem") return "menu";
  return k;
};

const findLineIndex = (cart, { kind, refId }) => {
  return cart.findIndex((l) => l.kind === kind && sameId(l.refId, refId));
};

const migrateLegacyCartData = async (user) => {
  if (!user || (Array.isArray(user.cart) && user.cart.length > 0)) return;
  const cartData = user.cartData || {};
  const ids = Object.keys(cartData).filter((id) => cartData[id] > 0);
  if (ids.length === 0) return;

  const foods = await foodModel.find({ _id: { $in: ids } }).select("name price image category");
  const foodById = new Map(foods.map((f) => [String(f._id), f]));

  user.cart = ids.map((id) => {
    const qty = cartData[id];
    const f = foodById.get(String(id));
    return {
      kind: "food",
      refId: id,
      businessId: null,
      quantity: qty,
      name: f?.name || "",
      price: f?.price || 0,
      imageKey: f?.image || null,
      meta: { legacy: true, category: f?.category || "" },
    };
  });
  user.cartBusinessId = null;
  user.cartData = {}; // clear legacy cart
  await user.save();
};

const resolveSnapshot = async ({ kind, refId }) => {
  if (kind === "menu") {
    const item = await MenuItem.findById(refId).select("businessId name price image availability menuType categoryId subcategoryId");
    if (!item || item.availability === "unavailable") return null;
    return {
      businessId: item.businessId,
      name: item.name || "",
      price: item.price || 0,
      imageKey: item.image?.key || null,
      meta: { menuType: item.menuType, categoryId: item.categoryId, subcategoryId: item.subcategoryId },
    };
  }
  if (kind === "service") {
    const s = await Service.findById(refId).select("businessId name price image availability");
    if (!s || s.availability === "unavailable") return null;
    return {
      businessId: s.businessId,
      name: s.name || "",
      price: s.price || 0,
      imageKey: s.image?.key || null,
      meta: {},
    };
  }
  if (kind === "food") {
    const f = await foodModel.findById(refId).select("name price image category");
    if (!f) return null;
    return {
      businessId: null,
      name: f.name || "",
      price: f.price || 0,
      imageKey: f.image || null,
      meta: { category: f.category || "" },
    };
  }
  return null;
};

// Add items to cart
const addToCart = async (req, res) => {
  const userId = req.user.id;      //  use token user id
  const legacyItemId = req.body?.itemId;
  const kind = normalizeKind(req.body?.kind || (legacyItemId ? "food" : ""));
  const refId = req.body?.refId || legacyItemId;
  const quantityDelta = Math.max(1, toInt(req.body?.quantity, 1));

  try {
    const userData = await userModel.findById(userId);
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await migrateLegacyCartData(userData);

    if (!refId || !kind) {
      return res.status(400).json({ success: false, message: "kind and refId are required" });
    }

    const snapshot = await resolveSnapshot({ kind, refId });
    if (!snapshot) {
      return res.status(404).json({ success: false, message: "Item not found or unavailable" });
    }

    // Enforce single-business cart for menu/service.
    if (snapshot.businessId) {
      if (userData.cartBusinessId && !sameId(userData.cartBusinessId, snapshot.businessId)) {
        return res.status(409).json({
          success: false,
          message: "Cart contains items from another business. Clear cart first.",
        });
      }
      userData.cartBusinessId = snapshot.businessId;
    } else {
      // legacy food: don't allow mixing with a business cart
      if (userData.cartBusinessId) {
        return res.status(409).json({
          success: false,
          message: "Cart contains business items. Clear cart first.",
        });
      }
    }

    const cart = Array.isArray(userData.cart) ? userData.cart : [];
    const idx = findLineIndex(cart, { kind, refId });
    if (idx === -1) {
      cart.push({
        kind,
        refId,
        businessId: snapshot.businessId || null,
        quantity: quantityDelta,
        name: snapshot.name,
        price: snapshot.price,
        imageKey: snapshot.imageKey,
        meta: snapshot.meta || {},
      });
    } else {
      cart[idx].quantity = Math.max(1, toInt(cart[idx].quantity, 1) + quantityDelta);
      // Refresh snapshot fields on add
      cart[idx].name = snapshot.name;
      cart[idx].price = snapshot.price;
      cart[idx].imageKey = snapshot.imageKey;
    }
    userData.cart = cart;
    await userData.save();

    res.json({ success: true, message: "Added to cart", cartBusinessId: userData.cartBusinessId });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error adding to cart" });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  const userId = req.user.id; // token-based
  const legacyItemId = req.body?.itemId;
  const kind = normalizeKind(req.body?.kind || (legacyItemId ? "food" : ""));
  const refId = req.body?.refId || legacyItemId;
  const quantityDelta = Math.max(1, toInt(req.body?.quantity, 1));

  try {
    const userData = await userModel.findById(userId);
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await migrateLegacyCartData(userData);

    if (!refId || !kind) {
      return res.status(400).json({ success: false, message: "kind and refId are required" });
    }

    const cart = Array.isArray(userData.cart) ? userData.cart : [];
    const idx = findLineIndex(cart, { kind, refId });
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Item not in cart" });
    }

    const nextQty = toInt(cart[idx].quantity, 1) - quantityDelta;
    if (nextQty <= 0) {
      cart.splice(idx, 1);
    } else {
      cart[idx].quantity = nextQty;
    }

    userData.cart = cart;
    if (cart.length === 0) userData.cartBusinessId = null;
    await userData.save();

    res.json({ success: true, message: "Removed from cart", cartBusinessId: userData.cartBusinessId });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error removing from cart" });
  }
};

// Fetch items from cart
const getCart = async (req, res) => {
  const userId = req.user.id; //  token-based

  try {
    const userData = await userModel.findById(userId);
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found", cart: [] });
    }

    await migrateLegacyCartData(userData);
    res.json({
      success: true,
      cartBusinessId: userData.cartBusinessId,
      cart: userData.cart || [],
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error fetching cart", cart: [] });
  }
};

const clearCart = async (req, res) => {
  try {
    const userData = await userModel.findById(req.user.id);
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    userData.cart = [];
    userData.cartBusinessId = null;
    userData.cartData = {};
    await userData.save();
    res.status(200).json({ success: true, message: "Cart cleared" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to clear cart" });
  }
};

export { addToCart, removeFromCart, getCart, clearCart };
