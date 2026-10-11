import { getMarketStatus } from "@/lib/rwa";

export async function GET() {
  try {
    const data = await getMarketStatus();
    return Response.json({ ok: true, data });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 502 },
    );
  }
}
