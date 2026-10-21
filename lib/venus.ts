import { createPublicClient, http } from "viem";
import { unitsToNumber } from "./format";
import { bsc } from "viem/chains";
import { USDT_BSC } from "./erc20";

export const COMPTROLLER_ADDRESS =
  "0xfD36E2c2a6789Db23113685031d7F16329158384" as const;

const RPC = process.env.NEXT_PUBLIC_BSC_RPC ?? "https://bsc.publicnode.com";

export const venusClient = createPublicClient({
  chain: bsc,
  transport: http(RPC),
});

export const COMPTROLLER_ABI = [
  {
    type: "function",
    name: "getAllMarkets",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "markets",
    stateMutability: "view",
    inputs: [{ name: "vToken", type: "address" }],
    outputs: [
      { name: "isListed", type: "bool" },
      { name: "collateralFactorMantissa", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "oracle",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "mintAllowed",
    stateMutability: "view",
    inputs: [
      { name: "vToken", type: "address" },
      { name: "borrower", type: "address" },
      { name: "mintAmount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "borrowAllowed",
    stateMutability: "view",
    inputs: [
      { name: "vToken", type: "address" },
      { name: "borrower", type: "address" },
      { name: "borrowAmount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "redeemAllowed",
    stateMutability: "view",
    inputs: [
      { name: "vToken", type: "address" },
      { name: "redeemer", type: "address" },
      { name: "redeemTokens", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getAccountLiquidity",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [
      { name: "error", type: "uint256" },
      { name: "liquidity", type: "uint256" },
      { name: "shortfall", type: "uint256" },
    ],
  },
] as const;

export const VTOKEN_ABI = [
  {
    type: "function",
    name: "underlying",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "borrowBalanceStored",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "exchangeRateStored",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [{ name: "mintAmount", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "borrow",
    stateMutability: "nonpayable",
    inputs: [{ name: "borrowAmount", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "repayBorrow",
    stateMutability: "nonpayable",
    inputs: [{ name: "repayAmount", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "redeemUnderlying",
    stateMutability: "nonpayable",
    inputs: [{ name: "redeemAmount", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getCash",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalBorrows",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalReserves",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "borrowRatePerBlock",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "supplyRatePerBlock",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const ORACLE_ABI = [
  {
    type: "function",
    name: "getUnderlyingPrice",
    stateMutability: "view",
    inputs: [{ name: "vToken", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export type VenusMarket = {
  vToken: `0x${string}`;
  symbol: string;
  underlying: `0x${string}` | null;
  underlyingSymbol: string;
  underlyingDecimals: number;
  isListed: boolean;
  /** collateral factor as a fraction, e.g. 0.6 */
  collateralFactor: number;
  /** comptroller.mintAllowed(...) === NO_ERROR */
  mintable: boolean;
  /** USD price of 1 underlying token (from Venus oracle) */
  priceUsd: number | null;
  /** underlying per vToken, scaled by 1e18: underlying = vTokens × rate / 1e18 */
  exchangeRate: bigint;
  /** total vToken supply minted (8 decimals) */
  totalSupply: bigint;
  /** underlying sitting in the market (getCash) */
  cash: bigint;
  /** total underlying borrowed */
  totalBorrows: bigint;
  /** protocol reserve share of the underlying */
  totalReserves: bigint;
  /** per-block interest rate charged to borrowers, scaled by 1e18 (0 = no borrows) */
  borrowRatePerBlock: bigint;
  /** per-block interest paid to suppliers, scaled by 1e18 (protocol-reported) */
  supplyRatePerBlock: bigint;
  /**
   * BSC blocks per year at fetch time - measured from two recent blocks, not a
   * hardcoded constant (Venus comptroller is a diamond and exposes no
   * blocksPerYear). 0 = measurement failed; treat APR as unavailable.
   */
  blocksPerYear: number;
};

/**
 * Convert vToken units (8 decimals) to underlying units.
 * Venus/Compound: underlying = vTokens × rate / 1e18 - verified against
 * cash + borrows − reserves on vTSLAB (exact to 1 wei).
 */
export function vTokensToUnderlying(vTokens: bigint, rate: bigint): bigint {
  return (vTokens * rate) / 10n ** 18n;
}

/** Inverse of vTokensToUnderlying, rounded UP (conservative for redeemAllowed pre-checks). */
export function underlyingToVTokens(amount: bigint, rate: bigint): bigint {
  if (rate === 0n) return 0n;
  return (amount * 10n ** 18n + rate - 1n) / rate;
}

/** Price raw → human USD, e.g. 1e(36-18) scale for 18-decimals underlyings. */
export function priceRawToUsd(priceRaw: bigint, underlyingDecimals: number): number {
  return Number(priceRaw) / 10 ** (36 - underlyingDecimals);
}

/** Cached measured blocks-per-year (10 min): BSC cadence is not a constant. */
let bpcCache: { value: number; at: number } | null = null;

/**
 * Measure BSC block production from two recent blocks and extrapolate to a
 * year. Venus accrues per real block (verified: accrualBlockNumber tracks the
 * chain head), so per-block rates only convert to an APR with a real blocks/year.
 * Returns 0 when unmeasurable - callers should treat that as "no APR".
 */
export async function measureBlocksPerYear(): Promise<number> {
  if (bpcCache && Date.now() - bpcCache.at < 10 * 60_000) return bpcCache.value;
  try {
    const latest = await venusClient.getBlockNumber();
    const [b1, b2] = await Promise.all([
      venusClient.getBlock({ blockNumber: latest }),
      venusClient.getBlock({ blockNumber: latest - 2000n }),
    ]);
    const dt = Number(b1.timestamp - b2.timestamp);
    const value = dt > 0 ? Math.round((2000 * 31_536_000) / dt) : 0;
    bpcCache = { value, at: Date.now() };
    return value;
  } catch {
    return 0;
  }
}

/** Market size: total supplied underlying at oracle price, in USD. */
export function marketSizeUsd(m: VenusMarket): number | null {
  if (!m.priceUsd || m.priceUsd <= 0) return null;
  const units =
    Number(vTokensToUnderlying(m.totalSupply, m.exchangeRate)) /
    10 ** m.underlyingDecimals;
  if (!Number.isFinite(units)) return null;
  return units * m.priceUsd;
}

/**
 * Supplier-side simple APR: the protocol's own supplyRatePerBlock × measured
 * blocksPerYear. Venus publishes this directly (no utilization/reserve math
 * on our side); dormant markets read 0 because nobody borrows them.
 */
export function supplyApr(m: VenusMarket | undefined): number | null {
  if (!m || m.blocksPerYear <= 0) return null;
  const perBlock = Number(m.supplyRatePerBlock) / 1e18;
  if (!Number.isFinite(perBlock)) return null;
  const apr = perBlock * m.blocksPerYear;
  return Number.isFinite(apr) ? apr : null;
}

export async function fetchVenusMarkets(): Promise<VenusMarket[]> {
  const comptroller = COMPTROLLER_ADDRESS;
  const [markets, oracle] = await Promise.all([
    venusClient.readContract({
      address: comptroller,
      abi: COMPTROLLER_ABI,
      functionName: "getAllMarkets",
    }),
    venusClient.readContract({
      address: comptroller,
      abi: COMPTROLLER_ABI,
      functionName: "oracle",
    }),
  ]);

  const [
    listed,
    symbols,
    underlyings,
    rates,
    prices,
    mintCodes,
    supplies,
    cashes,
    borrows,
    reserves,
    borrowRates,
    supplyRates,
    blocksPerYear,
  ] = await Promise.all([
    venusClient.multicall({
      contracts: markets.map((v) => ({
        address: comptroller,
        abi: COMPTROLLER_ABI,
        functionName: "markets",
        args: [v],
      })),
      allowFailure: true,
    }),
    venusClient.multicall({
      contracts: markets.map((v) => ({
        address: v,
        abi: VTOKEN_ABI,
        functionName: "symbol",
      })),
      allowFailure: true,
    }),
    venusClient.multicall({
      contracts: markets.map((v) => ({
        address: v,
        abi: VTOKEN_ABI,
        functionName: "underlying",
      })),
      allowFailure: true,
    }),
    venusClient.multicall({
      contracts: markets.map((v) => ({
        address: v,
        abi: VTOKEN_ABI,
        functionName: "exchangeRateStored",
      })),
      allowFailure: true,
    }),
    venusClient.multicall({
      contracts: markets.map((v) => ({
        address: oracle,
        abi: ORACLE_ABI,
        functionName: "getUnderlyingPrice",
        args: [v],
      })),
      allowFailure: true,
    }),
    venusClient.multicall({
      contracts: markets.map((v) => ({
        address: comptroller,
        abi: COMPTROLLER_ABI,
        functionName: "mintAllowed",
        args: [v, "0x000000000000000000000000000000000000dEaD", 0n],
      })),
      allowFailure: true,
    }),
    venusClient.multicall({
      contracts: markets.map((v) => ({
        address: v,
        abi: VTOKEN_ABI,
        functionName: "totalSupply",
      })),
      allowFailure: true,
    }),
    venusClient.multicall({
      contracts: markets.map((v) => ({
        address: v,
        abi: VTOKEN_ABI,
        functionName: "getCash",
      })),
      allowFailure: true,
    }),
    venusClient.multicall({
      contracts: markets.map((v) => ({
        address: v,
        abi: VTOKEN_ABI,
        functionName: "totalBorrows",
      })),
      allowFailure: true,
    }),
    venusClient.multicall({
      contracts: markets.map((v) => ({
        address: v,
        abi: VTOKEN_ABI,
        functionName: "totalReserves",
      })),
      allowFailure: true,
    }),
    venusClient.multicall({
      contracts: markets.map((v) => ({
        address: v,
        abi: VTOKEN_ABI,
        functionName: "borrowRatePerBlock",
      })),
      allowFailure: true,
    }),
    venusClient.multicall({
      contracts: markets.map((v) => ({
        address: v,
        abi: VTOKEN_ABI,
        functionName: "supplyRatePerBlock",
      })),
      allowFailure: true,
    }),
    measureBlocksPerYear(),
  ]);

  const uniqueUnderlyings = [
    ...new Set(
      underlyings
        .map((r) => (r.status === "success" ? String(r.result).toLowerCase() : null))
        .filter((a): a is string => a !== null),
    ),
  ];
  const meta = await venusClient.multicall({
    contracts: uniqueUnderlyings.flatMap((a) => [
      { address: a as `0x${string}`, abi: ERC20_META_ABI, functionName: "symbol" as const },
      { address: a as `0x${string}`, abi: ERC20_META_ABI, functionName: "decimals" as const },
    ]),
    allowFailure: true,
  });
  const metaByAddr = new Map<string, { symbol: string; decimals: number }>();
  uniqueUnderlyings.forEach((a, i) => {
    const sym = meta[i * 2];
    const dec = meta[i * 2 + 1];
    metaByAddr.set(a, {
      symbol: sym.status === "success" ? String(sym.result) : "?",
      decimals: dec.status === "success" ? Number(dec.result) : 18,
    });
  });

  return markets.map((v, i) => {
    const lc = listed[i];
    const ul = underlyings[i].status === "success" ? (underlyings[i].result as `0x${string}`) : null;
    const meta = ul ? metaByAddr.get(ul.toLowerCase()) : null;
    const decimals = meta?.decimals ?? 18;
    const priceRaw = prices[i].status === "success" ? (prices[i].result as bigint) : null;
    const lcResult = lc.status === "success" ? (lc.result as unknown as readonly [boolean, bigint]) : null;
    return {
      vToken: v,
      symbol: symbols[i].status === "success" ? String(symbols[i].result) : "?",
      underlying: ul,
      underlyingSymbol: ul ? (meta?.symbol ?? "?") : "BNB",
      underlyingDecimals: decimals,
      isListed: lcResult ? lcResult[0] : false,
      collateralFactor: lcResult ? Number(lcResult[1]) / 1e18 : 0,
      mintable:
        mintCodes[i].status === "success"
          ? (mintCodes[i].result as unknown as bigint) === 0n
          : false,
      priceUsd: priceRaw !== null ? priceRawToUsd(priceRaw, decimals) : null,
      exchangeRate:
        rates[i].status === "success" ? (rates[i].result as bigint) : 0n,
      totalSupply:
        supplies[i].status === "success" ? (supplies[i].result as bigint) : 0n,
      cash: cashes[i].status === "success" ? (cashes[i].result as bigint) : 0n,
      totalBorrows:
        borrows[i].status === "success" ? (borrows[i].result as bigint) : 0n,
      totalReserves:
        reserves[i].status === "success" ? (reserves[i].result as bigint) : 0n,
      borrowRatePerBlock:
        borrowRates[i].status === "success" ? (borrowRates[i].result as bigint) : 0n,
      supplyRatePerBlock:
        supplyRates[i].status === "success" ? (supplyRates[i].result as bigint) : 0n,
      blocksPerYear,
    };
  });
}

export function findUsdtMarket(markets: VenusMarket[]): VenusMarket | undefined {
  return markets.find((m) => m.underlying?.toLowerCase() === USDT_BSC.toLowerCase());
}

export type VenusPositionItem = {
  vToken: `0x${string}`;
  symbol: string;
  underlyingSymbol: string;
  underlyingDecimals: number;
  amount: bigint;
  valueUsd: number;
};

export type VenusPosition = {
  supplied: VenusPositionItem[];
  borrowed: VenusPositionItem[];
  suppliedUsd: number;
  borrowUsd: number;
  liquidityUsd: number;
  shortfallUsd: number;
  healthFactor: number | null;
};

/**
 * Health factor, from comptroller.getAccountLiquidity (Compound semantics):
 *
 *   getAccountLiquidity returns (err, liquidity, shortfall) in 1e18 USD, where exactly one
 *   of liquidity/shortfall is zero and:
 *       CF-weighted collateral − borrowUsd = liquidity − shortfall
 *   therefore:
 *       CF-weighted collateral = borrowUsd + liquidity − shortfall
 *       HF = CF-weighted collateral / borrowUsd
 *
 *   → healthy (shortfall = 0): HF = (borrowUsd + liquidity) / borrowUsd
 *   → underwater (liquidity = 0, shortfall > 0): HF < 1
 *   → no borrow: HF = null (display "-")
 */
export function healthFactorFrom(borrowUsd: number, liquidityUsd: number, shortfallUsd: number): number | null {
  if (borrowUsd <= 0) return null;
  return (borrowUsd + liquidityUsd - shortfallUsd) / borrowUsd;
}

export async function fetchVenusPosition(
  user: `0x${string}`,
  markets: VenusMarket[],
): Promise<VenusPosition> {
  const comptroller = COMPTROLLER_ADDRESS;

  const [balances, borrows, accountLiquidity] = await Promise.all([
    venusClient.multicall({
      contracts: markets.map((m) => ({
        address: m.vToken,
        abi: VTOKEN_ABI,
        functionName: "balanceOf",
        args: [user],
      })),
      allowFailure: true,
    }),
    venusClient.multicall({
      contracts: markets.map((m) => ({
        address: m.vToken,
        abi: VTOKEN_ABI,
        functionName: "borrowBalanceStored",
        args: [user],
      })),
      allowFailure: true,
    }),
    venusClient.readContract({
      address: comptroller,
      abi: COMPTROLLER_ABI,
      functionName: "getAccountLiquidity",
      args: [user],
    }),
  ]);

  const supplied: VenusPositionItem[] = [];
  const borrowed: VenusPositionItem[] = [];

  markets.forEach((m, i) => {
    const bal =
      balances[i].status === "success" ? (balances[i].result as bigint) : 0n;
    const debt =
      borrows[i].status === "success" ? (borrows[i].result as bigint) : 0n;

    if (bal > 0n) {
      const amount = vTokensToUnderlying(bal, m.exchangeRate);
      const valueUsd =
        m.priceUsd !== null ? unitsToNumber(amount, m.underlyingDecimals) * m.priceUsd : 0;
      supplied.push({
        vToken: m.vToken,
        symbol: m.symbol,
        underlyingSymbol: m.underlyingSymbol,
        underlyingDecimals: m.underlyingDecimals,
        amount,
        valueUsd,
      });
    }
    if (debt > 0n) {
      const valueUsd =
        m.priceUsd !== null ? unitsToNumber(debt, m.underlyingDecimals) * m.priceUsd : 0;
      borrowed.push({
        vToken: m.vToken,
        symbol: m.symbol,
        underlyingSymbol: m.underlyingSymbol,
        underlyingDecimals: m.underlyingDecimals,
        amount: debt,
        valueUsd,
      });
    }
  });

  const [err, liquidity, shortfall] = accountLiquidity;
  const liquidityUsd = Number(liquidity) / 1e18;
  const shortfallUsd = Number(shortfall) / 1e18;
  const suppliedUsd = supplied.reduce((s, x) => s + x.valueUsd, 0);
  const borrowUsd = borrowed.reduce((s, x) => s + x.valueUsd, 0);

  return {
    supplied,
    borrowed,
    suppliedUsd,
    borrowUsd,
    liquidityUsd,
    shortfallUsd,
    healthFactor: err === 0n
      ? healthFactorFrom(borrowUsd, liquidityUsd, shortfallUsd)
      : null,
  };
}

/**
 * Pre-check a Venus action exactly the way the protocol would evaluate it:
 * returns the comptroller error code (0 = would be allowed). Non-zero codes are surfaced
 * verbatim - we don't map them to guessed strings; the wallet/tx simulation shows details.
 */
export async function checkVenusAction(
  action: "mint" | "borrow" | "redeem",
  vToken: `0x${string}`,
  user: `0x${string}`,
  amountUnderlying: bigint,
  market: VenusMarket,
): Promise<number | null> {
  try {
    if (action === "mint") {
      const code = await venusClient.readContract({
        address: COMPTROLLER_ADDRESS,
        abi: COMPTROLLER_ABI,
        functionName: "mintAllowed",
        args: [vToken, user, amountUnderlying],
      });
      return Number(code);
    }
    if (action === "borrow") {
      const code = await venusClient.readContract({
        address: COMPTROLLER_ADDRESS,
        abi: COMPTROLLER_ABI,
        functionName: "borrowAllowed",
        args: [vToken, user, amountUnderlying],
      });
      return Number(code);
    }
    const redeemTokens = underlyingToVTokens(
      amountUnderlying,
      market.exchangeRate,
    );
    const code = await venusClient.readContract({
      address: COMPTROLLER_ADDRESS,
      abi: COMPTROLLER_ABI,
      functionName: "redeemAllowed",
      args: [vToken, user, redeemTokens],
    });
    return Number(code);
  } catch {
    return null;
  }
}

const ERC20_META_ABI = [
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;
