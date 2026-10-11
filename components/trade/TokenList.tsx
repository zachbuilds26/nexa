"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Stock } from "@/lib/rwa";
import type { SpotTicker } from "@/lib/spot";
import { useH1Changes, useMCaps, useTickers } from "@/hooks/useRwa";
import { fmtSignedPct, fmtUsd, fmtUsdCompact } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { TokenImage } from "@/components/ui/TokenImage";
import { ColPager, windowVisible } from "@/components/ui/ColPager";

const SKELETON_ROWS = 10;
const STOCK_PAGES = 4;

function ValueSkeleton() {
  return <Skeleton className="ml-auto h-4 w-16" />;
}

function TokenRow({
  stock,
  index,
  ticker,
  tickersLoading,
  mcap,
  h1,
  colPage,
  selected,
  onSelect,
}: {
  stock: Stock;
  index: number;
  ticker?: SpotTicker;
  tickersLoading: boolean;
  mcap?: string | null;
  h1?: number | null;
  colPage: number;
  selected: boolean;
  onSelect: (s: Stock) => void;
}) {
  const px = ticker ? Number(ticker.price) : null;
  const chg = ticker ? Number(ticker.chgPct) : null;
  const vol = ticker ? Number(ticker.quoteVolume) : null;
  const v0 = windowVisible(0, colPage) ? "" : "hidden ";
  const v1 = windowVisible(1, colPage) ? "" : "hidden ";
  const v2 = windowVisible(2, colPage) ? "" : "hidden ";
  const v3 = windowVisible(3, colPage) ? "" : "hidden ";
  const v4 = windowVisible(4, colPage) ? "" : "hidden ";

  return (
    <tr
      onClick={() => onSelect(stock)}
      className={`group h-11 cursor-pointer transition-colors hover:bg-fill md:h-16 ${
        selected ? "bg-fill" : ""
      }`}
    >
      <td className="tnum px-3 text-xs text-dim md:px-4">{index}</td>
      <td className="px-3 md:px-4">
        <div className="flex items-center gap-3">
          <TokenImage address={stock.contractAddress} symbol={stock.symbol} size={28} />
          <div>
            <div className="text-sm font-semibold text-fg transition-colors group-hover:text-accent">
              {stock.symbol}
            </div>
            <div className="text-xs text-dim">{stock.ticker}</div>
          </div>
        </div>
      </td>
      <td className={`${v0}px-3 text-right sm:table-cell md:px-4`}>
        {!ticker && tickersLoading ? (
          <ValueSkeleton />
        ) : (
          <span className="tnum text-sm font-medium text-fg">
            {px !== null && Number.isFinite(px) ? fmtUsd(px) : "-"}
          </span>
        )}
      </td>
      <td className={`${v1}px-3 text-right sm:table-cell md:px-4`}>
        {h1 === undefined ? (
          <ValueSkeleton />
        ) : (
          <span
            className={`tnum text-sm ${
              h1 === null || !Number.isFinite(h1)
                ? "text-dim"
                : h1 >= 0
                  ? "text-up"
                  : "text-down"
            }`}
          >
            {fmtSignedPct(h1 !== null && Number.isFinite(h1) ? h1 : null)}
          </span>
        )}
      </td>
      <td className={`${v2}px-3 text-right sm:table-cell md:px-4`}>
        {!ticker && tickersLoading ? (
          <ValueSkeleton />
        ) : (
          <span
            className={`tnum text-sm ${
              chg === null || !Number.isFinite(chg)
                ? "text-dim"
                : chg >= 0
                  ? "text-up"
                  : "text-down"
            }`}
          >
            {fmtSignedPct(chg !== null && Number.isFinite(chg) ? chg : null)}
          </span>
        )}
      </td>
      <td className={`${v3}px-3 text-right sm:table-cell md:px-4`}>
        {mcap === undefined ? (
          <ValueSkeleton />
        ) : (
          <span className="tnum text-sm text-fg">
            {mcap !== null && Number.isFinite(Number(mcap))
              ? fmtUsdCompact(Number(mcap))
              : "-"}
          </span>
        )}
      </td>
      <td className={`${v4}px-3 text-right sm:table-cell md:px-4`}>
        {!ticker && tickersLoading ? (
          <ValueSkeleton />
        ) : (
          <span className="tnum text-sm text-fg">
            {vol !== null && Number.isFinite(vol) ? fmtUsdCompact(vol) : "-"}
          </span>
        )}
      </td>
    </tr>
  );
}

function SkeletonRow({ colPage }: { colPage: number }) {
  const v0 = windowVisible(0, colPage) ? "" : "hidden ";
  const v1 = windowVisible(1, colPage) ? "" : "hidden ";
  const v2 = windowVisible(2, colPage) ? "" : "hidden ";
  const v3 = windowVisible(3, colPage) ? "" : "hidden ";
  const v4 = windowVisible(4, colPage) ? "" : "hidden ";
  return (
    <tr className="h-11 md:h-16">
      <td className="px-3 md:px-4">
        <Skeleton className="h-3.5 w-5" />
      </td>
      <td className="px-3 md:px-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3.5 w-10" />
          </div>
        </div>
      </td>
      <td className={`${v0}px-3 text-right sm:table-cell md:px-4`}>
        <ValueSkeleton />
      </td>
      <td className={`${v1}px-3 text-right sm:table-cell md:px-4`}>
        <ValueSkeleton />
      </td>
      <td className={`${v2}px-3 text-right sm:table-cell md:px-4`}>
        <ValueSkeleton />
      </td>
      <td className={`${v3}px-3 text-right sm:table-cell md:px-4`}>
        <Skeleton className="ml-auto h-4 w-16" />
      </td>
      <td className={`${v4}px-3 text-right sm:table-cell md:px-4`}>
        <Skeleton className="ml-auto h-4 w-16" />
      </td>
    </tr>
  );
}

/**
 * Fixed-card token list: the card frame never moves, the header row sticks to
 * the top of the card, and the full universe scrolls/swipes inside it. No
 * pagination, no prev/next - every row lives in this one card. The scroller is
 * capped at a deterministic row count (10 on mobile, 5 on md+) so the first
 * view always shows exactly that many rows, choice-style.
 */
export function TokenList({
  tokens,
  loading = false,
  selectedAddress,
  onSelect,
}: {
  tokens?: Stock[];
  loading?: boolean;
  selectedAddress?: string;
  onSelect?: (s: Stock) => void;
}) {
  const [q, setQ] = useState("");
  const [colPage, setColPage] = useState(0);
  const tickers = useTickers();
  const rows = useMemo(() => tokens ?? [], [tokens]);
  const query = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!query) return rows;
    return rows.filter(
      (t) =>
        t.symbol.toLowerCase().includes(query) ||
        t.ticker.toLowerCase().includes(query) ||
        t.contractAddress.toLowerCase().includes(query),
    );
  }, [rows, query]);
  const tMap = tickers.data;
  const tickersLoading = tickers.isLoading || (!tMap && !tickers.isError);
  const mcapAddrs = useMemo(
    () => filtered.map((t) => t.contractAddress),
    [filtered],
  );
  const mcaps = useMCaps(mcapAddrs);
  const h1s = useH1Changes(mcapAddrs);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">
          Token universe
          {loading ? (
            <Skeleton className="ml-2 inline-block h-4 w-16 align-middle" />
          ) : query ? (
            <span className="ml-2 text-xs font-normal text-dim">
              {filtered.length} {filtered.length === 1 ? "match" : "matches"}
            </span>
          ) : (
            <span className="ml-2 text-xs text-dim">{rows.length} bStocks</span>
          )}
          {tickers.isError ? (
            <button
              type="button"
              onClick={() => void tickers.refetch()}
              className="ml-3 text-xs font-normal text-down underline"
            >
              prices unavailable - retry
            </button>
          ) : null}
        </h2>
        <div className="flex w-full items-center gap-2 rounded-lg bg-surface-4 px-3 sm:w-64">
          <Search className="h-4 w-4 shrink-0 text-dim" strokeWidth={1.7} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search symbol or 0x address…"
            className="h-9 w-full min-w-0 bg-transparent text-sm text-fg outline-none placeholder:text-dim/60"
          />
          {q ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQ("")}
              className="shrink-0 text-dim transition-colors hover:text-accent"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.7} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative">
      <div className="max-h-[260px] overflow-y-auto overscroll-contain md:max-h-[360px]">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-dim">
              <th className="sticky top-0 z-10 bg-surface-3 px-3 h-10 font-medium shadow-[0_1px_0_0_var(--color-line)] md:px-4">
                #
              </th>
              <th className="sticky top-0 z-10 bg-surface-3 px-3 h-10 font-medium shadow-[0_1px_0_0_var(--color-line)] md:px-4">
                Stock
              </th>
              <th className={`sticky top-0 z-10 bg-surface-3 px-3 h-10 text-right font-medium shadow-[0_1px_0_0_var(--color-line)] md:px-4 ${windowVisible(0, colPage) ? "" : "hidden sm:table-cell"}`}>
                Price
              </th>
              <th className={`sticky top-0 z-10 bg-surface-3 px-3 h-10 text-right font-medium shadow-[0_1px_0_0_var(--color-line)] md:px-4 ${windowVisible(1, colPage) ? "" : "hidden sm:table-cell"}`}>
                1h
              </th>
              <th className={`sticky top-0 z-10 bg-surface-3 px-3 h-10 text-right font-medium shadow-[0_1px_0_0_var(--color-line)] md:px-4 ${windowVisible(2, colPage) ? "" : "hidden sm:table-cell"}`}>
                24h
              </th>
              <th className={`sticky top-0 z-10 bg-surface-3 px-3 h-10 text-right font-medium shadow-[0_1px_0_0_var(--color-line)] md:px-4 ${windowVisible(3, colPage) ? "" : "hidden sm:table-cell"}`}>
                Market cap
              </th>
              <th className={`sticky top-0 z-10 bg-surface-3 px-3 h-10 text-right font-medium shadow-[0_1px_0_0_var(--color-line)] md:px-4 ${windowVisible(4, colPage) ? "" : "hidden sm:table-cell"}`}>
                Volume
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <SkeletonRow key={i} colPage={colPage} />
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 md:px-4 text-center text-sm text-dim">
                  {query ? (
                    <>
                      No stock matches “<span className="tnum text-fg">{q.trim()}</span>”.
                    </>
                  ) : (
                    "No tokens in the universe yet."
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((t, i) => (
                <TokenRow
                  key={t.contractAddress}
                  stock={t}
                  index={i + 1}
                  ticker={t.cs ? tMap?.[t.cs] : undefined}
                  tickersLoading={tickersLoading}
                  mcap={
                    t.contractAddress in mcaps
                      ? mcaps[t.contractAddress]
                      : undefined
                  }
                  h1={
                    t.contractAddress in h1s
                      ? h1s[t.contractAddress]
                      : undefined
                  }
                  colPage={colPage}
                  selected={t.contractAddress === selectedAddress}
                  onSelect={onSelect ?? (() => {})}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      <ColPager page={colPage} pages={STOCK_PAGES} onPage={setColPage} />
      </div>
    </div>
  );
}
