import crypto from "node:crypto";

// Binance Web3 API request signing (server-only).
// prehash = timestamp + METHOD + "/build" + path?query + rawBody
// headers: X-OC-APIKEY, X-OC-TIMESTAMP, X-OC-SIGN = Base64(HMAC-SHA256(prehash, secret))

const BASE = "https://web3.binance.com/build";

export type OcResult<T = unknown> = {
  code?: number | string;
  msg?: string;
  message?: string;
  data?: T;
  success?: boolean;
};

export function binanceCreds(): { key: string; secret: string } | null {
  const key = process.env.BINANCE_WEB3_API_KEY?.trim();
  const secret = process.env.BINANCE_WEB3_SECRET_KEY?.trim();
  return key && secret ? { key, secret } : null;
}

export async function ocFetch<T = unknown>(
  method: "GET" | "POST",
  apiPath: string,
  body?: unknown,
): Promise<OcResult<T>> {
  const creds = binanceCreds();
  if (!creds) throw new Error("Binance Web3 credentials missing (BINANCE_WEB3_API_KEY / BINANCE_WEB3_SECRET_KEY)");

  const ts = new Date().toISOString();
  const bodyStr = body === undefined ? "" : JSON.stringify(body);
  const prehash = ts + method + "/build" + apiPath + bodyStr;
  const sign = crypto.createHmac("sha256", creds.secret).update(prehash).digest("base64");

  const res = await fetch(BASE + apiPath, {
    method,
    headers: {
      "X-OC-APIKEY": creds.key,
      "X-OC-TIMESTAMP": ts,
      "X-OC-SIGN": sign,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : bodyStr,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`Binance Web3 API HTTP ${res.status}`);
  return (await res.json()) as OcResult<T>;
}
