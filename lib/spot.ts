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
// Per-key dedupe: a single shared promise could return ANOTHER symbol set's
// data to this key's caller once the universe (and key) changed mid-flight.
const inflight = new Map<string, Promise<Record<string, SpotTicker>>>();

async function fetchChunk(symbols: string[]): Promise<SpotRow[]> {
  const url = `${SPOT}/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  const json: unknown = await res.json();
  if (!res.ok) {
    // Only a bad symbol is pair-specific. Splitting on 429/5xx would multiply
    // the failed requests instead of backing off.
    if (res.status === 400 && symbols.length === 1) return [];
    if (res.status === 400 && symbols.length > 1) {
      const mid = Math.ceil(symbols.length / 2);
      return [
        ...(await fetchChunk(symbols.slice(0, mid))),
        ...(await fetchChunk(symbols.slice(mid))),
      ];
    }
    throw new Error(`spot ${res.status}`);
  }
  if (!Array.isArray(json)) throw new Error("spot malformed response");
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

function startRefresh(
  key: string,
  symbols: string[],
): Promise<Record<string, SpotTicker>> {
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = refresh(key, symbols).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, p);
  // Stale-path callers never await this promise - keep rejection handled.
  void p.catch(() => {
    /* keep serving stale until a refresh succeeds */
  });
  return p;
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

  const pending = inflight.get(key);
  if (pending) return pending;

  if (hit) {
    void startRefresh(key, symbols);
    return hit.value;
  }

  return startRefresh(key, symbols);
}
