"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery, useQueries } from "@tanstack/react-query";
import {
  useBalance,
  useConnection,
  useReadContracts,
} from "wagmi";
import { ArrowUpRight, RotateCcw, TriangleAlert } from "lucide-react";
import { WalletFilled } from "@/components/ui/WalletFilled";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { TokenImage } from "@/components/ui/TokenImage";
import { EmptyBlock, ErrorBlock } from "@/components/ui/StateBlocks";
import { ContextStat, InfoRow } from "@/components/ui/Stats";
import { HealthMeter } from "@/components/borrow/HealthMeter";
import { EarnDepositsCard } from "@/components/earn/EarnDepositsCard";
import { DotsBackdrop } from "@/components/ui/DotsBackdrop";
import { ERC20_ABI, USDT_BSC, USDC_BSC, WBNB_BSC } from "@/lib/erc20";
import { fetchBnbUsdPrice } from "@/lib/native";
import { fmtUsd, formatUnits, unitsToNumber } from "@/lib/format";
import { fetchDynamic, useUniverse } from "@/hooks/useRwa";
import { useVenusMarkets, useVenusPosition } from "@/hooks/useVenus";
import { useEarnData } from "@/hooks/useEarn";

type WalletRow = {
  key: string;
  address: string | undefined;
  symbol: string;
  ticker: string;
  decimals: number;
  amount: bigint;
  priceUsd: number | null;
};

export function PortfolioView() {
  const { address, isConnected } = useConnection();

  const universe = useUniverse();
  const venus = useVenusMarkets();
  const position = useVenusPosition(address, venus.data, venus.dataUpdatedAt);
  const earn = useEarnData();

  const balanceContracts = useMemo(() => {
    if (!address || !universe.data) return [];
    return [
      ...universe.data.map((s) => ({
        address: s.contractAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf" as const,
        args: [address] as const,
      })),
      { address: USDT_BSC, abi: ERC20_ABI, functionName: "balanceOf" as const, args: [address] as const },
      { address: USDC_BSC, abi: ERC20_ABI, functionName: "balanceOf" as const, args: [address] as const },
    ];
  }, [address, universe.data]);
  const balanceRead = useReadContracts({
    contracts: balanceContracts,
    query: {
      enabled: balanceContracts.length > 0,
      // ~90 tokens in one multicall - 15s/30s keeps the page fresh without
      // re-running the full-universe read every 15s.
      staleTime: 15_000,
      refetchInterval: isConnected ? 30_000 : false,
    },
  });

  const held = useMemo(() => {
    const out: Array<{
      address: string;
      symbol: string;
      ticker: string;
      decimals: number;
      amount: bigint;
    }> = [];
    const results = balanceRead.data ?? [];
    const stocks = universe.data ?? [];
    stocks.forEach((s, i) => {
      const res = results[i]?.result;
      if (typeof res === "bigint" && res > 0n) {
        out.push({
          address: s.contractAddress,
          symbol: s.symbol,
          ticker: s.ticker,
          decimals: s.decimals,
          amount: res,
        });
      }
    });
    const stableHits = [
      { address: USDT_BSC, symbol: "USDT", ticker: "Tether USD" },
      { address: USDC_BSC, symbol: "USDC", ticker: "USD Coin" },
    ];
    stableHits.forEach((st, j) => {
      const res = results[stocks.length + j]?.result;
      if (typeof res === "bigint" && res > 0n) {
        out.push({ ...st, decimals: 18, amount: res });
      }
    });
    return out;
  }, [balanceRead.data, universe.data]);

  const heldStockAddrs = useMemo(
    () =>
      held
        .filter((h) => h.symbol !== "USDT" && h.symbol !== "USDC")
        .map((h) => h.address),
    [held],
  );
  const priceQueries = useQueries({
    queries: heldStockAddrs.map((addr) => ({
      queryKey: ["rwa-dynamic", addr] as const,
      queryFn: () => fetchDynamic(addr),
      staleTime: 15_000,
      refetchInterval: 30_000,
    })),
  });
  const stockPrices = useMemo(() => {
    const m = new Map<string, number>();
    heldStockAddrs.forEach((addr, i) => {
      const d = priceQueries[i]?.data;
      if (d?.onchainPrice) {
        const v = Number(d.onchainPrice);
        if (Number.isFinite(v)) m.set(addr.toLowerCase(), v);
      }
    });
    return m;
  }, [heldStockAddrs, priceQueries]);

  const bnb = useBalance({ address, query: { enabled: Boolean(address) } });
  const bnbPriceQ = useQuery({
    queryKey: ["native-mark-bnb"],
    queryFn: fetchBnbUsdPrice,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const walletRows: WalletRow[] = useMemo(() => {
    const rows: WalletRow[] = held.map((h) => ({
      key: h.address,
      address: h.address,
      symbol: h.symbol,
      ticker: h.ticker,
      decimals: h.decimals,
      amount: h.amount,
      priceUsd:
        h.symbol === "USDT" || h.symbol === "USDC"
          ? 1
          : stockPrices.get(h.address.toLowerCase()) ?? null,
    }));
    const bnbBal = bnb.data?.value;
    if (typeof bnbBal === "bigint" && bnbBal > 0n) {
      rows.push({
        key: "bnb",
        address: WBNB_BSC,
        symbol: "BNB",
        ticker: "Gas token",
        decimals: 18,
        amount: bnbBal,
        priceUsd: bnbPriceQ.data ?? null,
      });
    }
    return rows;
  }, [held, stockPrices, bnb.data, bnbPriceQ.data]);

  const walletUsd = walletRows.reduce(
    (s, r) =>
      r.priceUsd !== null
        ? s + unitsToNumber(r.amount, r.decimals) * r.priceUsd
        : s,
    0,
  );

  const pos = position.data;
  const suppliedUsd = pos?.suppliedUsd ?? 0;
  const debtUsd = pos?.borrowUsd ?? 0;
  const earnUsd = earn.earnUsd;
  const netWorth = walletUsd + suppliedUsd - debtUsd + earnUsd;

  const hasBnb = typeof bnb.data?.value === "bigint" && bnb.data.value > 0n;
  const pricesLoading =
    priceQueries.some((q) => q.isLoading) || (hasBnb && bnbPriceQ.isLoading);
  const pricesFailed =
    priceQueries.some((q) => q.isError) || (hasBnb && bnbPriceQ.isError);

  const walletFailed =
    balanceRead.isError || universe.isError || bnb.isError || pricesFailed;
  const borrowFailed = venus.isError || position.isError;
  const earnFailed = earn.hasError;
  const anyFailed = walletFailed || borrowFailed || earnFailed;
  const hasUnpriced =
    isConnected &&
    (walletRows.some((r) => r.priceUsd === null) || earn.hasUnpriced);

  function retryWallet() {
    void balanceRead.refetch();
    void universe.refetch();
    void bnb.refetch();
    priceQueries.forEach((q) => void q.refetch());
    void bnbPriceQ.refetch();
  }
  function retryBorrow() {
    void venus.refetch();
    void position.refetch();
  }

  const loadingAny =
    Boolean(isConnected) &&
    (balanceRead.isLoading ||
      universe.isLoading ||
      bnb.isLoading ||
      position.isLoading ||
      earn.isLoading ||
      pricesLoading);
  const stat = (v: number, failed = false) =>
    isConnected && !loadingAny && !failed ? fmtUsd(v) : "-";

  const walletLoading =
    isConnected &&
    (universe.isLoading || balanceRead.isLoading || bnb.isLoading || pricesLoading);
  const borrowLoading = isConnected && (venus.isLoading || position.isLoading);
  const hasBorrow = Boolean(pos && (pos.supplied.length > 0 || pos.borrowed.length > 0));

  return (
    <div className="relative">
      <DotsBackdrop />
      <div className="relative mx-auto max-w-[1200px] px-4 py-6 lg:px-8">
      <div className="mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Portfolio</h1>
          <p className="mt-1 max-w-2xl text-sm text-dim">
              Wallet balances, borrow position, and earn deposits: net worth in one
              view.
          </p>
        </div>
      </div>

      {/* Net worth strip */}
      <Card className="mb-6 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ContextStat
            label="Net worth"
            value={stat(netWorth, anyFailed)}
            tip="Wallet balance plus supplied collateral, minus debt, plus earn deposits."
          />
          <ContextStat
            label="Supplied"
            value={stat(suppliedUsd, borrowFailed)}
            tip="Value of the assets you have supplied as collateral on Venus."
          />
          <ContextStat
            label="Debt"
            value={stat(debtUsd, borrowFailed)}
            tip="Total borrowed against your collateral, growing with the borrow APR."
          />
          <ContextStat
            label="Earning"
            value={stat(earnUsd, earnFailed)}
            tip="Value currently deposited in the earn pools."
          />
        </div>
        {isConnected && loadingAny ? null : isConnected && (anyFailed || hasUnpriced) ? (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-xs text-warn">
            <span>
                Some balances or prices are unavailable. Totals above show
                only what answered.
            </span>
            <button
              type="button"
              onClick={() => {
                retryWallet();
                retryBorrow();
                earn.refetch();
              }}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-fill"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.7} />
              Retry
            </button>
          </div>
        ) : (
          <p className="mt-3 border-t border-line pt-3 text-xs text-dim">
            Wallet {fmtUsd(walletUsd)} · supplied {fmtUsd(suppliedUsd)} · debt{" "}
            {fmtUsd(debtUsd)} · earning {fmtUsd(earnUsd)}
          </p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Wallet balances */}
        <Card className="flex flex-col p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg">Wallet balances</h2>
            <span className="text-xs text-dim">BSC</span>
          </div>
          {!isConnected ? (
            <EmptyBlock message="Connect wallet to see your balances." />
          ) : walletLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : walletFailed ? (
            <ErrorBlock
              message="Failed to read token balances or prices."
              onRetry={retryWallet}
            />
          ) : walletRows.length > 0 ? (
            <div className="min-h-0 flex-1 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-dim">
                    <th className="px-4 pb-2 font-medium">Token</th>
                    <th className="px-4 pb-2 text-right font-medium">Balance</th>
                    <th className="hidden px-4 pb-2 text-right font-medium sm:table-cell">
                      Price
                    </th>
                    <th className="px-4 pb-2 text-right font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {walletRows.map((r) => (
                    <tr key={r.key} className="border-t border-line">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <TokenImage
                            address={r.address}
                            symbol={r.symbol}
                            size={32}
                            className="ring-2 ring-surface-3"
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-fg">
                              {r.symbol}
                            </div>
                            <div className="truncate text-xs text-dim">{r.ticker}</div>
                          </div>
                        </div>
                      </td>
                      <td className="tnum px-4 py-3 text-right text-sm text-fg">
                        {formatUnits(r.amount, r.decimals, 4)}
                      </td>
                      <td className="tnum hidden px-4 py-3 text-right text-sm text-dim sm:table-cell">
                        {r.priceUsd !== null ? fmtUsd(r.priceUsd) : "-"}
                      </td>
                      <td className="tnum px-4 py-3 text-right text-sm font-medium text-fg">
                        {r.priceUsd !== null
                          ? fmtUsd(unitsToNumber(r.amount, r.decimals) * r.priceUsd)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-dim">
              No token balances yet.{" "}
              <Link href="/trade/swap" className="text-accent hover:underline">
                Trade a bStock
              </Link>{" "}
              to get started.
            </div>
          )}
        </Card>

        {/* Borrow position */}
        <Card className="flex flex-col p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg">Borrow position</h2>
            <Link
              href="/borrow/markets"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              Manage
              <ArrowUpRight className="h-3 w-3" strokeWidth={1.7} />
            </Link>
          </div>
          {!isConnected ? (
            <EmptyBlock message="Connect wallet to see your borrow position." />
          ) : borrowLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : borrowFailed ? (
            <ErrorBlock
              message="Failed to read your Venus position."
              onRetry={retryBorrow}
            />
          ) : hasBorrow && pos ? (
            <>
              <HealthMeter hf={pos.healthFactor} className="mb-4" />
              {pos.shortfallUsd > 0 ? (
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-down/30 bg-down/10 p-3 text-xs text-down">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                  <span>
                      Health factor below 1.00. This position can be liquidated.
                      Repay or supply more collateral immediately.
                  </span>
                </div>
              ) : pos.healthFactor !== null && pos.healthFactor < 1.5 ? (
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs text-warn">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                  <span>
                      Health factor below 1.50. Consider repaying or adding collateral.
                  </span>
                </div>
              ) : null}
              <InfoRow
                label="Collateral supplied"
                value={fmtUsd(pos.suppliedUsd)}
                sub={pos.supplied
                  .map(
                    (i) =>
                      `${formatUnits(i.amount, i.underlyingDecimals, 4)} ${i.underlyingSymbol}`,
                  )
                  .join(" · ")}
              />
              <InfoRow
                label="Borrowed"
                value={fmtUsd(pos.borrowUsd)}
                sub={pos.borrowed
                  .map(
                    (i) =>
                      `${formatUnits(i.amount, i.underlyingDecimals, 4)} ${i.underlyingSymbol}`,
                  )
                  .join(" · ")}
              />
              <InfoRow
                label="Borrow power"
                value={fmtUsd(pos.liquidityUsd)}
                sub="available to borrow now"
                tip="How much you can still borrow against your collateral right now."
              />
            </>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-dim">
                No borrow position.{" "}
              <Link href="/borrow/markets" className="text-accent hover:underline">
                supply a bStock as collateral
              </Link>
              .
            </div>
          )}
        </Card>
      </div>

      <EarnDepositsCard className="mt-6" />

      {!isConnected ? (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-line bg-fill p-4 text-xs leading-relaxed text-dim">
          <WalletFilled className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            Everything above reads straight from the chain for your connected
              wallet. Nexa keeps no account and no balance ledger.
          </span>
        </div>
      ) : null}
      </div>
    </div>
  );
}
