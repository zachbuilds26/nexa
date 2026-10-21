"use client";

import { memo, useMemo, useState } from "react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronsUpDown, Search, X } from "lucide-react";
import type { Stock } from "@/lib/rwa";
import type { SpotTicker } from "@/lib/spot";
import { useH1Changes, useMCaps, useTickers } from "@/hooks/useRwa";
import { fmtUsd, fmtUsdCompact } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { TokenImage } from "@/components/ui/TokenImage";
import { DropArrow } from "@/components/ui/DropArrow";
import { ColPager, windowVisible } from "@/components/ui/ColPager";

const SKELETON_ROWS = 10;
const STOCK_PAGES = 4;
// Module-level stable noop so memoized rows don't get a new prop identity
// every render when no onSelect is provided.
const NOOP_SELECT = () => {};

type SortKey = "price" | "h1" | "chg" | "mcap" | "vol";

/** Sortable header cell: up/down chevrons by default, a direction arrow when active. */
function SortTh({
  label,
  k,
  sort,
  onSort,
  className = "",
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" } | null;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = sort?.key === k;
  const dir = sort?.dir ?? "desc";
  return (
    <th
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={className}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-fg ${
          active ? "text-fg" : "text-dim"
        }`}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUpNarrowWide className="h-3.5 w-3.5 -scale-x-100" strokeWidth={1.7} aria-hidden />
          ) : (
            <ArrowDownWideNarrow className="h-3.5 w-3.5 -scale-x-100" strokeWidth={1.7} aria-hidden />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" strokeWidth={1.7} aria-hidden />
        )}
      </button>
    </th>
  );
}

function ValueSkeleton() {
  return <Skeleton className="ml-auto h-4 w-16" />;
}

/** Green caret up / red caret down + the percent. No plus/minus characters. */
function PctCell({ v }: { v: number | null | undefined }) {
  if (v === null || v === undefined || !Number.isFinite(v)) {
    return <span className="tnum text-sm text-dim">-</span>;
  }
  const up = v >= 0;
  return (
    <span
      className={`tnum inline-flex items-center justify-end gap-1.5 text-sm ${
        up ? "text-up" : "text-down"
      }`}
    >
      <DropArrow open={up} />
      {Math.abs(v).toFixed(2)}%
    </span>
  );
}

// Memoized: the list is up to ~90 rows, and the parent re-renders on every
// search keystroke - rows whose props didn't change (stable stock object,
// primitive cells) skip re-rendering.
const TokenRow = memo(function TokenRow({
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
      data-stock-row
      tabIndex={0}
      onClick={() => onSelect(stock)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(stock);
        }
      }}
      className={`group h-12 cursor-pointer border-t border-line transition-colors hover:bg-fill md:h-14 ${
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
        {h1 === undefined ? <ValueSkeleton /> : <PctCell v={h1} />}
      </td>
      <td className={`${v2}px-3 text-right sm:table-cell md:px-4`}>
        {!ticker && tickersLoading ? <ValueSkeleton /> : <PctCell v={chg} />}
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
});

function SkeletonRow({ colPage }: { colPage: number }) {
  const v0 = windowVisible(0, colPage) ? "" : "hidden ";
  const v1 = windowVisible(1, colPage) ? "" : "hidden ";
  const v2 = windowVisible(2, colPage) ? "" : "hidden ";
  const v3 = windowVisible(3, colPage) ? "" : "hidden ";
  const v4 = windowVisible(4, colPage) ? "" : "hidden ";
  return (
    <tr className="h-12 border-t border-line md:h-14">
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
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
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

  function onSort(k: SortKey) {
    setSort((s) =>
      s && s.key === k
        ? { key: k, dir: s.dir === "desc" ? "asc" : "desc" }
        : { key: k, dir: "desc" },
    );
  }

  // Sorted view of the filtered rows. Fields that are still loading (or
  // missing) always trail, whichever direction is active.
  const viewRows = useMemo(() => {
    if (!sort) return filtered;
    const num = (v: string | number | null | undefined): number | null => {
      if (v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const val = (t: Stock): number | null => {
      if (sort.key === "mcap") {
        return t.contractAddress in mcaps ? num(mcaps[t.contractAddress]) : null;
      }
      if (sort.key === "h1") {
        return t.contractAddress in h1s ? num(h1s[t.contractAddress]) : null;
      }
      const tk = t.cs ? tMap?.[t.cs] : undefined;
      if (sort.key === "price") return num(tk?.price);
      if (sort.key === "chg") return num(tk?.chgPct);
      return num(tk?.quoteVolume);
    };
    const mul = sort.dir === "desc" ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return mul * (av - bv);
    });
  }, [filtered, sort, tMap, mcaps, h1s]);

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-fg">
          All stocks
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
            aria-label="Search stocks"
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

      <table className="w-full">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-dim">
            <th className="sticky top-14 z-10 h-10 bg-ink px-3 font-medium lg:top-16 lg:px-4">
              #
            </th>
            <th className="sticky top-14 z-10 h-10 bg-ink px-3 font-medium lg:top-16 lg:px-4">
              Stock
            </th>
            <SortTh
              label="Price"
              k="price"
              sort={sort}
              onSort={onSort}
              className={`sticky top-14 z-10 h-10 bg-ink px-3 text-right font-medium lg:top-16 lg:px-4 ${windowVisible(0, colPage) ? "" : "hidden sm:table-cell"}`}
            />
            <SortTh
              label="1h"
              k="h1"
              sort={sort}
              onSort={onSort}
              className={`sticky top-14 z-10 h-10 bg-ink px-3 text-right font-medium lg:top-16 lg:px-4 ${windowVisible(1, colPage) ? "" : "hidden sm:table-cell"}`}
            />
            <SortTh
              label="24h"
              k="chg"
              sort={sort}
              onSort={onSort}
              className={`sticky top-14 z-10 h-10 bg-ink px-3 text-right font-medium lg:top-16 lg:px-4 ${windowVisible(2, colPage) ? "" : "hidden sm:table-cell"}`}
            />
            <SortTh
              label="Market cap"
              k="mcap"
              sort={sort}
              onSort={onSort}
              className={`sticky top-14 z-10 h-10 bg-ink px-3 text-right font-medium lg:top-16 lg:px-4 ${windowVisible(3, colPage) ? "" : "hidden sm:table-cell"}`}
            />
            <SortTh
              label="Volume"
              k="vol"
              sort={sort}
              onSort={onSort}
              className={`sticky top-14 z-10 h-10 bg-ink px-3 text-right font-medium lg:top-16 lg:px-4 ${windowVisible(4, colPage) ? "" : "hidden sm:table-cell"}`}
            />
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: SKELETON_ROWS }, (_, i) => (
              <SkeletonRow key={i} colPage={colPage} />
            ))
          ) : filtered.length === 0 ? (
            <tr>
              <td colSpan={7} className="border-t border-line px-3 py-10 text-center text-sm text-dim lg:px-4">
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
            viewRows.map((t, i) => (
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
                selected={
                  !!selectedAddress &&
                  t.contractAddress.toLowerCase() === selectedAddress.toLowerCase()
                }
                onSelect={onSelect ?? NOOP_SELECT}
              />
            ))
          )}
        </tbody>
      </table>
      <ColPager page={colPage} pages={STOCK_PAGES} onPage={setColPage} />
    </div>
  );
}
