const SPOT = "https://api.binance.com";

export type SpotTicker = {
  /** Last trade price on the Binance spot pair (NVDABUSDT...). */
  price: string;
  /** 24h change in percent, as reported by spot ticker/24hr. */
  chgPct: string;
  /** 24h quote volume in USDT. */
  quoteVolume: string;
};

type SpotRow = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
};

const TTL = 15_000;
const cache = new Map<string, { value: Record<string, SpotTicker>; expires: number }>();
let inflight: Promise<Record<string, SpotTicker>> | null = null;

async function fetchChunk(symbols: string[]): Promise<SpotRow[]> {
  const url = `${SPOT}/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`;
  const res = await fetch(url, { cache: "no-store" });
  const json: unknown = await res.json();
  if (!res.ok || !Array.isArray(json)) {
    if (symbols.length === 1) return []; // single unknown pair - drop it, keep the rest
    if (symbols.length > 1) {
      const mid = Math.ceil(symbols.length / 2);
      return [
        ...(await fetchChunk(symbols.slice(0, mid))),
        ...(await fetchChunk(symbols.slice(mid))),
      ];
    }
    throw new Error(`spot ${res.status}`);
  }
  return json as SpotRow[];
}

async function refresh(
  key: string,
  symbols: string[],
): Promise<Record<string, SpotTicker>> {
  const out: Record<string, SpotTicker> = {};
  for (let i = 0; i < symbols.length; i += 100) {
    const rows = await fetchChunk(symbols.slice(i, i + 100));
    for (const r of rows) {
      out[r.symbol] = {
        price: r.lastPrice,
        chgPct: r.priceChangePercent,
        quoteVolume: r.quoteVolume,
      };
    }
  }
  cache.set(key, { value: out, expires: Date.now() + TTL });
  return out;
}

/**
 * Batched 24h tickers for every bStock spot pair - ONE upstream request for
 * the whole list. Stale-while-revalidate: expired hits serve immediately and
 * refresh in the background, so a slow spot API never blocks a render.
 */
export async function getSpotTickers(
  symbols: string[],
): Promise<Record<string, SpotTicker>> {
  const key = symbols.join(",");
  if (!key) return {};
  const hit = cache.get(key);
  const now = Date.now();

  if (hit && hit.expires > now) return hit.value;
  if (inflight) return inflight;

  if (hit) {
    void refresh(key, symbols).catch(() => {
      /* keep serving stale until a refresh succeeds */
    });
    return hit.value;
  }

  inflight = refresh(key, symbols).finally(() => {
    inflight = null;
  });
  return inflight;
}
