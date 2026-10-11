"use client";

import { useMemo } from "react";
import { Flame } from "lucide-react";
import { TokenImage } from "@/components/ui/TokenImage";
import { InfoTip } from "@/components/ui/InfoTip";
import { Freshness } from "@/components/ui/Freshness";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTickers, useUniverse } from "@/hooks/useRwa";
import { fmtSignedPct } from "@/lib/format";
import type { Stock } from "@/lib/rwa";

type HotItem = { stock: Stock; chg: number | null };

export function HotTape() {
  const universe = useUniverse();
  const tickers = useTickers();

  const hot = useMemo<HotItem[] | null>(() => {
    const stocks = universe.data;
    const t = tickers.data;
    if (!stocks || !t) return null;
    return stocks
      .filter((s) => s.cs && t[s.cs])
      .map((s) => {
        const ticker = t[s.cs!];
        return {
          stock: s,
          chg: Number(ticker.chgPct),
          vol: Number(ticker.quoteVolume),
        };
      })
      .sort((a, b) => b.vol - a.vol)
      .slice(0, 10)
      .map(({ stock, chg }) => ({ stock, chg }));
  }, [universe.data, tickers.data]);

  if (universe.isError || tickers.isError) return null;

  const loading = hot === null || universe.isLoading || tickers.isLoading;
  const items = hot ?? [];

  return (
    <div className="mb-4 flex h-11 items-center rounded-xl border border-line bg-surface-3">
      <span className="flex h-full shrink-0 items-center gap-1.5 border-r border-line px-3 text-sm font-semibold text-accent sm:px-4">
        <Flame className="h-4 w-4" strokeWidth={1.7} />
        Hot
        <InfoTip text="Top 10 bStocks by 24h trading volume, refreshed live." />
        <Freshness
          at={tickers.dataUpdatedAt || undefined}
          className="hidden font-normal text-dim sm:inline"
        />
      </span>

      <div className="min-w-0 flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-7 overflow-hidden px-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex shrink-0 items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-3.5 w-10" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex w-max animate-[hot-tape_45s_linear_infinite] items-center gap-7 px-4 hover:[animation-play-state:paused] motion-reduce:animate-none">
            {[...items, ...items].map((item, i) => (
              <span
                key={`${item.stock.contractAddress}-${i}`}
                className="flex shrink-0 items-center gap-2 text-sm"
              >
                <TokenImage
                  address={item.stock.contractAddress}
                  symbol={item.stock.symbol}
                  size={20}
                />
                <span className="font-medium text-fg">
                  {item.stock.symbol}
                </span>
                <span
                  className={`tnum text-xs ${
                    item.chg === null || !Number.isFinite(item.chg)
                      ? "text-dim"
                      : item.chg >= 0
                        ? "text-up"
                        : "text-down"
                  }`}
                >
                  {fmtSignedPct(item.chg !== null && Number.isFinite(item.chg) ? item.chg : null)}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
