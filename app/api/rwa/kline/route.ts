import { getKline } from "@/lib/kline";

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const address = sp.get("address");
  const interval = sp.get("interval") ?? "1h";
  const limit = Math.min(Number(sp.get("limit") ?? "48") || 48, 300);

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return Response.json({ ok: false, error: "address query param required" }, { status: 400 });
  }
  if (!/^[1-9][0-9]*[mhdwM]$|^[0-9]+[mhdw]$/.test(interval) && !["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"].includes(interval)) {
    return Response.json({ ok: false, error: "unsupported interval" }, { status: 400 });
  }
  try {
    const rows = await getKline(address, interval, limit);
    return Response.json({ ok: true, data: rows });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "kline failed" },
      { status: 502 },
    );
  }
}
