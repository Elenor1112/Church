import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";
import { env } from "../env";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Client IP, resistant to header spoofing.
 *
 * `x-forwarded-for` is append-only: each proxy adds the address it saw, so the
 * RIGHTMOST entries are the ones our own infrastructure wrote. Reading the
 * leftmost entry (the previous behaviour) reads whatever the *client* sent,
 * which lets an attacker rotate it per request and bypass the limit entirely.
 * We therefore index TRUSTED_PROXY_HOPS from the right.
 */
export function clientIp(c: Context): string {
  const hops = env.TRUSTED_PROXY_HOPS;
  if (hops > 0) {
    const chain = c.req
      .header("x-forwarded-for")
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (chain?.length) {
      // With N trusted proxies, the real client sits N entries from the end.
      const idx = Math.max(0, chain.length - hops);
      const ip = chain[idx];
      if (ip) return ip;
    }
  }
  // Fall back to the socket address, which cannot be forged.
  const socketIp = c.env?.incoming?.socket?.remoteAddress;
  return typeof socketIp === "string" && socketIp ? socketIp : "unknown";
}

/**
 * Fixed-window in-memory rate limiter. Suitable for a single Railway instance.
 * For multi-instance, swap the Map for Redis.
 */
export function rateLimit(opts: {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  /** Derive the bucket key from the request instead of the client IP. */
  keyBy?: (c: Context) => string;
}) {
  const { windowMs, max, keyPrefix = "rl", keyBy } = opts;
  return createMiddleware(async (c, next) => {
    const key = `${keyPrefix}:${keyBy ? keyBy(c) : clientIp(c)}`;
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

/**
 * Imperative limiter for keys only known after the body is parsed (e.g. the
 * phone number on login). Call `consume(key)` to count an attempt; it throws 429
 * once the window budget is exhausted. Shares the bucket store above.
 */
export function consumeLimiter(opts: { windowMs: number; max: number; keyPrefix: string }) {
  const { windowMs, max, keyPrefix } = opts;
  return (id: string) => {
    const key = `${keyPrefix}:${id}`;
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    bucket.count++;
    if (bucket.count > max) {
      throw new HTTPException(429, {
        message: "Too many attempts. Please try again later.",
      });
    }
  };
}

// Periodically clear expired buckets to avoid unbounded growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 60_000).unref();
