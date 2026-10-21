// Minimal in-memory sliding-window rate limiter for the API proxy routes.
// Per-instance only (serverless resets it), but enough to blunt key/quota
// draining and upstream hammering from a single client.

type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Returns true when the request is within `limit` calls per `windowMs`
 * for the given key. Fails open on weird input so a bad header never
 * blocks traffic.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= MAX_BUCKETS) {
      // Bound memory: drop the oldest ~10% of keys.
      const drop = Math.ceil(MAX_BUCKETS * 0.1);
      let n = 0;
      for (const k of buckets.keys()) {
        buckets.delete(k);
        if (++n >= drop) break;
      }
    }
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= limit) return false;
  bucket.hits.push(now);
  return true;
}

/** Convenience: 429 response for a rejected request. */
export function tooMany(): Response {
  return Response.json({ ok: false, error: "rate limit exceeded" }, { status: 429 });
}
