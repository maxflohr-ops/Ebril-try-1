// Best-effort per-identifier sliding-window rate limit.
//
// Runs in-process. On Vercel each serverless invocation has its own Map, so
// this is conservative (understates real traffic) rather than authoritative.
// Good enough as a second line of defense behind the DB row lock on the
// redemption path; swap for @upstash/ratelimit once we're on a real multi-
// instance runtime.

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

export interface LimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): LimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }
  // drop timestamps outside the window
  while (bucket.timestamps.length > 0 && bucket.timestamps[0] < cutoff) {
    bucket.timestamps.shift();
  }

  if (bucket.timestamps.length >= limit) {
    const retryAfterMs = windowMs - (now - bucket.timestamps[0]);
    return { ok: false, remaining: 0, retryAfterMs: Math.max(retryAfterMs, 250) };
  }

  bucket.timestamps.push(now);
  return { ok: true, remaining: limit - bucket.timestamps.length, retryAfterMs: 0 };
}

// Periodically prune dead buckets so long-lived processes don't leak memory.
if (typeof globalThis !== "undefined" && !("__ebrilRateLimitSweeperStarted" in globalThis)) {
  (globalThis as Record<string, unknown>).__ebrilRateLimitSweeperStarted = true;
  if (typeof setInterval !== "undefined") {
    setInterval(() => {
      const now = Date.now();
      for (const [k, b] of buckets) {
        if (b.timestamps.length === 0 || b.timestamps[b.timestamps.length - 1] < now - 5 * 60_000) {
          buckets.delete(k);
        }
      }
    }, 60_000).unref?.();
  }
}
