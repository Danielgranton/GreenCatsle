const buckets = new Map();

const nowMs = () => Date.now();

export const rateLimit = ({
  windowMs = 60_000,
  max = 30,
  keyFn = (req) => req.ip,
  message = "Too many requests, try again later",
} = {}) => {
  return (req, res, next) => {
    // Prevent unbounded memory growth in long-lived processes.
    if (buckets.size > 10_000) {
      const now = nowMs();
      for (const [k, v] of buckets.entries()) {
        if (now > v.resetAt) buckets.delete(k);
      }
    }

    const key = keyFn(req) || "global";
    const now = nowMs();

    const bucket = buckets.get(key) || { resetAt: now + windowMs, count: 0 };
    if (now > bucket.resetAt) {
      bucket.resetAt = now + windowMs;
      bucket.count = 0;
    }
    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ success: false, message });
    }

    next();
  };
};
