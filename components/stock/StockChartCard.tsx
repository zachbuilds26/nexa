"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { Stock } from "@/lib/rwa";
import { useDynamic, useKline, useMarketStatus, useMeta } from "@/hooks/useRwa";
import { fmtNumTrim, fmtSignedPct, fmtUsd } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { Freshness } from "@/components/ui/Freshness";
import { TokenImage } from "@/components/ui/TokenImage";
import { MarketBadge } from "@/components/trade/MarketBadge";
import { prettyStockName } from "./StockHeaderCard";

// lightweight-charts is the heaviest client dependency and is not needed on
// first paint of /trade (default panel is Swap) - load it on demand.
function ChartSkeleton() {
  return (
    <div
      className="shimmer flex h-full w-full items-center justify-center rounded bg-fill"
      aria-hidden
    >
      {/* Light watermark in the skeleton's grey family - not brand teal, not black. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/nexa-logo.png" alt="" className="h-9 w-auto brightness-0 invert opacity-[0.06]" />
    </div>
  );
}

const StockChart = dynamic(
  () => import("./StockChart").then((m) => m.StockChart),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  },
);

const RANGES = [
  {
    key: "24h",
    label: "24H",
    interval: "1h",
    limit: 24,
  },
  {
    key: "7d",
    label: "7D",
    interval: "4h",
    limit: 42,
  },
  {
    key: "30d",
    label: "30D",
    interval: "1d",
    limit: 30,
  },
] as const;

export type RangeKey = (typeof RANGES)[number]["key"];

function ChangeTriangle({ up }: { up: boolean }) {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor" aria-hidden="true">
      <polygon points={up ? "0.5,7.5 8.5,7.5 4.5,1.5" : "0.5,1.5 8.5,1.5 4.5,7.5"} />
    </svg>
  );
}

export function StockChartCard({
  stock,
  range,
  onRangeChange,
  chartHeight = 260,
  showTitle = false,
}: {
  stock?: Stock;
  range: RangeKey;
  onRangeChange: (r: RangeKey) => void;
  chartHeight?: number;
  /** Renders the stock identity row (logo, name, ticker, market badge) — used on /trade where there is no page header. */
  showTitle?: boolean;
}) {
  const status = useMarketStatus();
  const dynamic = useDynamic(stock?.contractAddress);
  const meta = useMeta(stock?.contractAddress);
  const [copied, setCopied] = useState(false);

  function copyAddr() {
    if (!stock) return;
    void navigator.clipboard.writeText(stock.contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const active = RANGES.find((r) => r.key === range) ?? RANGES[0];
  const kline = useKline(stock?.contractAddress, true, active.interval, active.limit);
  const candles = useMemo(
    () =>
      (kline.data ?? []).map((r) => ({
        time: r[0] / 1000,
        open: Number(r[1]),
        high: Number(r[2]),
        low: Number(r[3]),
        close: Number(r[4]),
      })),
    [kline.data],
  );

  const d = dynamic.data;
  const onchain = d?.onchainPrice ? Number(d.onchainPrice) : null;
  const ref = d?.referencePrice ? Number(d.referencePrice) : null;
  const chg24 = d?.priceChangePct24h ? Number(d.priceChangePct24h) : null;
  // Guard the denominator: a -100% change makes (1 + chg/100) zero, which
  // previously rendered "$-Infinity" via the unguarded division below.
  const prevDenom = chg24 !== null ? 1 + chg24 / 100 : null;
  const prev =
    onchain !== null && prevDenom !== null && prevDenom > 0
      ? onchain / prevDenom
      : null;
  const absChg24 = onchain !== null && prev !== null ? onchain - prev : null;

  // The header change follows the selected range: 24h keeps the live feed
  // value, 7D/30D compare the first candle of the loaded window to the
  // current on-chain price.
  const firstClose = candles[0]?.close ?? null;
  const kChg =
    onchain !== null && firstClose !== null && firstClose !== 0
      ? ((onchain - firstClose) / firstClose) * 100
      : null;
  const kAbs = onchain !== null && firstClose !== null ? onchain - firstClose : null;
  const is24 = range === "24h";
  const chg = is24 ? chg24 : kChg;
  const absChg = is24 ? absChg24 : kAbs;
  const changeLoading = !is24 && kline.isLoading;

  const spread =
    ref !== null && onchain !== null && ref !== 0 ? ((onchain - ref) / ref) * 100 : null;

  const dynFailed = dynamic.isError;

  return (
    <div className="flex h-full flex-col rounded-xl border border-line bg-surface-3 p-5">
      {showTitle && stock ? (
        <div className="mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <TokenImage
            address={stock.contractAddress}
            symbol={stock.symbol}
            size={32}
            className="shrink-0"
          />
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-xl font-semibold text-fg">
              {meta.isLoading && !meta.data ? (
                <Skeleton className="inline-block h-6 w-40 align-middle" />
              ) : (
                prettyStockName(meta.data?.name, stock.symbol)
              )}
            </span>
            <span className="shrink-0 text-sm font-medium text-dim">{stock.ticker}</span>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2.5">
            <span className="hidden sm:inline-flex">
              <MarketBadge status={status.data} error={status.isError} />
            </span>
            <button
              type="button"
              aria-label="Copy contract address"
              onClick={copyAddr}
              className={`transition-colors ${
                copied ? "text-accent" : "text-dim hover:text-accent"
              }`}
            >
              {copied ? (
                <Check className="h-4 w-4" strokeWidth={1.7} />
              ) : (
                <Copy className="h-4 w-4" strokeWidth={1.7} />
              )}
            </button>
            <a
              href={`https://bscscan.com/token/${stock.contractAddress}`}
              target="_blank"
              rel="noreferrer"
              aria-label="View on BscScan"
              className="text-dim transition-colors hover:text-accent"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={1.7} />
            </a>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          {dynamic.isLoading ? (
            <Skeleton className="h-10 w-44" />
          ) : dynFailed ? (
            <span className="tnum text-4xl font-semibold text-dim">-</span>
          ) : (
            <>
              <div className="tnum text-4xl font-semibold text-fg">
                {fmtUsd(onchain)}
              </div>
              {changeLoading ? (
                <div className="mt-1 text-sm font-semibold text-dim">
                  <span className="tnum">…</span>
                </div>
              ) : (
                <div
                  className={`mt-1 flex items-center gap-1.5 text-sm font-semibold ${
                    chg === null
                      ? "text-dim"
                      : chg >= 0
                        ? "text-up"
                        : "text-down"
                  }`}
                >
                  {chg !== null ? (
                    <ChangeTriangle up={chg >= 0} />
                  ) : null}
                  <span className="tnum">
                    {absChg !== null
                      ? `${absChg >= 0 ? "+" : "-"}${fmtUsd(Math.abs(absChg))} `
                      : ""}
                    ({fmtSignedPct(chg)})
                  </span>
                </div>
              )}
            </>
          )}
          <div className="mt-1 text-xs text-dim">
            {dynFailed ? (
              <span className="flex flex-wrap items-center gap-2">
                Price feed failed to load.
                <button
                  type="button"
                  onClick={() => void dynamic.refetch()}
                  className="font-medium text-fg underline-offset-2 hover:underline"
                >
                  Retry
                </button>
              </span>
            ) : ref === null ? (
              status.data?.openState === false ? (
                <>NASDAQ closed · reference frozen</>
              ) : (
                <>Reference price unavailable</>
              )
            ) : (
              <>
                On-chain vs NASDAQ{" "}
                <span className="tnum text-fg">{fmtUsd(ref)}</span>
                {spread !== null ? (
                  <span
                    className={`tnum font-semibold ${
                      spread >= 0 ? "text-up" : "text-down"
                    }`}
                  >
                    {" "}
                    {spread >= 0 ? "+" : ""}
                    {fmtNumTrim(spread, 2)}%
                  </span>
                ) : null}
              </>
            )}
            {!dynFailed ? (
              <>
                {" · "}
                <Freshness at={dynamic.dataUpdatedAt || undefined} />
              </>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => onRangeChange(r.key)}
              aria-pressed={range === r.key}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                range === r.key
                  ? "bg-fill-strong text-fg"
                  : "text-dim hover:text-fg"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4" style={{ height: chartHeight }}>
        {kline.isLoading ? (
          <ChartSkeleton />
        ) : (
          <StockChart
            candles={candles}
            loading={kline.isLoading}
            error={kline.isError}
            onRetry={() => void kline.refetch()}
            timeVisible={range !== "30d"}
            height={chartHeight}
          />
        )}
      </div>
    </div>
  );
}
