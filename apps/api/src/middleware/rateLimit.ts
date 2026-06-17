import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Fixed-window in-memory rate limiter. Suitable for a single Railway instance.
 * For multi-instance, swap the Map for Redis.
 */
export function rateLimit(opts: { windowMs: number; max: number; keyPrefix?: string }) {
  const { windowMs, max, keyPrefix = "rl" } = opts;
  return createMiddleware(async (c, next) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "unknown";
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      bucket.count++;
      if (bucket.count > max) {
        const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
        c.header("Retry-After", String(retryAfter));
        throw new HTTPException(429, { message: "Too many requests. Please slow down." });
      }
    }
    await next();
  });
}

// Periodically clear expired buckets to avoid unbounded growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 60_000).unref();
