"use client";

import { useMemo } from "react";
import { useConnection } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBlock } from "@/components/ui/StateBlocks";
import { ContextStat, InfoRow } from "@/components/ui/Stats";
import { VenueLogo } from "@/components/ui/VenueLogo";
import {
  fetchNativeAccountStatus,
  fetchNativeActivationFeeWei,
  NATIVE_MIN_DEPOSIT_USD,
} from "@/lib/native";
import { vTokensToUnderlying } from "@/lib/venus";
import { fmtNumTrim, fmtUsdCompact, formatUnits } from "@/lib/format";
import { useVenusPosition } from "@/hooks/useVenus";
import { useYieldBalances, useYieldRows } from "@/hooks/useYield";

const DESCS: Record<string, string> = {
  venus: "Venus Core Pool. Supply and redeem anytime; the rate accrues per block.",
  native: "Native Pool. Deposits settle on an 8-decimal grid and credit after the pool's cycle.",
};

/**
 * Left column of the pool detail page: identity stats (APY, TVL, in wallet)
 * and the venue's terms. Queries share keys with PoolActionCard so React
 * Query dedupes them.
 */
export function PoolInfoPanel({
  poolKey,
  className = "",
}: {
  poolKey: string;
  className?: string;
}) {
  const { address, isConnected } = useConnection();
  const { rows, venus, vUSDT, loading, error, refetch } = useYieldRows();
  const selected = useMemo(
    () => rows.find((r) => r.key === poolKey),
    [rows, poolKey],
  );
  /** The Venus market this row lends into (per-row vToken, legacy = USDT). */
  const venusMarket = useMemo(() => {
    if (selected?.venue !== "venus" || !venus.data) return undefined;
    if (selected.vToken) {
      return venus.data.find((m) => m.vToken === selected.vToken);
    }
    return vUSDT;
  }, [selected, venus.data, vUSDT]);
  const balanceQ = useYieldBalances(rows);
  const balanceByKey = balanceQ.balanceByKey;
  const position = useVenusPosition(address, venus.data, venus.dataUpdatedAt);

  const nativeStatusQ = useQuery({
    queryKey: ["native-status", address],
    queryFn: () => fetchNativeAccountStatus(address as `0x${string}`),
    enabled: Boolean(address && selected?.venue === "native"),
    staleTime: 60_000,
  });
  const nativeFeeQ = useQuery({
    queryKey: ["native-activation-fee"],
    queryFn: fetchNativeActivationFeeWei,
    enabled: selected?.venue === "native",
    staleTime: 120_000,
  });

  if (loading && !selected) {
    return (
      <div className={className}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
        <Card className="mt-4 p-4">
          <Skeleton className="mb-3 h-4 w-24" />
          <Skeleton className="mb-2 h-3 w-full" />
          <Skeleton className="mb-2 h-3 w-5/6" />
          <Skeleton className="h-3 w-2/3" />
        </Card>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className={className}>
        <Card className="p-4">
          {error ? (
            <ErrorBlock
              message="Failed to load yield pools - check your connection."
              onRetry={refetch}
            />
          ) : (
            <p className="text-sm text-dim">
              {rows.length === 0
                ? "No yield pool available right now."
                : "This pool isn't listed right now."}
            </p>
          )}
        </Card>
      </div>
    );
  }

  const decimals = selected.decimals;
  const walletBal = balanceByKey.get(selected.key) ?? 0n;

  const pos = position.data;
  const venusSuppliedVTokens =
    pos && venusMarket
      ? (pos.supplied.find((i) => i.vToken === venusMarket.vToken)?.amount ??
        0n)
      : 0n;
  const venusSupplied =
    venusMarket && venusSuppliedVTokens > 0n
      ? vTokensToUnderlying(venusSuppliedVTokens, venusMarket.exchangeRate)
      : 0n;

  const nativeFeeBnb =
    nativeFeeQ.data !== undefined
      ? Number(nativeFeeQ.data) / 1e18
      : null;
  const needsActivation =
    selected.venue === "native" &&
    (!isConnected ||
      (nativeStatusQ.data !== undefined && !nativeStatusQ.data.found));

  const posLoading = isConnected && position.isLoading;
  const posFailed = isConnected && position.isError;
  const walletBalStat = !isConnected
    ? "-"
    : balanceQ.isLoading
      ? "…"
      : balanceQ.isError
        ? "-"
        : formatUnits(walletBal, decimals, 4);
  const availableValue =
    !isConnected
      ? "-"
      : posLoading
        ? "…"
        : posFailed
          ? "-"
          : `${formatUnits(venusSupplied, decimals, 4)} ${selected.symbol}`;

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <ContextStat
          label={selected.apyNote}
          value={
            selected.apy === null
              ? "-"
              : `${fmtNumTrim(selected.apy * 100, 2)}%`
          }
          tip={
            selected.venue === "venus"
              ? "Live annualized supply rate paid by the lending market. It moves with utilization, so it is not a fixed promise."
              : selected.apyNote === "No projected yield"
                ? "The pool currently projects no distribution for this asset."
                : "Latest pool distribution annualized. It moves with pool performance, so it is not a fixed promise."
          }
        />
        <ContextStat
          label="TVL"
          value={fmtUsdCompact(selected.tvlUsd)}
          tip="Total value deposited in this pool across all users."
        />
        <ContextStat
          label="In wallet"
          value={walletBalStat}
        />
      </div>

      <Card className="mt-4 p-4">
        <h2 className="text-sm font-semibold text-fg">Pool details</h2>
        <p className="mt-1 text-xs leading-relaxed text-dim">
          {DESCS[selected.venue]}
        </p>
        <div className="mt-2">
          {selected.venue === "venus" ? (
            <>
              <InfoRow
                label="Venue"
                value={
                  <span className="inline-flex items-center gap-2">
                    <VenueLogo venue="venus" size={18} />
                    Venus Core Pool
                  </span>
                }
              />
              <InfoRow
                label="Rate basis"
                value="Live per-block supply rate"
                sub="accrues every block, withdraw anytime"
              />
              <InfoRow
                label="Available"
                value={availableValue}
                sub={
                  isConnected && posFailed ? "failed to load" : "supplied by you"
                }
              />
              {posFailed ? (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-down/30 bg-down/10 px-3 py-2.5 text-xs text-down">
                  <span>Your Venus position failed to load.</span>
                  <button
                    type="button"
                    onClick={() => void position.refetch()}
                    className="shrink-0 font-medium text-fg underline-offset-2 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <InfoRow
                label="Venue"
                value={
                  <span className="inline-flex items-center gap-2">
                    <VenueLogo venue="native" size={18} />
                    Native Pool
                  </span>
                }
              />
              <InfoRow
                label="Minimum deposit"
                value={`$${NATIVE_MIN_DEPOSIT_USD}`}
              />
              <InfoRow
                label="Settlement"
                value="8-decimal grid"
                sub="amounts round down to the pool's precision"
              />
              {needsActivation ? (
                <InfoRow
                  label="One-time activation"
                  value={
                    nativeFeeBnb !== null
                      ? `≈ ${fmtNumTrim(nativeFeeBnb, 3)} BNB`
                      : "≈ $1 in BNB"
                  }
                  sub="first deposit only, sent with the transaction"
                />
              ) : null}
              <InfoRow
                label="Credit time"
                value="Usually a few minutes"
                sub="after Native's settlement cycle"
              />
              <InfoRow
                label="Withdrawal"
                value="On Native's app"
                sub="scheduled, or instant with a fee"
              />
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
