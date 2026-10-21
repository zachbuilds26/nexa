import { NextResponse } from "next/server";
import { clientIp, rateLimit, tooMany } from "@/lib/rateLimit";

// Sandboxed proxy to the two keyless Native Core endpoints.
// Why: api-ui.native.org tolerates browser calls, but api.native.org/info
// sends no CORS headers, so accountStatus / markPrices / vault discovery are
// blocked in the browser. The server-side fetch has no CORS restriction.
// Usage: POST /api/native with the exact body you would send upstream;
// the route picks the upstream by `type`.

const POOL_TYPES = new Set(["config", "account", "deposits", "yieldHistory"]);
const CORE_TYPES = new Set(["accountStatus", "markPrices", "accountingDepositContracts"]);
const POOL_URL = "https://api-ui.native.org/api/v3/earn";
const CORE_URL = "https://api.native.org/info";

// The upstreams only ever see small JSON envelopes - reject anything bigger
// before it reaches memory.
const MAX_BODY_BYTES = 16 * 1024;
const UPSTREAM_TIMEOUT_MS = 15_000;
// Pages fan out to several native types on load (account status, marks,
// deposits), so rapid navigation can exceed a tight per-minute cap.
const RATE_LIMIT = { limit: 120, windowMs: 60_000 };

export async function POST(request: Request) {
  if (!rateLimit(`native:${clientIp(request)}`, RATE_LIMIT.limit, RATE_LIMIT.windowMs)) {
    return tooMany();
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return NextResponse.json({ code: 1, message: "body too large" }, { status: 413 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 1, message: "invalid json" }, { status: 400 });
  }
  if (JSON.stringify(body).length > MAX_BODY_BYTES) {
    return NextResponse.json({ code: 1, message: "body too large" }, { status: 413 });
  }
  const type =
    typeof body === "object" && body !== null && "type" in body
      ? String((body as { type?: unknown }).type)
      : "";
  // Strict allowlist on BOTH upstreams - unknown types are rejected instead of
  // being relayed to the core /info endpoint.
  if (POOL_TYPES.has(type)) {
    return relay(POOL_URL, body);
  }
  if (CORE_TYPES.has(type)) {
    return relay(CORE_URL, body);
  }
  return NextResponse.json({ code: 1, message: "unsupported type" }, { status: 400 });
}

async function relay(url: string, body: unknown): Promise<Response> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error("[api/native] upstream failure:", e);
    return NextResponse.json(
      { code: 1, message: "native upstream unreachable" },
      { status: 502 },
    );
  }
}
