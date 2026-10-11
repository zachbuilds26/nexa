import { NextResponse } from "next/server";

// Sandboxed proxy to the two keyless Native Core endpoints.
// Why: api-ui.native.org tolerates browser calls, but api.native.org/info
// sends no CORS headers, so accountStatus / markPrices / vault discovery are
// blocked in the browser. The server-side fetch has no CORS restriction.
// Usage: POST /api/native with the exact body you would send upstream;
// the route picks the upstream by `type`.

const POOL_TYPES = new Set(["config", "account", "deposits", "yieldHistory"]);
const POOL_URL = "https://api-ui.native.org/api/v3/earn";
const CORE_URL = "https://api.native.org/info";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 1, message: "invalid json" }, { status: 400 });
  }
  const type =
    typeof body === "object" && body !== null && "type" in body
      ? String((body as { type?: unknown }).type)
      : "";
  if (!type) {
    return NextResponse.json({ code: 1, message: "missing type" }, { status: 400 });
  }
  const url = POOL_TYPES.has(type) ? POOL_URL : CORE_URL;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { code: 1, message: "native upstream unreachable" },
      { status: 502 },
    );
  }
}
