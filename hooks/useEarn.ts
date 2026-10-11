"use client";

import { useMemo } from "react";
import { useConnection } from "wagmi";
import { USDT_BSC, USDC_BSC } from "@/lib/erc20";
import { formatUnits, unitsToNumber } from "@/lib/format";
import { useUniverse, useDynamic } from "@/hooks/useRwa";
import { useVenusMarkets, useVenusPosition } from "@/hooks/useVenus";
import { useNativeAccount, useNativePoolConfig } from "@/hooks/useNative";
import { QQQB_FALLBACK } from "@/lib/constants";

export type EarnNativeItem = {
  key: string;
  symbol: string;
  token: `0x${string}` | undefined;
  units: bigint;
  decimals: number;
  usd: number;
  earned?: string;
};

export type EarnVenusItem = {
  key: string;
  symbol: string;
  token: `0x${string}`;
  units: bigint;
  decimals: number;
  usd: number;
};

/**
 * One read model for "what is earning": Venus lending across every market
 * you supplied + Native Pool balances, plus their USD totals. Shared by
 * /earn and /portfolio - every query inside uses the same keys as those
 * pages, so React Query dedupes.
 */
export function useEarnData() {
  const { address } = useConnection();
  const universe = useUniverse();
  const venus = useVenusMarkets();
  const nativeConfig = useNativePoolConfig();

  const position = useVenusPosition(address, venus.data, venus.dataUpdatedAt);
  const nativeAccount = useNativeAccount(address);

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

  const venusItems: EarnVenusItem[] = useMemo(() => {
    const out: EarnVenusItem[] = [];
    if (!position.data || !venus.data) return out;
    for (const s of position.data.supplied) {
      if (s.amount <= 0n) continue;
      const m = venus.data.find((mk) => mk.vToken === s.vToken);
      if (!m || !m.underlying) continue;
      // position.data.supplied[].amount is already underlying units
      // (fetchVenusPosition converts vTokens via exchangeRate).
      out.push({
        key: `venus:${m.underlyingSymbol.toLowerCase()}`,
        symbol: m.underlyingSymbol,
        token: m.underlying,
        units: s.amount,
        decimals: m.underlyingDecimals,
        usd:
          unitsToNumber(s.amount, m.underlyingDecimals) * (m.priceUsd ?? 1),
      });
    }
    return out;
  }, [position.data, venus.data]);
  const venusLentUsd = venusItems.reduce((s, i) => s + i.usd, 0);

  const assetsById = useMemo(
    () => new Map((nativeConfig.data?.assets ?? []).map((a) => [a.assetId, a])),
    [nativeConfig.data],
  );
  const nativeItems: EarnNativeItem[] = useMemo(() => {
    const out: EarnNativeItem[] = [];
    for (const b of nativeAccount.data?.balances ?? []) {
      if (b.earnBalance <= 0n) continue;
      const a = assetsById.get(b.assetId);
      if (!a) continue;
      const priceUsd =
        a.symbol === "USDT" || a.symbol === "USDC"
          ? 1
          : a.symbol === "QQQB"
            ? qqqbPrice
            : null;
      if (priceUsd === null) continue;
      const token =
        a.symbol === "USDT"
          ? USDT_BSC
          : a.symbol === "USDC"
            ? USDC_BSC
            : (qqqbAddress as `0x${string}`);
      out.push({
        key: `native:${a.symbol}`,
        symbol: a.symbol,
        token,
        units: b.earnBalance,
        decimals: a.balanceDecimals,
        usd: unitsToNumber(b.earnBalance, a.balanceDecimals) * priceUsd,
        earned:
          b.lifetimeYield > 0n
            ? `${formatUnits(b.lifetimeYield, a.balanceDecimals, 6)} ${a.symbol}`
            : undefined,
      });
    }
    return out;
  }, [nativeAccount.data, assetsById, qqqbPrice, qqqbAddress]);

  const earnUsd = venusLentUsd + nativeItems.reduce((s, i) => s + i.usd, 0);

  // A native QQQB balance that can't be priced would silently drop out of
  // earnUsd - treat "balance exists but price missing" as an error state.
  const needsQqqbPrice = (nativeAccount.data?.balances ?? []).some(
    (b) => b.earnBalance > 0n && assetsById.get(b.assetId)?.symbol === "QQQB",
  );
  const qqqbPriceMissing = needsQqqbPrice && qqqbPrice === null;

  return {
    address,
    isLoading:
      Boolean(address) &&
      (venus.isLoading ||
        position.isLoading ||
        nativeConfig.isLoading ||
        nativeAccount.isLoading),
    venusItems,
    venusLentUsd,
    nativeItems,
    earnUsd,
    refetch: () => {
      void position.refetch();
      void nativeAccount.refetch();
      void venus.refetch();
      void nativeConfig.refetch();
      void qqqbDynamic.refetch();
    },
    hasError:
      position.isError ||
      nativeAccount.isError ||
      venus.isError ||
      nativeConfig.isError ||
      qqqbPriceMissing,
  };
}
