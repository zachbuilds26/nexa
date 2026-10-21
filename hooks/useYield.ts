"use client";

import { useMemo } from "react";
import { useConnection, useReadContracts } from "wagmi";
import { ERC20_ABI, USDT_BSC, USDC_BSC } from "@/lib/erc20";
import { findUsdtMarket, marketSizeUsd, supplyApr } from "@/lib/venus";
import { unitsToNumber } from "@/lib/format";
import { earnKey, type Venue } from "@/lib/earnKey";
import { useDynamic, useUniverse } from "@/hooks/useRwa";
import { useVenusMarkets } from "@/hooks/useVenus";
import { useNativePoolConfig } from "@/hooks/useNative";
import { QQQB_FALLBACK } from "@/lib/constants";

export type YieldRow = {
  key: string;
  venue: Venue;
  symbol: string;
  token: `0x${string}` | undefined;
  decimals: number;
  /** APR/APY as a fraction (0.036 = 3.6%). */
  apy: number | null;
  apyNote: string;
  tvlUsd: number | null;
  /** Price of 1 token in USD (1 for the stables). */
  priceUsd: number | null;
  depositEnabled: boolean;
  /** Venus rows: the market's vToken - resolves the market behind the row. */
  vToken?: `0x${string}`;
  /** Native withdrawal parameters, for the withdraw-tab hand-off copy. */
  withdrawPendingSeconds?: number;
  instantFeeBps?: number;
};

/** bStocks worth listing on the Earn page (P0 scope: two stables + one bStock). */
const NATIVE_EARN_SYMBOLS = new Set(["USDC", "USDT", "QQQB"]);

/**
 * All yield rows: every listed Venus market with an underlying (supply side)
 * plus the Native pool's listed assets, sorted by APY desc. Shared by the
 * Earn list and the pool detail page; React Query dedupes the underlying
 * reads across both.
 */
export function useYieldRows() {
  const universe = useUniverse();
  const venus = useVenusMarkets();
  const nativeConfig = useNativePoolConfig();

  const vUSDT = useMemo(
    () => (venus.data ? findUsdtMarket(venus.data) : undefined),
    [venus.data],
  );

  const qqqbAddress = useMemo(() => {
    const hit = (universe.data ?? []).find(
      (s) => s.symbol.toUpperCase() === "QQQB" || s.ticker.toUpperCase() === "QQQ",
    );
    return hit?.contractAddress ?? QQQB_FALLBACK;
  }, [universe.data]);
  const qqqbDynamic = useDynamic(qqqbAddress);
  const qqqbPrice = qqqbDynamic.data?.onchainPrice
    ? Number(qqqbDynamic.data.onchainPrice)
    : null;

  /** Lending is bStocks + USDT only - never the chain's generic majors. */
  const universeSet = useMemo(
    () =>
      new Set(
        (universe.data ?? []).map((s) => s.contractAddress.toLowerCase()),
      ),
    [universe.data],
  );

  const rows: YieldRow[] = useMemo(() => {
    const out: YieldRow[] = [];
    for (const m of venus.data ?? []) {
      if (!m.isListed || !m.underlying) continue;
      const isBStock = universeSet.has(m.underlying.toLowerCase());
      const isStable = m.underlyingSymbol === "USDT";
      if (!isBStock && !isStable) continue;
      out.push({
        key: earnKey("venus", m.underlyingSymbol),
        venue: "venus",
        symbol: m.underlyingSymbol,
        token: m.underlying,
        decimals: m.underlyingDecimals,
        apy: supplyApr(m),
        apyNote: "Live APR",
        tvlUsd: marketSizeUsd(m),
        priceUsd: m.priceUsd,
        depositEnabled: m.mintable,
        vToken: m.vToken,
      });
    }
    for (const a of nativeConfig.data?.assets ?? []) {
      if (!NATIVE_EARN_SYMBOLS.has(a.symbol)) continue;
      const token =
        a.symbol === "USDT"
          ? USDT_BSC
          : a.symbol === "USDC"
            ? USDC_BSC
            : (qqqbAddress as `0x${string}`);
      const priceUsd =
        a.symbol === "USDC" || a.symbol === "USDT" ? 1 : qqqbPrice;
      const stock = (universe.data ?? []).find(
        (s) => s.symbol.toUpperCase() === a.symbol,
      );
      const noProjectedYield = a.projectedApy === 0;
      out.push({
        key: earnKey("native", a.symbol),
        venue: "native",
        symbol: a.symbol,
        token,
        decimals: stock?.decimals ?? 18,
        apy: noProjectedYield ? null : a.projectedApy,
        apyNote: noProjectedYield ? "No projected yield" : "Projected APY",
        tvlUsd:
          priceUsd === null
            ? null
            : (unitsToNumber(a.tvlAtoms, a.balanceDecimals) || 0) * priceUsd,
        priceUsd,
        depositEnabled: a.depositEnabled,
        withdrawPendingSeconds: a.withdrawPendingSeconds,
        instantFeeBps: a.instantFeeBps,
      });
    }
    out.sort((x, y) => (y.apy ?? -1) - (x.apy ?? -1));
    return out;
  }, [
    venus.data,
    universeSet,
    nativeConfig.data,
    qqqbAddress,
    qqqbPrice,
    universe.data,
  ]);

  const loading = venus.isLoading || nativeConfig.isLoading || universe.isLoading;
  const error = venus.isError || nativeConfig.isError || universe.isError;
  const refetch = () => {
    void venus.refetch();
    void nativeConfig.refetch();
    void universe.refetch();
  };

  return { rows, venus, vUSDT, loading, error, refetch };
}

/** ERC-20 balances for every yield row's token, keyed by row key. */
export function useYieldBalances(rows: YieldRow[], fastPoll = false) {
  const { address } = useConnection();

  const tokenContracts = useMemo(
    () =>
      rows
        .filter((r) => r.token && address)
        .map((r) => ({
          address: r.token as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf" as const,
          args: [address] as const,
        })),
    [rows, address],
  );
  const balancesRead = useReadContracts({
    contracts: tokenContracts,
    query: {
      enabled: Boolean(address) && tokenContracts.length > 0,
      staleTime: 5_000,
      refetchInterval: fastPoll ? 2_000 : false,
    },
  });
  const balanceByKey = useMemo(() => {
    const m = new Map<string, bigint>();
    const withTok = rows.filter((r) => r.token);
    withTok.forEach((r, i) => {
      const res = balancesRead.data?.[i]?.result;
      if (typeof res === "bigint") m.set(r.key, res);
    });
    return m;
  }, [rows, balancesRead.data]);

  return {
    balanceByKey,
    isLoading: Boolean(address) && balancesRead.isLoading,
    isError: Boolean(address) && balancesRead.isError,
    refetch: () => void balancesRead.refetch(),
  };
}
