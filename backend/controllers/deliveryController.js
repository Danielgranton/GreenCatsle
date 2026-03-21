import axios from "axios";

const toNumber = (value) => {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
};

const parseGoogleDurationSeconds = (duration) => {
  // Routes API returns duration like "123s"
  if (typeof duration !== "string") return null;
  const m = duration.match(/^(\d+)s$/);
  if (!m) return null;
  const seconds = Number(m[1]);
  return Number.isFinite(seconds) ? seconds : null;
};

const getRoadRouteGoogle = async ({ originLat, originLng, destLat, destLng }) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    const err = new Error("GOOGLE_MAPS_API_KEY is not set");
    err.code = "MISSING_GOOGLE_KEY";
    throw err;
  }

  const response = await axios.post(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      origin: {
        location: { latLng: { latitude: originLat, longitude: originLng } },
      },
      destination: {
        location: { latLng: { latitude: destLat, longitude: destLng } },
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: false,
      languageCode: "en-US",
      units: "METRIC",
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      timeout: 15000,
    }
  );

  const route = response?.data?.routes?.[0];
  const distanceMeters = toNumber(route?.distanceMeters);
  const durationSeconds = parseGoogleDurationSeconds(route?.duration);

  if (distanceMeters == null) {
    const err = new Error("Google route distance missing");
    err.code = "GOOGLE_DISTANCE_MISSING";
    throw err;
  }

  return {
    distanceMeters,
    durationSeconds,
  };
};

export const calculateDelivery = async (req, res) => {
  try {
    const baseFee = toNumber(process.env.DELIVERY_BASE_FEE) ?? 0;
    const perKmFee = toNumber(process.env.DELIVERY_PER_KM_FEE) ?? 0;
    const perMinFee = toNumber(process.env.DELIVERY_PER_MIN_FEE) ?? 0;
    const minFee = toNumber(process.env.DELIVERY_MIN_FEE) ?? 0;

    const pickup = req.body?.pickup ?? req.body?.from ?? null;
    const dropoff = req.body?.dropoff ?? req.body?.to ?? null;

    const pickupLat = toNumber(pickup?.lat ?? req.body?.pickupLat ?? req.body?.fromLat);
    const pickupLng = toNumber(pickup?.lng ?? req.body?.pickupLng ?? req.body?.fromLng);
    const dropoffLat = toNumber(dropoff?.lat ?? req.body?.dropoffLat ?? req.body?.toLat);
    const dropoffLng = toNumber(dropoff?.lng ?? req.body?.dropoffLng ?? req.body?.toLng);

    if ([pickupLat, pickupLng, dropoffLat, dropoffLng].some((v) => v == null)) {
      return res.status(400).json({
        success: false,
        message: "Provide pickup/dropoff coordinates (lat/lng).",
      });
    }

    const { distanceMeters, durationSeconds } = await getRoadRouteGoogle({
      originLat: pickupLat,
      originLng: pickupLng,
      destLat: dropoffLat,
      destLng: dropoffLng,
    });

    const distanceKm = distanceMeters / 1000;
    const durationMinutes =
      durationSeconds == null ? null : Math.max(0, durationSeconds) / 60;

    const fee = Math.max(
      minFee,
      baseFee + perKmFee * distanceKm + (durationMinutes == null ? 0 : perMinFee * durationMinutes)
    );

    res.status(200).json({
      success: true,
      distanceKm,
      durationSeconds,
      fee,
      provider: "google_routes",
    });
  } catch (error) {
    console.error(error);
    if (error?.code === "MISSING_GOOGLE_KEY") {
      return res.status(500).json({
        success: false,
        message: "Set GOOGLE_MAPS_API_KEY on the backend to compute road distance.",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error calculating delivery fee",
    });
  }
};
