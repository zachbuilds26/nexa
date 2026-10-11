import { NextResponse } from "next/server";
import { binanceCreds, ocFetch } from "@/lib/binanceWeb3";

// Sandboxed proxy to the Binance Web3 Trading API aggregator endpoints.
// Usage: GET /api/binance?ep=quote&chainId=56&sellToken=0x...&...
// Only the aggregator surface is reachable; the API key never leaves the server.

const ALLOWED = new Set(["supported/chain", "quote", "swap", "quote-and-swap", "approve-transaction", "history"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ep = url.searchParams.get("ep") ?? "";
  if (!ALLOWED.has(ep)) {
    return NextResponse.json({ error: `unknown endpoint, allowed: ${[...ALLOWED].join(", ")}` }, { status: 400 });
  }
  if (!binanceCreds()) {
    return NextResponse.json({ error: "missing BINANCE_WEB3_API_KEY / BINANCE_WEB3_SECRET_KEY in .env.local" }, { status: 503 });
  }

  const qs = new URLSearchParams();
  url.searchParams.forEach((v, k) => {
    if (k !== "ep") qs.set(k, v);
  });
  const query = qs.toString();
  const apiPath = `/api/v1/dex/aggregator/${ep}${query ? `?${query}` : ""}`;

  try {
    const result = await ocFetch("GET", apiPath);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "upstream failure" }, { status: 502 });
  }
}
