import { getUniverse } from "@/lib/rwa";
import { getSpotTickers } from "@/lib/spot";

/** One batched 24h ticker map (keyed by spot pair) for the whole universe. */
export async function GET() {
  try {
    const stocks = await getUniverse();
    const symbols = stocks.map((s) => s.cs).filter(Boolean);
    const data = symbols.length > 0 ? await getSpotTickers(symbols) : {};
    return Response.json({ ok: true, data });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "tickers failed" },
      { status: 502 },
    );
  }
}
