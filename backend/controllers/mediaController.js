import { getSignedGetUrl } from "../services/storageService.js";

export const getSignedMediaUrl = async (req, res) => {
  try {
    const key = req.query?.key;
    if (!key || typeof key !== "string") {
      return res.status(400).json({ success: false, message: "key is required" });
    }

    const expiresInSecondsRaw = req.query?.expiresInSeconds;
    const expiresInSeconds =
      typeof expiresInSecondsRaw === "string" ? Number(expiresInSecondsRaw) : 300;

    const url = await getSignedGetUrl({
      key,
      expiresInSeconds: Number.isFinite(expiresInSeconds) ? expiresInSeconds : 300,
    });

    // In local storage mode we return `/images/...` which must be absolute for cross-origin frontends.
    const isRelativeLocal = typeof url === "string" && url.startsWith("/images/");
    if (isRelativeLocal) {
      const base =
        process.env.PUBLIC_BASE_URL ||
        `${req.protocol}://${req.get("host")}`;
      return res.status(200).json({ success: true, url: `${base}${url}` });
    }

    res.status(200).json({ success: true, url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to sign media url" });
  }
};
