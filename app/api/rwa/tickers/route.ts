import { getUniverse } from "@/lib/rwa";
import { getSpotTickers } from "@/lib/spot";

/** One batched 24h ticker map (keyed by spot pair) for the whole universe. */
// Matches the 15s server-side TTL in lib/spot.
const CACHE = "public, max-age=15, s-maxage=15, stale-while-revalidate=30";

export async function GET() {
  try {
    const stocks = await getUniverse();
    const symbols = stocks.map((s) => s.cs).filter(Boolean);
    const data = symbols.length > 0 ? await getSpotTickers(symbols) : {};
    return Response.json({ ok: true, data }, { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "tickers failed" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
