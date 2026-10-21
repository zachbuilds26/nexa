import { NextResponse } from "next/server";
import { after } from "next/server";
import { binanceCreds, ocFetch } from "@/lib/binanceWeb3";
import { clientIp, rateLimit, tooMany } from "@/lib/rateLimit";
import { logActivity, type ActivityKind } from "@/lib/activityLog";

// Sandboxed proxy to the Binance Web3 Trading API aggregator endpoints.
// Usage: GET /api/binance?ep=quote&binanceChainId=56&fromTokenAddress=0x...&toTokenAddress=0x...&amount=...
// Only the aggregator surface is reachable; the API key never leaves the server.

const ALLOWED = new Set(["supported/chain", "quote", "swap", "quote-and-swap", "approve-transaction", "history"]);

// Which endpoints count as user activity in the admin's log.
const KIND: Partial<Record<string, ActivityKind>> = {
  quote: "quote",
  swap: "swap",
  "quote-and-swap": "swap",
  "approve-transaction": "approve",
};

// Consumes the project's signed API quota - keep one client from draining it.
const RATE_LIMIT = { limit: 60, windowMs: 60_000 };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ep = url.searchParams.get("ep") ?? "";
  if (!ALLOWED.has(ep)) {
    return NextResponse.json({ error: `unknown endpoint, allowed: ${[...ALLOWED].join(", ")}` }, { status: 400 });
  }
  if (!rateLimit(`binance:${clientIp(request)}`, RATE_LIMIT.limit, RATE_LIMIT.windowMs)) {
    return tooMany();
  }
  if (!binanceCreds()) {
    return NextResponse.json({ error: "missing BINANCE_WEB3_API_KEY / BINANCE_WEB3_SECRET_KEY in .env.local" }, { status: 503 });
  }

  const qs = new URLSearchParams();
  url.searchParams.forEach((v, k) => {
    if (k !== "ep") qs.set(k, v);
  });
  // Reject malformed known params early so garbage never consumes signed
  // quota (URLSearchParams already percent-encodes, so this is validation,
  // not injection defense). Address-like keys: 0x + 40 hex. Amount keys:
  // raw base-unit integers only.
  for (const [k, v] of url.searchParams) {
    if (k.endsWith("Address") && !/^0x[0-9a-fA-F]{40}$/.test(v)) {
      return NextResponse.json({ error: `invalid ${k} (expected 0x + 40 hex chars)` }, { status: 400 });
    }
    if (k === "amount" && !/^\d{1,78}$/.test(v)) {
      return NextResponse.json({ error: "invalid amount (expected base-unit integer)" }, { status: 400 });
    }
  }
  const query = qs.toString();
  const apiPath = `/api/v1/dex/aggregator/${ep}${query ? `?${query}` : ""}`;

  try {
    const result = await ocFetch("GET", apiPath);
    const kind = KIND[ep];
    if (kind) {
      const upstreamOk =
        (result.code === undefined || Number(result.code) === 0) &&
        result.success !== false;
      // Deferred so the append never delays the response.
      after(() => logActivity({ kind, params: url.searchParams, ok: upstreamOk }));
    }
    return NextResponse.json(result);
  } catch (e) {
    // Log server-side; return a generic message so internals never reach clients.
    console.error("[api/binance] upstream failure:", e);
    const kind = KIND[ep];
    if (kind) {
      after(() => logActivity({ kind, params: url.searchParams, ok: false }));
    }
    return NextResponse.json({ error: "upstream failure" }, { status: 502 });
  }
}
