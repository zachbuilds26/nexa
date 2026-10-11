"use client";

import { Suspense, use, useRef, useState } from "react";
import { ArrowLeftRight, ChartCandlestick } from "lucide-react";
import { SwapCard } from "@/components/trade/SwapCard";
import { AmbientTokens } from "@/components/trade/AmbientTokens";
import { PageFallback } from "@/components/ui/PageFallback";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { StockChartCard, type RangeKey } from "@/components/stock/StockChartCard";
import { useUniverse } from "@/hooks/useRwa";
import type { Stock } from "@/lib/rwa";

const EMPTY_PARAMS: Promise<{ [key: string]: string | string[] | undefined }> =
  Promise.resolve({});

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export default function TradePage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={<PageFallback />}>
      <TradeInner {...props} />
    </Suspense>
  );
}

function TradeInner({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = use(searchParams ?? EMPTY_PARAMS);
  const universe = useUniverse();
  const [picked, setPicked] = useState<Stock | undefined>(undefined);
  const [range, setRange] = useState<RangeKey>("24h");
  const [panel, setPanel] = useState<"swap" | "chart">("swap");
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
      <Skeleton className="h-10 w-44" />
      <Skeleton className="mt-4 h-[260px] w-full" />
    </div>
  );

  const panelTabs = (
    <SegmentedTabs
      ariaLabel="Swap or chart"
      className="mx-auto"
      value={panel}
      onChange={setPanel}
      tabs={[
        { key: "swap", label: "Swap", icon: ArrowLeftRight },
        { key: "chart", label: "Chart", icon: ChartCandlestick },
      ]}
    />
  );

  return (
    <div className="relative mx-auto w-full max-w-[1200px] px-4 pb-6 pt-3 lg:px-8 lg:pt-6">
      {panel === "swap" ? <AmbientTokens stocks={universe.data} /> : null}
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
          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
            <div className="hidden min-w-0 lg:block">{swapCard}</div>
            <div className="min-w-0">{chartPanel}</div>
          </div>
        )}
      </div>
    </div>
  );
}
