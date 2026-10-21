// Sliding-window limiter, local to this app.

type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= MAX_BUCKETS) {
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

export function tooMany(): Response {
  return Response.json({ ok: false, error: "Too many attempts. Wait a minute." }, { status: 429 });
}
