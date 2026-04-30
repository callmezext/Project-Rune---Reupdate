/**
 * ═══════════════════════════════════════════════════════════
 *  RuneClipy — Simple In-Memory Rate Limiter
 * ═══════════════════════════════════════════════════════════
 *  Use for API protection. For production with multiple
 *  instances, switch to Redis-based rate limiting.
 * ═══════════════════════════════════════════════════════════
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Check if a request should be rate limited
 * @param key - Unique identifier (IP, userId, etc.)
 * @param maxRequests - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns { limited: boolean, remaining: number, resetIn: number }
 */
export function rateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60 * 1000
): { limited: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: maxRequests - 1, resetIn: windowMs };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return { limited: true, remaining: 0, resetIn: entry.resetAt - now };
  }

  return { limited: false, remaining: maxRequests - entry.count, resetIn: entry.resetAt - now };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

/**
 * Pre-built rate limit configs
 */
export const RATE_LIMITS = {
  login: { max: 5, window: 15 * 60 * 1000 },    // 5 per 15 min
  register: { max: 3, window: 60 * 60 * 1000 },  // 3 per hour
  submit: { max: 10, window: 60 * 60 * 1000 },   // 10 per hour
  verify: { max: 5, window: 10 * 60 * 1000 },    // 5 per 10 min
  withdraw: { max: 3, window: 60 * 60 * 1000 },  // 3 per hour
  api: { max: 60, window: 60 * 1000 },            // 60 per min
};
