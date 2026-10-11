// Typed client wrappers for the Binance Web3 Trading API (via our /api/binance proxy).
// Flow: GET quote (quoteId, 30s TTL) → wallet checks allowance vs approveTarget → GET swap → sign tx.

export const BSC_CHAIN_ID = 56;

export type BnQuoteRow = {
  quoteId: string;
  vendorName: string;
  executionMode: "SWAP" | "RFQ" | string;
  fromTokenAmount: string;
  toTokenAmount: string;
  tradeFee: string | null;
  estimateGasFee: string;
  priceImpactPercent: string;
  approveTarget?: string;
  router?: string;
};

export type BnSwapTx = {
  from: string;
  to: string;
  data: string;
  value: string;
  gas: string;
  minReceiveAmount: string;
  slippagePercent: string;
};

export type BnSwapData = {
  executionMode: string;
  tx: BnSwapTx | null;
  rfq: unknown;
};

async function bnGet<T>(ep: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ ep, ...params });
  const res = await fetch(`/api/binance?${qs.toString()}`);
  const json = (await res.json().catch(() => null)) as {
    code?: number | string;
    msg?: string;
    error?: string;
    data?: T;
  } | null;
  if (!json) throw new Error(`Binance API unreachable (${res.status})`);
  if (String(json.code) !== "0") {
    throw new Error(json.error ?? json.msg ?? `Binance API error ${json.code}`);
  }
  return json.data as T;
}

export async function fetchBnQuote(o: {
  from: `0x${string}`;
  to: `0x${string}`;
  amount: string;
  wallet: `0x${string}`;
}): Promise<BnQuoteRow> {
  const rows = await bnGet<BnQuoteRow[]>("quote", {
    binanceChainId: String(BSC_CHAIN_ID),
    fromTokenAddress: o.from,
    toTokenAddress: o.to,
    amount: o.amount,
    userWalletAddress: o.wallet,
  });
  const row = rows?.[0];
  if (!row) throw new Error("No route for this pair");
  return row;
}

export async function fetchBnSwap(o: {
  quoteId: string;
  from: `0x${string}`;
  to: `0x${string}`;
  amount: string;
  wallet: `0x${string}`;
  slippagePercent: string;
}): Promise<BnSwapData> {
  const data = await bnGet<BnSwapData>("swap", {
    binanceChainId: String(BSC_CHAIN_ID),
    quoteId: o.quoteId,
    fromTokenAddress: o.from,
    toTokenAddress: o.to,
    amount: o.amount,
    userWalletAddress: o.wallet,
    slippagePercent: o.slippagePercent,
  });
  if (!data?.tx?.to || !data.tx.data) throw new Error("Binance returned no transaction data");
  return data;
}
