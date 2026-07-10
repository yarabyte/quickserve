/**
 * Simple in-memory sliding-window rate limiter (per process).
 * Suitable for single-instance / serverless warm instances.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
};

export function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number } = { limit: 60, windowMs: 60_000 },
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < options.windowMs);

  if (bucket.timestamps.length >= options.limit) {
    buckets.set(key, bucket);
    const oldest = bucket.timestamps[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, options.windowMs - (now - oldest)),
    };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return {
    allowed: true,
    remaining: options.limit - bucket.timestamps.length,
  };
}

/** Test helper */
export function resetRateLimits(): void {
  buckets.clear();
}
