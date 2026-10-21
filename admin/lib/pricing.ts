// Price/volume helpers for the admin console. Token metadata comes from the
// Nexa site's universe+tickers feed; BSC stables are fixed at $1. Anything
// without a feed price (e.g. WBNB) is never guessed - rows stay unpriced.

type Stock = {
  symbol: string;
  ticker: string;
  contractAddress: string;
  cs: string;
  d?: number;
};
type SpotTicker = { price: string };

export type TokenInfo = {
  symbol: string;
  decimals: number;
  /** null = known token, no live price available (shown as "-", never counted). */
  priceUsd: number | null;
};

// Same tokens Nexa accepts as payment (lib/erc20.ts). Stables = $1, 18 decimals.
const KNOWN: Record<string, TokenInfo> = {
  "0x55d398326f99059ff775485246999027b3197955": { symbol: "USDT", decimals: 18, priceUsd: 1 },
  "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d": { symbol: "USDC", decimals: 18, priceUsd: 1 },
  "0xce24439f2d9c6a2289f741120fe202248b666666": { symbol: "U", decimals: 18, priceUsd: 1 },
  "0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d": { symbol: "USD1", decimals: 18, priceUsd: 1 },
  "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c": { symbol: "WBNB", decimals: 18, priceUsd: null },
};

const TTL_MS = 30_000;
let cache: { at: number; map: Map<string, TokenInfo> } | null = null;
const DIGITS = /^\d{1,40}$/;

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

/** Lowercased address -> token info. 30s in-memory cache (prices refresh anyway). */
export async function fetchTokenMap(): Promise<Map<string, TokenInfo>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;
  const map = new Map<string, TokenInfo>(Object.entries(KNOWN));
  try {
    const [uni, tickers] = await Promise.all([
      getJson<{ ok: boolean; data: Stock[] }>("/api/rwa/universe"),
      getJson<{ ok: boolean; data: Record<string, SpotTicker> }>("/api/rwa/tickers"),
    ]);
    if (uni.ok) {
      for (const s of uni.data ?? []) {
        if (!s.contractAddress) continue;
        const t = s.cs ? tickers.data?.[s.cs] : undefined;
        const price = t ? Number(t.price) : NaN;
        map.set(s.contractAddress.toLowerCase(), {
          symbol: s.symbol || s.ticker,
          decimals: Number(s.d ?? 18),
          priceUsd: Number.isFinite(price) && price > 0 ? price : null,
        });
      }
    }
  } catch {
    // Site unreachable - the stables-only map still prices the common rows.
  }
  cache = { at: Date.now(), map };
  return map;
}

/** Raw sell units -> display amount ("1000 USDT"), or null when units/decimals unknown. */
export function humanAmount(
  raw: string,
  info: TokenInfo | undefined,
): { amount: string; symbol: string } | null {
  if (!info || !DIGITS.test(raw)) return null;
  const v = Number(raw) / 10 ** info.decimals;
  if (!Number.isFinite(v) || v < 0) return null;
  return {
    amount: v.toLocaleString("en-US", { maximumFractionDigits: Math.min(info.decimals, 6) }),
    symbol: info.symbol,
  };
}

/**
 * USD value of a successful swap's sell side - the volume metric.
 * null = not counted (not a settled swap, or the sell token has no live price).
 */
export function swapUsd(
  row: { kind: string; ok: boolean; amount: string; sell: string },
  map: Map<string, TokenInfo>,
): number | null {
  if (row.kind !== "swap" || !row.ok || !DIGITS.test(row.amount) || !row.sell) return null;
  const info = map.get(row.sell.toLowerCase());
  if (!info || info.priceUsd === null) return null;
  const usd = (Number(row.amount) / 10 ** info.decimals) * info.priceUsd;
  return Number.isFinite(usd) && usd >= 0 ? usd : null;
}
