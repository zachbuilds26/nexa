import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Stock = {
  symbol: string;
  ticker: string;
  contractAddress: string;
  cs: string;
};

type SpotTicker = { price: string; chgPct: string; quoteVolume: string };

function base(): string {
  return process.env.NEXA_API_URL ?? "http://localhost:3000";
}

async function getJson<T>(path: string, timeoutMs = 6_000): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return (await res.json()) as T;
}

/**
 * Read-only market table: universe + spot tickers from the Nexa site.
 * Server-side so the admin browser never talks to Binance directly.
 */
export async function GET() {
  try {
    const [uni, tickers, status] = await Promise.all([
      getJson<{ ok: boolean; data: Stock[] }>("/api/rwa/universe"),
      getJson<{ ok: boolean; data: Record<string, SpotTicker> }>("/api/rwa/tickers"),
      getJson<{ ok: boolean; data: { openState: boolean; marketStatus: string | null } }>("/api/rwa/status").catch(() => null),
    ]);
    if (!uni.ok) throw new Error("universe failed");
    const rows = (uni.data ?? []).map((s) => {
      const t = s.cs ? tickers.data?.[s.cs] : undefined;
      return {
        symbol: s.symbol,
        ticker: s.ticker,
        contract: s.contractAddress,
        price: t?.price ?? null,
        chgPct: t?.chgPct ?? null,
        quoteVolume: t?.quoteVolume ?? null,
      };
    });
    return NextResponse.json(
      { ok: true, status: status?.ok ? status.data : null, rows },
      { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } },
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "markets fetch failed" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
