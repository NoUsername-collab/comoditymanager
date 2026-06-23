/**
 * Simple in-memory rate limiter for server actions.
 *
 * Uses a sliding window per key (typically IP address).
 * Entries are lazily cleaned up on each check to prevent unbounded growth.
 *
 * NOTE: Per-process — state resets on each Vercel cold start. This means
 * a determined attacker could get `limit` extra attempts per cold start.
 * Acceptable for a pension app; Supabase Auth adds its own rate limiting
 * (default 30 req/min) as a second layer. For high-security endpoints,
 * use a persistent store (Redis / Upstash).
 */

type RateLimitEntry = {
  timestamps: number[];
};

const store = new Map<string, RateLimitEntry>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000; // cleanup stale entries every 60s

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

/**
 * Check if a request should be rate-limited.
 *
 * @param key    Unique identifier (e.g. IP address, user ID)
 * @param limit  Max number of requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 * @returns `{ allowed: true, remaining }` or `{ allowed: false, retryAfterMs }`
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: true; remaining: number } | { allowed: false; retryAfterMs: number } {
  const now = Date.now();
  cleanup(windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  const cutoff = now - windowMs;
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0]!;
    const retryAfterMs = oldest + windowMs - now;
    return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: limit - entry.timestamps.length };
}

/**
 * Get the client IP from request headers.
 * Works with Next.js server actions via the `headers()` function.
 */
export async function getClientIp(): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

// ─── Presets ─────────────────────────────────────────────────────────

/** Public booking form: max 5 submissions per 10 minutes per IP */
export const RATE_LIMIT_BOOKING_SUBMIT = { limit: 5, windowMs: 10 * 60 * 1000 };

/** Public preview: max 30 previews per 5 minutes per IP */
export const RATE_LIMIT_BOOKING_PREVIEW = { limit: 30, windowMs: 5 * 60 * 1000 };

/** Password verification (location unlock): max 5 attempts per 15 minutes per IP */
export const RATE_LIMIT_PASSWORD_VERIFY = { limit: 5, windowMs: 15 * 60 * 1000 };

/** Guest stay code lookup: max 30 attempts per 5 minutes per IP (brute-force guard) */
export const RATE_LIMIT_GUEST_ACCESS = { limit: 30, windowMs: 5 * 60 * 1000 };

/** Guest stay form submissions: max 10 per 10 minutes per IP */
export const RATE_LIMIT_GUEST_STAY_ACTION = { limit: 10, windowMs: 10 * 60 * 1000 };

/** Staff login: max 10 attempts per 15 minutes per IP (Supabase Auth adds its own limit) */
export const RATE_LIMIT_LOGIN = { limit: 10, windowMs: 15 * 60 * 1000 };
