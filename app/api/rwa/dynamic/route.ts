import { getDynamic } from "@/lib/rwa";

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address");
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return Response.json(
      { ok: false, error: "address query param required" },
      { status: 400 },
    );
  }
  try {
    const data = await getDynamic(address);
    return Response.json({ ok: true, data });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 502 },
    );
  }
}
