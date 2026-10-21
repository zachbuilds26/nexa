import { getDynamic } from "@/lib/rwa";

// Matches the server-side 15s cache TTL in lib/rwa.
const CACHE = "public, max-age=15, s-maxage=15, stale-while-revalidate=30";

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address");
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return Response.json(
      { ok: false, error: "address query param required" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const data = await getDynamic(address);
    return Response.json({ ok: true, data }, { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
