/**
 * In-memory IP-based rate limiter.
 *
 * Production should swap this for Redis/Upstash, but the interface stays
 * the same. Limits are per (route-key, ip) with a sliding window.
 *
 * @module lib/security/rate-limit
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

// Periodic eviction to prevent unbounded growth in long-running processes.
const EVICTION_INTERVAL = 60_000;
let lastEviction = Date.now();

function evict(now: number) {
  if (now - lastEviction < EVICTION_INTERVAL) return;
  for (const [k, b] of store) {
    if (b.resetAt <= now) store.delete(k);
  }
  lastEviction = now;
}

export interface RateLimitOptions {
  /** unique key for the route/feature, e.g. "ai:chat" */
  key: string;
  /** identifier, usually IP or user id */
  identifier: string;
  /** max requests within the window */
  limit: number;
  /** window size in ms */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  evict(now);
  const k = `${opts.key}:${opts.identifier}`;
  const existing = store.get(k);

  if (!existing || existing.resetAt <= now) {
    const bucket: Bucket = { count: 1, resetAt: now + opts.windowMs };
    store.set(k, bucket);
    return { ok: true, remaining: opts.limit - 1, resetAt: bucket.resetAt };
  }

  existing.count += 1;
  const ok = existing.count <= opts.limit;
  return {
    ok,
    remaining: Math.max(0, opts.limit - existing.count),
    resetAt: existing.resetAt,
  };
}

/** Extract a best-effort client IP from request headers. */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}
