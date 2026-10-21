import { getUniverse } from "@/lib/rwa";

// Universe is immutable-ish (server cache TTL is 1h) - let the browser/CDN
// serve it instead of re-entering the Node process on every cold mount.
const CACHE = "public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200";

export async function GET() {
  try {
    const data = await getUniverse();
    return Response.json({ ok: true, count: data.length, data }, { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
