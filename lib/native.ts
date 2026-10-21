import type { Address } from "viem";

/**
 * Native Core Pool - earn venue.
 *
 * Everything reads at runtime from two keyless endpoints:
 *   - Pool API  (config / account / deposits)  → https://api-ui.native.org
 *   - Core API  (accountStatus / markPrices /
 *     accountingDepositContracts)              → https://api.native.org
 * HTTP is always 200; the body `code` field decides success (0 = ok).
 * Amounts are integer atom strings - never parse them with Number.
 */

export const NATIVE_POOL_API = "/api/native";
export const NATIVE_CORE_API = "/api/native";

/** Documented last-resort BSC vault; runtime discovery below supersedes it. */
export const NATIVE_BSC_VAULT_FALLBACK =
  "0xd7AFd8FbEcC1AE7a4Ce5b93eb59D76F967D0Dea7" as const;

/** Core asset_id of BNB - the gas token on BSC, used to size the activation fee. */
const NATIVE_BNB_ASSET_ID = 4;

/** Pool deposits must be worth at least 10 USD (10 units of a stablecoin). */
export const NATIVE_MIN_DEPOSIT_USD = 10;

/** Buffer on the ~1 USD activation fee (validation tolerates a 30% shortfall). */
const ACTIVATION_FEE_BUFFER = 1.05;

/** Subset of the DepositWithdrawVault ABI the deposit path touches. */
export const VAULT_ABI = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "payable",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "actionFlag", type: "uint256" },
    ],
    outputs: [{ name: "wNLPAmount", type: "uint256" }],
  },
  {
    type: "function",
    name: "getSupportedUnderlyings",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "isSupportedUnderlying",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "isDepositPaused",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "emergencyPaused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "minDepositDecimalByUnderlying",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "Deposit",
    anonymous: false,
    inputs: [
      { name: "underlying", type: "address", indexed: true },
      { name: "wrappedNLP", type: "address", indexed: false },
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "wNLPAmount", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
      { name: "actionFlag", type: "uint256", indexed: true },
      { name: "nonce", type: "uint256", indexed: false },
    ],
  },
  {
    type: "error",
    name: "UnsupportedUnderlying",
    inputs: [],
  },
  { type: "error", name: "ZeroAmount", inputs: [] },
  { type: "error", name: "ZeroAddress", inputs: [] },
  {
    type: "error",
    name: "ReentrancyGuardReentrantCall",
    inputs: [],
  },
  {
    type: "error",
    name: "SafeERC20FailedOperation",
    inputs: [{ name: "", type: "address" }],
  },
] as const;

export type NativePoolAsset = {
  assetId: number;
  symbol: string;
  /** Pool-side precision; every asset currently reports 8. */
  balanceDecimals: number;
  depositEnabled: boolean;
  scheduledWithdrawEnabled: boolean;
  instantWithdrawEnabled: boolean;
  withdrawPendingSeconds: number;
  instantFeeBps: number;
  /**
   * Latest distribution annualized, as a RATIO (0.05 = 5%). The API returns
   * "0" both for a real zero and when the figure can't be computed (fewer
   * than two distributions etc.) - indistinguishable by design.
   * `null` = field omitted from the response entirely.
   */
  projectedApy: number | null;
  /** Total earning balance, in the asset's own 8-decimal atoms. */
  tvlAtoms: bigint;
};

export type NativePoolConfig = {
  vaultAddress: Address;
  snapshotTimeUtc: string;
  withdrawalPaused: boolean;
  assets: NativePoolAsset[];
};

type PoolEnvelope<T> = { code: number; data?: T; message?: string };

async function poolCall<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(NATIVE_POOL_API, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json()) as PoolEnvelope<T>;
  if (json.code !== 0 || !json.data) {
    throw new Error(json.message || `native pool error ${json.code}`);
  }
  return json.data;
}

async function coreCall<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(NATIVE_CORE_API, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`native core /info HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Pool config: assets, APYs, TVL, vault address. Not rate limited. */
export async function fetchNativePoolConfig(): Promise<NativePoolConfig> {
  const data = await poolCall<{
    vault_address: string;
    snapshot_time_utc: string;
    withdrawal_paused: boolean;
    assets: Array<{
      asset_id: number;
      symbol: string;
      balance_decimals: number;
      deposit_enabled: boolean;
      scheduled_withdraw_enabled: boolean;
      instant_withdraw_enabled: boolean;
      withdraw_pending_seconds: number;
      instant_fee_bps: number;
      min_withdraw_amount: string;
      max_single_withdraw_amount: string;
      projected_apy?: string;
      realtime_tvl_amount?: string;
    }>;
  }>({ type: "config" });

  return {
    vaultAddress: data.vault_address as Address,
    snapshotTimeUtc: data.snapshot_time_utc,
    withdrawalPaused: data.withdrawal_paused,
    assets: data.assets.map((a) => ({
      assetId: a.asset_id,
      symbol: a.symbol,
      balanceDecimals: a.balance_decimals,
      depositEnabled: a.deposit_enabled,
      scheduledWithdrawEnabled: a.scheduled_withdraw_enabled,
      instantWithdrawEnabled: a.instant_withdraw_enabled,
      withdrawPendingSeconds: a.withdraw_pending_seconds,
      instantFeeBps: a.instant_fee_bps,
      projectedApy:
        typeof a.projected_apy === "string" &&
        a.projected_apy.trim() !== "" &&
        Number.isFinite(Number(a.projected_apy))
          ? Number(a.projected_apy)
          : null,
      tvlAtoms:
        typeof a.realtime_tvl_amount === "string" &&
        /^\d+$/.test(a.realtime_tvl_amount)
          ? BigInt(a.realtime_tvl_amount)
          : 0n,
    })),
  };
}

/**
 * Current vault address for a source chain - read at startup, never shipped
 * as a constant (vaults get redeployed; a deposit to a superseded vault is
 * not credited). Falls back to the documented BSC address on error.
 */
export async function fetchNativeVault(
  chainId: number,
): Promise<{ address: Address; source: "runtime" | "fallback" }> {
  try {
    const data = await coreCall<{
      accounting_deposit_contracts: Array<{
        src_chain_id: number;
        src_contract: string;
      }>;
    }>({ type: "accountingDepositContracts" });
    const hit = data.accounting_deposit_contracts.find(
      (c) => c.src_chain_id === chainId,
    );
    if (hit) return { address: hit.src_contract as Address, source: "runtime" };
    return { address: NATIVE_BSC_VAULT_FALLBACK, source: "fallback" };
  } catch {
    return { address: NATIVE_BSC_VAULT_FALLBACK, source: "fallback" };
  }
}

/**
 * Does this address already have a Native Core account? A first deposit must
 * carry a one-time activation fee as msg.value; later deposits must carry 0.
 * Unreadable = blocking: the vault does not enforce the fee, so never guess.
 */
export async function fetchNativeAccountStatus(
  user: Address,
): Promise<{ found: boolean }> {
  const data = await coreCall<{ found: boolean }>({
    type: "accountStatus",
    user,
  });
  if (typeof data.found !== "boolean") {
    throw new Error("unreadable accountStatus");
  }
  return { found: data.found };
}

/**
 * One-time activation fee in BNB wei: 1 USD of gas token, priced by the same
 * oracle the deposit is validated against (markPrices), with a small buffer
 * (overpayment is accepted, underpayment past 30% is permanent).
 */
export async function fetchNativeActivationFeeWei(): Promise<bigint> {
  const data = await coreCall<{
    mark_prices: Array<{ asset_id: number; usd_atoms: string }>;
  }>({ type: "markPrices" });
  const bnb = data.mark_prices.find((p) => p.asset_id === NATIVE_BNB_ASSET_ID);
  if (!bnb) throw new Error("markPrices: BNB (asset 4) missing");
  const usdAtoms = BigInt(bnb.usd_atoms);
  if (usdAtoms <= 0n) throw new Error("markPrices: non-positive BNB price");
  // $1 in 18-decimal atoms, then buffer: 10^26 / usdAtoms
  const exact = 10n ** 26n / usdAtoms;
  return (exact * BigInt(Math.round(ACTIVATION_FEE_BUFFER * 100))) / 100n;
}

/**
 * BNB USD price from the Native core markPrices oracle (asset_id 4, 1e-8 atoms).
 * Shared by the portfolio wallet strip and the swap card's USD estimates.
 */
export async function fetchBnbUsdPrice(): Promise<number> {
  const data = await coreCall<{
    mark_prices: Array<{ asset_id: number; usd_atoms: string }>;
  }>({ type: "markPrices" });
  const bnb = data.mark_prices.find((p) => p.asset_id === NATIVE_BNB_ASSET_ID);
  if (!bnb) throw new Error("markPrices: BNB (asset 4) missing");
  const price = Number(bnb.usd_atoms) / 1e8;
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("markPrices: non-positive BNB price");
  }
  return price;
}

/**
 * Settlement only credits amounts on the 8-decimal grid
 * (Pool balance_decimals, currently 8 for every asset): floor the amount.
 */
export function floorToGrid8(amount: bigint, tokenDecimals: number): bigint {
  const scale = 10n ** BigInt(Math.max(0, tokenDecimals - 8));
  return amount - (amount % scale);
}

export type NativeAccountBalance = {
  assetId: number;
  /** Available and earning, in balance_decimals atoms. */
  earnBalance: bigint;
  inQueueBalance: bigint;
  withdrawLockedBalance: bigint;
  lifetimeYield: bigint;
  lifetimeDeposit: bigint;
  /** Non-empty when a withdrawal is already in flight for this asset. */
  activeWithdrawOperationId: string;
};

/** The user's Pool balances (positions). Metered 3/s per address. */
export async function fetchNativeAccount(
  user: Address,
): Promise<{ balances: NativeAccountBalance[] }> {
  const data = await poolCall<{
    balances: Array<{
      asset_id: number;
      earn_balance: string;
      in_queue_balance: string;
      withdraw_locked_balance: string;
      lifetime_yield: string;
      lifetime_deposit: string;
      active_withdraw_operation_id: string;
    }>;
  }>({ type: "account", user_address: user });
  // A single malformed field (null/""/non-numeric) previously threw inside
  // BigInt() and killed the whole account fetch; treat unreadable atoms as 0.
  const atoms = (v: unknown): bigint => {
    if (typeof v === "string" && /^\d+$/.test(v)) return BigInt(v);
    if (typeof v === "number" && Number.isInteger(v) && v >= 0) return BigInt(v);
    return 0n;
  };
  return {
    balances: (data.balances ?? []).map((b) => ({
      assetId: b.asset_id,
      earnBalance: atoms(b.earn_balance),
      inQueueBalance: atoms(b.in_queue_balance),
      withdrawLockedBalance: atoms(b.withdraw_locked_balance),
      lifetimeYield: atoms(b.lifetime_yield),
      lifetimeDeposit: atoms(b.lifetime_deposit),
      activeWithdrawOperationId: b.active_withdraw_operation_id,
    })),
  };
}
