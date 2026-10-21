"use client";

import { Suspense, use, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink } from "lucide-react";
import { PageFallback } from "@/components/ui/PageFallback";
import { DotsBackdrop } from "@/components/ui/DotsBackdrop";
import { TipLabel } from "@/components/ui/InfoTip";
import { useDynamic, useMarketStatus, useTickers, useUniverse } from "@/hooks/useRwa";
import { fmtUsd, fmtUsdCompact } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { StockHeaderCard } from "@/components/stock/StockHeaderCard";
import { StockChartCard, type RangeKey } from "@/components/stock/StockChartCard";

function DetailRow({
  label,
  value,
  tip,
}: {
  label: string;
  value: ReactNode;
  tip?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line py-2.5 text-sm first:border-t-0">
      <span className="flex items-center gap-1 text-dim">
        <TipLabel label={label} text={tip} />
      </span>
      <span className="tnum text-right text-fg">{value}</span>
    </div>
  );
}

function StatCell({
  label,
  value,
  loading = false,
  tip,
}: {
  label: string;
  value: ReactNode;
  loading?: boolean;
  tip?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-4 p-4">
      <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-dim">
        <TipLabel label={label} text={tip} />
      </div>
      <div className="mt-1.5 tnum text-xl font-semibold text-fg">
        {loading ? <Skeleton className="h-5 w-16" /> : value}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mt-6 space-y-5">
      <div className="min-w-0 space-y-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-8 w-52" />
          <div className="ml-auto flex items-center gap-2.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-4" />
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-xl border border-line bg-surface-3 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Skeleton className="h-10 w-44" />
                <Skeleton className="mt-2 h-4 w-36" />
                <Skeleton className="mt-1.5 h-3.5 w-64" />
              </div>
              <Skeleton className="h-8 w-44" />
            </div>
            <Skeleton className="mt-4 h-[260px] w-full" />
          </div>
          <div className="rounded-xl border border-line bg-surface-3 p-4">
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-1">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="rounded-xl border border-line bg-surface-1 p-3.5">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="mt-2 h-5 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-surface-3 p-4">
          <Skeleton className="mb-4 h-4 w-24" />
          <div className="space-y-3">
            {[0, 1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StockPage(props: {
  params: Promise<{ address: string }>;
}) {
  return (
    <Suspense fallback={<PageFallback />}>
      <StockInner {...props} />
    </Suspense>
  );
}

function StockInner({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const universe = useUniverse();
  const status = useMarketStatus();
  const [copied, setCopied] = useState(false);
  const [range, setRange] = useState<RangeKey>("24h");

  const stock = universe.data?.find(
    (s) => s.contractAddress.toLowerCase() === address.toLowerCase(),
  );
  const dynamic = useDynamic(stock?.contractAddress);
  const tickers = useTickers();

  const d = dynamic.data;
  const onchain = d?.onchainPrice ? Number(d.onchainPrice) : null;
  const spot = stock?.cs ? tickers.data?.[stock.cs] : undefined;
  const vol24 = d?.volume24h
    ? Number(d.volume24h)
    : spot
      ? Number(spot.quoteVolume)
      : null;

  const fund = d?.fundamentals;

  function copyAddr(a: string) {
    void navigator.clipboard.writeText(a);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative">
      <DotsBackdrop />
      <div className="relative mx-auto max-w-[1200px] px-4 py-6 lg:px-8">
      {universe.isError ? (
        <div className="mt-6 rounded-xl border border-line bg-surface-3 p-6 text-sm text-down">
          Failed to load the universe.{" "}
          <button type="button" className="underline" onClick={() => void universe.refetch()}>
            retry
          </button>
        </div>
      ) : universe.isLoading || !universe.data ? (
        <DetailSkeleton />
      ) : !stock ? (
        <div className="mt-6 rounded-xl border border-line bg-surface-3 p-6 text-sm text-dim">
           Token <span className="tnum text-fg">{address}</span> is not in the Nexa
          universe.{" "}
          <Link href="/stocks" className="underline">
            Back to Stocks
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="min-w-0 space-y-5">
            <StockHeaderCard
              stock={stock}
              status={status.data}
              statusError={status.isError}
            />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
              <StockChartCard stock={stock} range={range} onRangeChange={setRange} />

              <div className="rounded-xl border border-line bg-surface-3 p-4">
                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-1">
                  <StatCell
                    label="Price"
                    value={fmtUsd(onchain)}
                    loading={dynamic.isLoading}
                  />
                  <StatCell
                    label="Market cap"
                    tip="Circulating on-chain supply multiplied by the current price."
                    value={
                      fund?.marketCap ? fmtUsdCompact(Number(fund.marketCap)) : "-"
                    }
                    loading={dynamic.isLoading && !fund}
                  />
                  <StatCell
                    label="Holders"
                    tip="Unique wallets currently holding this token."
                    value={
                      fund?.holders
                        ? Number(fund.holders).toLocaleString("en-US")
                        : "-"
                    }
                    loading={dynamic.isLoading && !fund}
                  />
                  <StatCell
                    label="Volume 24h"
                    value={
                      vol24 !== null && Number.isFinite(vol24)
                        ? fmtUsdCompact(vol24)
                        : "-"
                    }
                    loading={
                      dynamic.isLoading && !d?.volume24h && tickers.isLoading
                    }
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface-3 p-4">
              <h2 className="mb-2 text-sm font-semibold text-fg">Contract</h2>
              <DetailRow
                label="Address"
                value={
                  <span className="inline-flex items-center gap-2">
                    <span className="tnum">
                      {stock.contractAddress.slice(0, 10)}…
                      {stock.contractAddress.slice(-6)}
                    </span>
                    <button
                      type="button"
                      aria-label="Copy contract address"
                      onClick={() => copyAddr(stock.contractAddress)}
                      className={`transition-colors ${
                        copied ? "text-accent" : "text-dim hover:text-accent"
                      }`}
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={1.7} />
                      ) : (
                        <Copy className="h-3.5 w-3.5" strokeWidth={1.7} />
                      )}
                    </button>
                    <a
                      href={`https://bscscan.com/token/${stock.contractAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="View on BscScan"
                      className="text-dim transition-colors hover:text-accent"
                    >
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.7} />
                    </a>
                  </span>
                }
              />
              <DetailRow label="Network" value="BNB Smart Chain (BSC)" />
              <DetailRow label="Chain ID" value="56" />
              <DetailRow label="Decimals" value={stock.decimals} />
              <DetailRow
                label="Shares per token"
                tip="Shares backing one token. It grows automatically whenever dividends are applied on-chain, so your balance rises without a claim."
                value={
                  d?.sharesMultiplier
                    ? `${Number(d.sharesMultiplier).toFixed(6)} shares`
                    : "-"
                }
              />
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
