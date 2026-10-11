import { getUniverse } from "@/lib/rwa";

export async function GET() {
  try {
    const data = await getUniverse();
    return Response.json({ ok: true, count: data.length, data });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 502 },
    );
  }
}
