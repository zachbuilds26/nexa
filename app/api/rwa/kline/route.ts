import { getKline } from "@/lib/kline";
import { clientIp, rateLimit, tooMany } from "@/lib/rateLimit";

export async function GET(request: Request) {
  // Each distinct address/interval is a cache miss that hits Binance bapi.
  // The stocks/trade tables fill their 1h column one address at a time (up to
  // the full ~90-token universe per fresh session), so the limit has to clear
  // that burst - 30/min self-429ed half of every first /stocks visit. Still
  // bounded well above a full fan-out to blunt a script cycling addresses;
  // upstream stays protected by the 60s server cache and the finite universe.
  if (!rateLimit(`kline:${clientIp(request)}`, 150, 60_000)) {
    return tooMany();
  }
  const sp = new URL(request.url).searchParams;
  const address = sp.get("address");
  const interval = sp.get("interval") ?? "1h";
  // Clamp into [1, 300]: Math.min alone lets a negative limit through to
  // the upstream (and Number("abc") || 48 only covers NaN, not negatives).
  const rawLimit = Number(sp.get("limit") ?? "48");
  const limit = Math.min(
    Math.max(Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 48, 1),
    300,
  );

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return Response.json({ ok: false, error: "address query param required" }, { status: 400 });
  }
  if (!/^[1-9][0-9]*[mhdwM]$|^[0-9]+[mhdw]$/.test(interval) && !["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"].includes(interval)) {
    return Response.json({ ok: false, error: "unsupported interval" }, { status: 400 });
  }
  try {
    const rows = await getKline(address, interval, limit);
    return Response.json(
      { ok: true, data: rows },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch (err) {
    console.error("[api/rwa/kline] upstream failure:", err);
    return Response.json({ ok: false, error: "kline failed" }, { status: 502 });
  }
}
