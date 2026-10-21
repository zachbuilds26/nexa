const BINANCE = "https://www.binance.com";
const BAPI_HEADERS = {
  "Accept-Encoding": "identity",
  "User-Agent": "nexa/0.1",
};

type KlineRow = [number, number, number, number, number, number, number];

const cache = new Map<string, { value: unknown; expires: number }>();

export async function getKline(
  address: string,
  interval: string,
  limit: number,
): Promise<KlineRow[]> {
  const path = `/bapi/defi/v1/public/wallet-direct/buw/wallet/dex/market/token/kline/ai?chainId=56&contractAddress=${address}&interval=${interval}&limit=${limit}`;
  const hit = cache.get(path);
  if (hit && hit.expires > Date.now()) return hit.value as KlineRow[];

  const res = await fetch(`${BINANCE}${path}`, {
    headers: BAPI_HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`bapi ${res.status} for kline`);
  const json = (await res.json()) as {
    code: string;
    success: boolean;
    data?: { klineInfos?: Array<Array<number | string>> };
  };
  if (json.code !== "000000" || !json.success) throw new Error(`bapi error ${json.code} for kline`);

  const rows = (json.data?.klineInfos ?? []).map(
    (r): KlineRow => [
      Number(r[0]),
      Number(r[1]),
      Number(r[2]),
      Number(r[3]),
      Number(r[4]),
      Number(r[5]),
      Number(r[6]),
    ],
  );
  cache.set(path, { value: rows, expires: Date.now() + 60_000 });
  return rows;
}
