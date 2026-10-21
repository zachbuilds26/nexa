const BINANCE = "https://www.binance.com";
const BAPI_HEADERS = {
  "Accept-Encoding": "identity",
  "User-Agent": "nexa/0.1",
};

export type Stock = {
  symbol: string;
  ticker: string;
  contractAddress: string;
  multiplier: string;
  decimals: number;
  /** Binance spot pair for this bStock (e.g. NVDABUSDT) - drives batch list pricing. */
  cs: string;
};

export type Dynamic = {
  symbol: string;
  ticker: string;
  onchainPrice: string | null;
  referencePrice: string | null;
  priceChangePct24h: string | null;
  sharesMultiplier: string | null;
  volume24h: string | null;
  openState: boolean | null;
  reasonCode: string | null;
  fundamentals: Fundamentals | null;
};

/** Reference fundamentals for the underlying listed company + on-chain counts. */
export type Fundamentals = {
  marketCap: string | null;
  priceHigh52w: string | null;
  priceLow52w: string | null;
  priceToEarnings: string | null;
  priceToBook: string | null;
  eps: string | null;
  dividendYield: string | null;
  returnOnEquity: string | null;
  debtToEquity: string | null;
  avgVolume30d: string | null;
  holders: string | null;
  traders: string | null;
};

export type TokenMeta = {
  name: string | null;
};

export type MarketStatus = {
  openState: boolean;
  marketStatus: string | null;
  nextOpen: string | null;
  nextClose: string | null;
};

type Envelope<T> = { code: string; data: T; success: boolean };

const cache = new Map<string, { value: unknown; expires: number }>();
const inflight = new Map<string, Promise<unknown>>();

/**
 * Stale-while-revalidate fetch: fresh hits return instantly; expired hits
 * serve the stale value immediately and refresh in the background (deduped),
 * so a slow/rate-limited bapi can never stall the first byte of a render.
 * Only the very first fetch for a path blocks.
 */
async function cachedFetch<T>(path: string, ttlMs: number): Promise<T> {
  const hit = cache.get(path);
  if (hit && hit.expires > Date.now()) return hit.value as T;

  const run = (): Promise<T> => {
    let pending = inflight.get(path) as Promise<T> | undefined;
    if (!pending) {
      pending = (async () => {
        const res = await fetch(`${BINANCE}${path}`, {
          headers: BAPI_HEADERS,
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error(`bapi ${res.status} for ${path}`);
        const json = (await res.json()) as Envelope<T>;
        if (json.code !== "000000" || !json.success) {
          throw new Error(`bapi error ${json.code} for ${path}`);
        }
        cache.set(path, { value: json.data, expires: Date.now() + ttlMs });
        return json.data;
      })();
      inflight.set(path, pending);
      void pending.catch(() => {}).finally(() => inflight.delete(path));
    }
    return pending;
  };

  if (hit) {
    // Stale value available - hand it back now, refresh without blocking.
    void run().catch(() => {
      /* keep serving stale until a refresh succeeds */
    });
    return hit.value as T;
  }
  return run();
}

export async function getUniverse(): Promise<Stock[]> {
  const data = await cachedFetch<{
    list?: Array<Record<string, unknown>>;
  } | Array<Record<string, unknown>>>(
    "/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/rwa/stock/detail/list/ai?type=3",
    60 * 60 * 1000,
  );

  const list = Array.isArray(data) ? data : (data.list ?? []);
  return list.map((item) => ({
    symbol: String(item.symbol ?? ""),
    ticker: String(item.ticker ?? ""),
    contractAddress: String(item.contractAddress ?? ""),
    multiplier: String(item.multiplier ?? "1"),
    decimals: Number(item.d ?? 18),
    cs: String(item.cs ?? ""),
  }));
}

export async function getDynamic(address: string): Promise<Dynamic> {
  const data = await cachedFetch<{
    symbol?: string;
    ticker?: string;
    tokenInfo?: {
      price?: string | null;
      priceChangePct24h?: string | null;
      sharesMultiplier?: string | null;
      volume24h?: string | null;
      bnHolder?: string | null;
      bnTrader?: string | null;
    };
    stockInfo?: {
      price?: string | null;
      marketCap?: string | null;
      priceHigh52w?: string | null;
      priceLow52w?: string | null;
      priceToEarnings?: string | null;
      priceToBook?: string | null;
      eps?: string | null;
      dividendYield?: string | null;
      returnOnEquity?: string | null;
      debtToEquity?: string | null;
      avgVolume30d?: string | null;
    };
    statusInfo?: { openState?: boolean | null; reasonCode?: string | null };
  }>(
    `/bapi/defi/v2/public/wallet-direct/buw/wallet/market/token/rwa/dynamic/ai?chainId=56&contractAddress=${address}`,
    15_000,
  );

  const s = data.stockInfo ?? {};
  return {
    symbol: data.symbol ?? "",
    ticker: data.ticker ?? "",
    onchainPrice: data.tokenInfo?.price ?? null,
    referencePrice: data.stockInfo?.price ?? null,
    priceChangePct24h: data.tokenInfo?.priceChangePct24h ?? null,
    sharesMultiplier: data.tokenInfo?.sharesMultiplier ?? null,
    volume24h: data.tokenInfo?.volume24h ?? null,
    openState: data.statusInfo?.openState ?? null,
    reasonCode: data.statusInfo?.reasonCode ?? null,
    fundamentals: {
      marketCap: s.marketCap ?? null,
      priceHigh52w: s.priceHigh52w ?? null,
      priceLow52w: s.priceLow52w ?? null,
      priceToEarnings: s.priceToEarnings ?? null,
      priceToBook: s.priceToBook ?? null,
      eps: s.eps ?? null,
      dividendYield: s.dividendYield ?? null,
      returnOnEquity: s.returnOnEquity ?? null,
      debtToEquity: s.debtToEquity ?? null,
      avgVolume30d: s.avgVolume30d ?? null,
      holders: data.tokenInfo?.bnHolder ?? null,
      traders: data.tokenInfo?.bnTrader ?? null,
    },
  };
}

export async function getMarketStatus(): Promise<MarketStatus> {
  const data = await cachedFetch<{
    openState?: boolean;
    marketStatus?: string | null;
    nextOpen?: string | null;
    nextClose?: string | null;
    nextOpenTime?: number | null;
    nextCloseTime?: number | null;
  }>("/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/rwa/market/status/ai", 30_000);

  return {
    openState: Boolean(data.openState),
    marketStatus: data.marketStatus ?? null,
    nextOpen: data.nextOpen ?? (data.nextOpenTime ? String(data.nextOpenTime) : null),
    nextClose: data.nextClose ?? (data.nextCloseTime ? String(data.nextCloseTime) : null),
  };
}

export async function getMeta(address: string): Promise<TokenMeta> {
  const data = await cachedFetch<{
    name?: string;
    description?: string;
  }>(
    `/bapi/defi/v1/public/wallet-direct/buw/wallet/dex/market/token/meta/info?chainId=56&contractAddress=${address}`,
    60 * 60 * 1000,
  );

  return { name: data.name || data.description || null };
}
