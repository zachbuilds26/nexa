"use client";

import { Suspense, use, useRef, useState } from "react";
import { ArrowLeftRight, ChartCandlestick } from "lucide-react";
import { SwapCard } from "@/components/trade/SwapCard";
import { DotsBackdrop } from "@/components/ui/DotsBackdrop";
import { PageFallback } from "@/components/ui/PageFallback";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { StockChartCard, type RangeKey } from "@/components/stock/StockChartCard";
import { useUniverse } from "@/hooks/useRwa";
import type { Stock } from "@/lib/rwa";

const EMPTY_PARAMS: Promise<{ [key: string]: string | string[] | undefined }> =
  Promise.resolve({});

type SearchParams = { [key: string]: string | string[] | undefined };

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function queryString(sp: SearchParams): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value)) for (const v of value) params.append(key, v);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function TradeView({
  panel,
  searchParams,
}: {
  panel: "swap" | "chart";
  searchParams?: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<PageFallback />}>
      <TradeInner panel={panel} searchParams={searchParams} />
    </Suspense>
  );
}

function TradeInner({
  panel,
  searchParams,
}: {
  panel: "swap" | "chart";
  searchParams?: Promise<SearchParams>;
}) {
  const sp = use(searchParams ?? EMPTY_PARAMS);
  const universe = useUniverse();
  const [picked, setPicked] = useState<Stock | undefined>(undefined);
  const [range, setRange] = useState<RangeKey>("24h");
  const urlTouched = useRef(false);

  const handlePick = (s: Stock) => {
    urlTouched.current = true;
    setPicked(s);
  };

  const deepLink = { input: str(sp.input), output: str(sp.output) };
  const stockParam = [deepLink.input, deepLink.output].find(
    (v) => v && /^0x[0-9a-f]{40}$/i.test(v),
  );
  const stock =
    picked ??
    (stockParam
      ? universe.data?.find(
          (s) => s.contractAddress.toLowerCase() === stockParam.toLowerCase(),
        )
      : undefined) ??
    universe.data?.[0];

  const swapCard = (
    <SwapCard
      stock={stock}
      deepLink={deepLink}
      urlTouchedRef={urlTouched}
      onSelectStock={handlePick}
    />
  );

  const chartPanel = stock ? (
    <StockChartCard stock={stock} range={range} onRangeChange={setRange} showTitle />
  ) : (
    <div className="rounded-xl border border-line bg-surface-3 p-5">
      {universe.isPending ? (
        <>
          <Skeleton className="h-10 w-44" />
          <Skeleton className="mt-4 h-[260px] w-full" />
        </>
      ) : (
        <div className="flex min-h-[260px] flex-col items-start justify-center gap-3">
          <p className="text-sm text-dim">
            {universe.isError
              ? "The bStock list could not be loaded."
              : "No bStocks are available right now."}
          </p>
          <button
            type="button"
            onClick={() => void universe.refetch()}
            className="text-sm font-medium text-fg underline-offset-2 hover:underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );

  const qs = queryString(sp);
  const panelTabs = (
    <SegmentedTabs
      ariaLabel="Swap or chart"
      className="mx-auto"
      value={panel}
      hrefs={{ swap: `/trade/swap${qs}`, chart: `/trade/chart${qs}` }}
      tabs={[
        { key: "swap", label: "Swap", icon: ArrowLeftRight },
        { key: "chart", label: "Chart", icon: ChartCandlestick },
      ]}
    />
  );

  return (
    <div className="relative">
      <DotsBackdrop />
      <div className="relative mx-auto w-full max-w-[1200px] px-4 pb-6 pt-3 lg:px-8 lg:pt-6">
        {universe.isError ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-down/30 bg-down/10 px-3 py-2.5 text-xs text-down">
            <span>Failed to load the bStock list.</span>
            <button
              type="button"
              onClick={() => void universe.refetch()}
              className="shrink-0 font-medium text-fg underline-offset-2 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className="space-y-5 lg:mt-6">
          {panelTabs}

          {panel === "swap" ? (
            <div className="mx-auto w-full max-w-[480px]">{swapCard}</div>
          ) : (
            <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
              <div className="min-w-0">{chartPanel}</div>
              {/* Mobile shows one panel at a time (the tab bar switches); desktop pairs chart + swap. */}
              <div className="hidden min-w-0 lg:block">{swapCard}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
