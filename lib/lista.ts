const API_BASE = "https://api.lista.org";

export const MOOLAH_ADDRESS =
  "0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C" as const;

export type ListaMarket = {
  id: `0x${string}`;
  collateralSymbol: string;
  collateralAddress: `0x${string}`;
  collateralIcon?: string;
  loanSymbol: string;
  loanAddress: `0x${string}`;
  loanIcon?: string;
  oracle: `0x${string}`;
  /** liquidation LTV as a fraction, e.g. 0.75 */
  lltv: number;
  /** gross borrow rate as a fraction, e.g. 0.029 */
  borrowRate: number;
  /** supplier-side APY as a fraction (direct supply; vault routes may differ) */
  supplyApy: number;
  /** available liquidity in human loan-token units */
  liquidity: number;
  liquidityUsd: number;
  /** total borrowed in human loan-token units */
  totalBorrowAsset: number;
  utilization: number;
  vaultNames: string[];
};

type ApiEnvelope<T> = {
  code: string;
  msg?: string;
  data?: T;
};

type BorrowMarketRow = {
  id: string;
  lltv: string;
  liquidity: string;
  liquidityUsd: string;
  totalBorrowAsset: string;
  utilization: string;
  loan: string;
  loanIcon?: string;
  collateral: string;
  rate: string;
  supplyApy: string;
  icon?: string;
  zone: number;
  chain: string;
  vaults?: { name?: string }[];
};

type AllMarketRow = {
  id: string;
  loanToken: string;
  collateralToken: string;
  oracle: string;
  lltv: string;
};

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Lista API ${res.status} on ${path}`);
  const body = (await res.json()) as ApiEnvelope<T>;
  if (body.code !== "000000000" || body.data === undefined) {
    throw new Error(`Lista API error ${body.code}: ${body.msg ?? ""}`);
  }
  return body.data;
}

/**
 * All bStock borrow markets (zone 5), joined with raw on-chain market
 * parameters from /allMarkets so each row carries real token/oracle addresses.
 * BSC tokens are 18 decimals per Lista docs - decimals() reads are skipped.
 */
export async function fetchListaStockMarkets(): Promise<ListaMarket[]> {
  const [first, allMarkets] = await Promise.all([
    apiGet<{ total: number; list: BorrowMarketRow[] }>(
      "/api/moolah/borrow/markets?chain=bsc&zone=5&page=1&pageSize=50",
    ),
    apiGet<AllMarketRow[]>("/api/moolah/allMarkets"),
  ]);

  const pagePromises: Promise<{ total: number; list: BorrowMarketRow[] }>[] = [];
  const pages = Math.ceil(first.total / 50);
  for (let p = 2; p <= pages; p++) {
    pagePromises.push(
      apiGet<{ total: number; list: BorrowMarketRow[] }>(
        `/api/moolah/borrow/markets?chain=bsc&zone=5&page=${p}&pageSize=50`,
      ),
    );
  }
  const rest = pagePromises.length ? await Promise.all(pagePromises) : [];
  const rows = [...first.list, ...rest.flatMap((r) => r.list)];

  const paramsById = new Map<string, AllMarketRow>();
  for (const m of allMarkets) paramsById.set(m.id.toLowerCase(), m);

  const out: ListaMarket[] = [];
  for (const r of rows) {
    const params = paramsById.get(r.id.toLowerCase());
    if (!params) continue;
    out.push({
      id: r.id as `0x${string}`,
      collateralSymbol: r.collateral,
      collateralAddress: params.collateralToken as `0x${string}`,
      collateralIcon: r.icon,
      loanSymbol: r.loan,
      loanAddress: params.loanToken as `0x${string}`,
      loanIcon: r.loanIcon,
      oracle: params.oracle as `0x${string}`,
      lltv: Number(r.lltv),
      borrowRate: Number(r.rate),
      supplyApy: Number(r.supplyApy),
      liquidity: Number(r.liquidity),
      liquidityUsd: Number(r.liquidityUsd),
      totalBorrowAsset: Number(r.totalBorrowAsset),
      utilization: Number(r.utilization),
      vaultNames: (r.vaults ?? [])
        .map((v) => v.name ?? "")
        .filter(Boolean),
    });
  }
  out.sort((a, b) => b.liquidityUsd - a.liquidityUsd);
  return out;
}

/** Moolah market accounting + immutable params (Morpho Blue-compatible). */
export const MOOLAH_VIEW_ABI = [
  {
    type: "function",
    name: "market",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [
      { name: "totalSupplyAssets", type: "uint128" },
      { name: "totalSupplyShares", type: "uint128" },
      { name: "totalBorrowAssets", type: "uint128" },
      { name: "totalBorrowShares", type: "uint128" },
      { name: "lastUpdate", type: "uint256" },
      { name: "fee", type: "uint16" },
    ],
  },
  {
    type: "function",
    name: "position",
    stateMutability: "view",
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "user", type: "address" },
    ],
    outputs: [
      { name: "supplyShares", type: "uint128" },
      { name: "borrowShares", type: "uint128" },
      { name: "collateral", type: "uint128" },
    ],
  },
] as const;

export const MOOLAH_ACTION_ABI = [
  {
    type: "function",
    name: "supplyCollateral",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "assets", type: "uint256" },
      { name: "onBehalfOf", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "borrow",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "assets", type: "uint256" },
      { name: "onBehalfOf", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "repay",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "assets", type: "uint256" },
      { name: "onBehalfOf", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "withdrawCollateral",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "assets", type: "uint256" },
      { name: "to", type: "address" },
      { name: "onBehalfOf", type: "address" },
    ],
    outputs: [],
  },
] as const;

/** Morpho-style oracle: price of 1 collateral in loan units, scaled 1e36. */
export const MORPHO_ORACLE_ABI = [
  {
    type: "function",
    name: "price",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export type ListaMarketAccounting = {
  totalSupplyAssets: bigint;
  totalBorrowAssets: bigint;
  totalBorrowShares: bigint;
};

export type ListaUserPosition = {
  collateral: bigint;
  borrowShares: bigint;
  debtAssets: bigint;
  /** oracle.price(): loan units per 1 collateral, scaled 1e36. 0 = unread. */
  priceRaw: bigint;
  /** HF in loan-unit terms: (collateral × price / 1e36) × lltv / debt. null = no debt. */
  healthFactor: number | null;
};

/** borrowAssets implied by borrowShares, floor-rounded like the protocol. */
export function borrowSharesToAssets(
  shares: bigint,
  accounting: ListaMarketAccounting,
): bigint {
  if (shares === 0n || accounting.totalBorrowShares === 0n) return 0n;
  return (shares * accounting.totalBorrowAssets) / accounting.totalBorrowShares;
}

/**
 * Health factor for an isolated Morpho-style market, entirely in loan units:
 * collateral valued via oracle.price() (loan per collateral, 1e36), times
 * LLTV, divided by outstanding debt. >= 1 healthy.
 */
export function listaHealthFactor(
  collateral: bigint,
  priceRaw: bigint,
  lltv: number,
  debtAssets: bigint,
): number | null {
  if (debtAssets <= 0n) return null;
  const collateralInLoan = (collateral * priceRaw) / 10n ** 36n;
  const weighted = Number(collateralInLoan) * lltv;
  const hf = weighted / Number(debtAssets);
  return Number.isFinite(hf) ? hf : null;
}

/**
 * Max additional borrow in loan units, capped by available market liquidity.
 * Uses a 90% safety margin on the LLTV ceiling so a single tick of price
 * movement does not instantly breach the liquidation threshold.
 */
export function maxAdditionalBorrow(
  collateral: bigint,
  priceRaw: bigint,
  lltv: number,
  debtAssets: bigint,
  liquidityLoanUnits: number,
  loanDecimals: number,
): bigint {
  const collateralInLoan = (collateral * priceRaw) / 10n ** 36n;
  const ceiling = (Number(collateralInLoan) * lltv * 0.9) / 1;
  const room = ceiling - Number(debtAssets);
  const liquidityCap = liquidityLoanUnits * 10 ** loanDecimals;
  if (room <= 0) return 0n;
  const roomBig = BigInt(Math.floor(room));
  return roomBig < liquidityCap ? roomBig : BigInt(Math.floor(liquidityCap));
}

export function findListaMarket(
  markets: ListaMarket[],
  id: string,
): ListaMarket | undefined {
  const k = id.toLowerCase();
  return markets.find((m) => m.id.toLowerCase() === k);
}
