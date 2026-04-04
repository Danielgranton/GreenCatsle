import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import userModel from "../models/userModel.js";

const CLIENT_URL = process.env.CLIENT_PUBLIC_URL || "http://localhost:5173";

const base64url = (input) =>
  Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

const decodeBase64Url = (input) => {
  const s = String(input || "").replaceAll("-", "+").replaceAll("_", "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  return Buffer.from(s + pad, "base64");
};

const safeEqual = (a, b) => {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

const signState = ({ provider }) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");
  return jwt.sign({ provider, t: Date.now() }, secret, { expiresIn: "10m" });
};

const verifyState = (token) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");
  return jwt.verify(token, secret);
};

const absolutizeRedirect = (path) => {
  if (!path) return CLIENT_URL;
  if (String(path).startsWith("http")) return path;
  return `${CLIENT_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};

const createToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      businessId: user.businessId || null,
      name: user.name,
      email: user.email,
      tokenVersion: Number.isFinite(Number(user.tokenVersion)) ? Number(user.tokenVersion) : 0,
    },
    secret,
    { expiresIn: "7d" }
  );
};

const formUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  businessId: user.businessId || null,
  avatarKey: user.avatar?.key || null,
});

const ensureUser = async ({ name, email }) => {
  const existing = await userModel.findOne({ email });
  if (existing) return existing;

  const randomPassword = base64url(jwt.sign({ email, t: Date.now() }, process.env.JWT_SECRET)).slice(0, 32);
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(randomPassword, salt);

  const newUser = new userModel({
    name: name || email.split("@")[0],
    email,
    password: hashed,
    role: "user",
  });
  return await newUser.save();
};

export const oauthGoogleStart = async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(500).send("Missing GOOGLE_CLIENT_ID");

    const redirectUri = `${process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`}/api/oauth/google/callback`;
    const state = signState({ provider: "google" });
    const scope = encodeURIComponent("openid email profile");

    const url =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&state=${encodeURIComponent(state)}` +
      `&prompt=select_account`;

    res.redirect(url);
  } catch (e) {
    console.error(e);
    res.status(500).send("Failed to start Google OAuth");
  }
};

export const oauthGoogleCallback = async (req, res) => {
  try {
    const code = String(req.query?.code || "");
    const state = String(req.query?.state || "");
    if (!code || !state) return res.redirect(absolutizeRedirect("/?oauth=failed"));

    const decoded = verifyState(state);
    if (decoded?.provider !== "google") return res.redirect(absolutizeRedirect("/?oauth=failed"));

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return res.redirect(absolutizeRedirect("/?oauth=missing_keys"));

    const redirectUri = `${process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`}/api/oauth/google/callback`;

    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenResp.json().catch(() => ({}));
    if (!tokenResp.ok) {
      console.error("google token error", tokenData);
      return res.redirect(absolutizeRedirect("/?oauth=failed"));
    }

    const accessToken = tokenData.access_token;
    const userResp = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await userResp.json().catch(() => ({}));
    if (!userResp.ok || !profile?.email) return res.redirect(absolutizeRedirect("/?oauth=failed"));

    const user = await ensureUser({ name: profile.name, email: profile.email });
    user.lastLogin = new Date();
    await user.save();

    const jwtToken = createToken(user);
    const u = base64url(JSON.stringify(formUser(user)));
    res.redirect(absolutizeRedirect(`/oauth/callback?token=${encodeURIComponent(jwtToken)}&u=${encodeURIComponent(u)}`));
  } catch (e) {
    console.error(e);
    res.redirect(absolutizeRedirect("/?oauth=failed"));
  }
};

const metaScopes = (mode) => {
  // Instagram login is handled via Meta. This still returns a Meta user; you can request instagram scopes if you need them.
  if (mode === "instagram") return "email,public_profile";
  return "email,public_profile";
};

export const oauthMetaStart = async (req, res) => {
  try {
    const mode = String(req.query?.mode || "facebook"); // facebook | instagram
    const clientId = process.env.META_APP_ID;
    if (!clientId) return res.status(500).send("Missing META_APP_ID");

    const redirectUri = `${process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`}/api/oauth/meta/callback`;
    const state = signState({ provider: `meta:${mode}` });
    const scope = encodeURIComponent(metaScopes(mode));

    const url =
      `https://www.facebook.com/v20.0/dialog/oauth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}` +
      `&response_type=code` +
      `&scope=${scope}`;

    res.redirect(url);
  } catch (e) {
    console.error(e);
    res.status(500).send("Failed to start Meta OAuth");
  }
};

export const oauthMetaCallback = async (req, res) => {
  try {
    const code = String(req.query?.code || "");
    const state = String(req.query?.state || "");
    if (!code || !state) return res.redirect(absolutizeRedirect("/?oauth=failed"));

    const decoded = verifyState(state);
    const provider = String(decoded?.provider || "");
    if (!provider.startsWith("meta:")) return res.redirect(absolutizeRedirect("/?oauth=failed"));

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) return res.redirect(absolutizeRedirect("/?oauth=missing_keys"));

    const redirectUri = `${process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`}/api/oauth/meta/callback`;

    const tokenUrl =
      `https://graph.facebook.com/v20.0/oauth/access_token?` +
      `client_id=${encodeURIComponent(appId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&client_secret=${encodeURIComponent(appSecret)}` +
      `&code=${encodeURIComponent(code)}`;

    const tokenResp = await fetch(tokenUrl);
    const tokenData = await tokenResp.json().catch(() => ({}));
    if (!tokenResp.ok || !tokenData?.access_token) {
      console.error("meta token error", tokenData);
      return res.redirect(absolutizeRedirect("/?oauth=failed"));
    }

    const accessToken = tokenData.access_token;
    const meResp = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`
    );
    const me = await meResp.json().catch(() => ({}));
    if (!meResp.ok || !me?.email) return res.redirect(absolutizeRedirect("/?oauth=failed"));

    const user = await ensureUser({ name: me.name, email: me.email });
    user.lastLogin = new Date();
    await user.save();

    const jwtToken = createToken(user);
    const u = base64url(JSON.stringify(formUser(user)));
    res.redirect(absolutizeRedirect(`/oauth/callback?token=${encodeURIComponent(jwtToken)}&u=${encodeURIComponent(u)}`));
  } catch (e) {
    console.error(e);
    res.redirect(absolutizeRedirect("/?oauth=failed"));
  }
};

export const oauthMetaDeletion = async (req, res) => {
  try {
    const appSecret = process.env.META_APP_SECRET;
    const publicBase = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
    if (!appSecret) return res.status(500).json({ error: "Missing META_APP_SECRET" });

    const signedRequest = String(req.body?.signed_request || "");
    const [sigB64, payloadB64] = signedRequest.split(".");
    if (!sigB64 || !payloadB64) return res.status(400).json({ error: "Missing signed_request" });

    const expectedSig = crypto.createHmac("sha256", appSecret).update(payloadB64).digest();
    const providedSig = decodeBase64Url(sigB64);
    if (!safeEqual(expectedSig, providedSig)) return res.status(400).json({ error: "Invalid signature" });

    const payload = JSON.parse(decodeBase64Url(payloadB64).toString("utf8") || "{}");
    const userId = String(payload?.user_id || "");

    const confirmationCode = base64url(jwt.sign({ p: "meta", userId, t: Date.now() }, process.env.JWT_SECRET)).slice(0, 16);
    const statusUrl = `${publicBase}/api/oauth/meta/deletion/status?code=${encodeURIComponent(confirmationCode)}`;

    // Note: we don't store provider user_id in the DB today; deletion is handled via the in-app email-based request.
    // This endpoint exists to satisfy Meta's "Data Deletion Callback" requirement and acknowledge receipt.
    return res.json({ url: statusUrl, confirmation_code: confirmationCode });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to process deletion request" });
  }
};

export const oauthMetaDeletionStatus = async (req, res) => {
  return res.json({
    status: "received",
    code: String(req.query?.code || ""),
  });
};

export const oauthMicrosoftStart = async (req, res) => {
  try {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    if (!clientId) return res.status(500).send("Missing MICROSOFT_CLIENT_ID");

    const redirectUri = `${process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`}/api/oauth/microsoft/callback`;
    const state = signState({ provider: "microsoft" });

    const scope = encodeURIComponent("openid email profile User.Read");
    const url =
      `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_mode=query` +
      `&scope=${scope}` +
      `&state=${encodeURIComponent(state)}` +
      `&prompt=select_account`;

    res.redirect(url);
  } catch (e) {
    console.error(e);
    res.status(500).send("Failed to start Microsoft OAuth");
  }
};

export const oauthMicrosoftCallback = async (req, res) => {
  try {
    const code = String(req.query?.code || "");
    const state = String(req.query?.state || "");
    if (!code || !state) return res.redirect(absolutizeRedirect("/?oauth=failed"));

    const decoded = verifyState(state);
    if (decoded?.provider !== "microsoft") return res.redirect(absolutizeRedirect("/?oauth=failed"));

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    if (!clientId || !clientSecret) return res.redirect(absolutizeRedirect("/?oauth=missing_keys"));

    const redirectUri = `${process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`}/api/oauth/microsoft/callback`;

    const tokenResp = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        scope: "openid email profile User.Read",
      }),
    });
    const tokenData = await tokenResp.json().catch(() => ({}));
    if (!tokenResp.ok || !tokenData?.access_token) {
      console.error("microsoft token error", tokenData);
      return res.redirect(absolutizeRedirect("/?oauth=failed"));
    }

    const accessToken = tokenData.access_token;
    const meResp = await fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const me = await meResp.json().catch(() => ({}));
    if (!meResp.ok) {
      console.error("microsoft me error", me);
      return res.redirect(absolutizeRedirect("/?oauth=failed"));
    }

    const email = String(me?.mail || me?.userPrincipalName || "").trim();
    if (!email) return res.redirect(absolutizeRedirect("/?oauth=failed"));

    const name = String(me?.displayName || email.split("@")[0] || "").trim();
    const user = await ensureUser({ name, email });
    user.lastLogin = new Date();
    await user.save();

    const jwtToken = createToken(user);
    const u = base64url(JSON.stringify(formUser(user)));
    res.redirect(absolutizeRedirect(`/oauth/callback?token=${encodeURIComponent(jwtToken)}&u=${encodeURIComponent(u)}`));
  } catch (e) {
    console.error(e);
    res.redirect(absolutizeRedirect("/?oauth=failed"));
  }
};
