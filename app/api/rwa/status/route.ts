import { getMarketStatus } from "@/lib/rwa";

// Matches the 30s server-side cache TTL in lib/rwa.
const CACHE = "public, max-age=30, s-maxage=30, stale-while-revalidate=60";

export async function GET() {
  try {
    const data = await getMarketStatus();
    return Response.json({ ok: true, data }, { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
