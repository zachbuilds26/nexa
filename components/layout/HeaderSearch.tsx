"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useUniverse } from "@/hooks/useRwa";
import { useUniverseTickers } from "@/hooks/useTickers";
import { useYieldRows } from "@/hooks/useYield";
import { TokenImage } from "@/components/ui/TokenImage";
import { Skeleton } from "@/components/ui/Skeleton";
import { useBodyScrollLock } from "@/components/ui/useBodyScrollLock";
import { useSheetDrag } from "@/components/ui/useSheetDrag";
import { venueName } from "@/lib/earnKey";
import { fmtNumTrim, fmtUsdCompact } from "@/lib/format";

type Tab = "all" | "tokens" | "pools";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "tokens", label: "Stocks" },
  { id: "pools", label: "Pools" },
];

type TokenRow = {
  address: string;
  symbol: string;
  ticker: string;
  volume: number | null;
};

type PoolRow = {
  key: string;
  token: `0x${string}` | undefined;
  symbol: string;
  sub: string;
  apy: number | null;
  apyUnit: string;
  tvlUsd: number | null;
};

const SKELETON_ROWS = 6;
/** Empty search shows the most-traded names first; typing searches everything. */
const TOP_N = 10;
const MAX_ROWS = 40;
/** The "All" tab keeps the token list short so the Pools section stays visible. */
const ALL_TOKENS = 8;
const ALL_POOLS = 4;

/** Case-insensitive hit on symbol, ticker, or 0x address. */
function matches(q: string, symbol: string, name: string, address: string): boolean {
  return (
    !q ||
    symbol.toLowerCase().includes(q) ||
    name.toLowerCase().includes(q) ||
    address.toLowerCase().includes(q)
  );
}

function SkeletonRows({ n }: { n: number }) {
  return (
    <div className="space-y-1 p-1">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="px-3 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-dim">
      {children}
    </p>
  );
}

export function HeaderSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Search stocks and pools"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm text-dim transition-colors hover:bg-fill hover:text-fg md:w-auto md:justify-start md:gap-2 md:rounded-full md:border md:border-line md:bg-fill md:px-3.5 md:hover:border-line-strong xl:w-[240px] xl:justify-between"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Search className="h-5 w-5 md:h-4 md:w-4" strokeWidth={1.7} aria-hidden />
          <span className="hidden md:inline">Search</span>
        </span>
        <kbd className="hidden font-sans text-xs font-medium text-dim xl:inline-block">⌘K</kbd>
      </button>
      {open ? <PalettePortal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function PalettePortal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const universe = useUniverse();
  const tickers = useUniverseTickers(true);
  const pools = useYieldRows();
  const { dragY, dragging, handleProps } = useSheetDrag(onClose);

  useBodyScrollLock(true);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const q = query.trim().toLowerCase();

  const tokenRows = useMemo<TokenRow[]>(() => {
    const data = universe.data ?? [];
    return data
      .filter((s) => matches(q, s.symbol, s.ticker, s.contractAddress))
      .map((s) => {
        const t = s.cs ? tickers.data?.[s.cs] : undefined;
        return {
          address: s.contractAddress,
          symbol: s.symbol,
          ticker: s.ticker,
          volume: t ? Number(t.quoteVolume) || 0 : null,
        };
      })
      // Real 24h volume desc; unknown volume trails (stable sort keeps order).
      .sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1));
  }, [universe.data, tickers.data, q]);

  const poolRows = useMemo<PoolRow[]>(() => {
    const list = (pools.rows ?? [])
      .filter(
        (r) =>
          !q ||
          r.symbol.toLowerCase().includes(q) ||
          venueName(r.venue).toLowerCase().includes(q),
      )
      .map((r) => ({
        key: r.key,
        token: r.token,
        symbol: r.symbol,
        sub: [venueName(r.venue), r.tvlUsd !== null ? `${fmtUsdCompact(r.tvlUsd)} TVL` : null]
          .filter(Boolean)
          .join(" · "),
        apy: r.apy,
        apyUnit: r.apyNote.toUpperCase().includes("APR") ? "APR" : "APY",
        tvlUsd: r.tvlUsd,
      }));
    return [...list].sort((a, b) => (b.tvlUsd ?? -1) - (a.tvlUsd ?? -1));
  }, [pools.rows, q]);

  const tokensLoading = !universe.data || (!tickers.data && !tickers.isError);
  const tokensError = universe.isError;
  const poolsLoading = pools.loading && poolRows.length === 0;
  const poolsError = pools.error;

  const goToken = (row: TokenRow) => {
    onClose();
    router.push(`/stocks/${row.address}`);
  };
  const goPool = (row: PoolRow) => {
    onClose();
    router.push(`/earn/${row.key}`);
  };

  // Per-tab row sets.
  const allTokens = tokenRows.slice(0, q ? ALL_TOKENS : TOP_N);
  const allPools = poolRows.slice(0, ALL_POOLS);
  const tokensTabList = tokenRows.slice(0, MAX_ROWS);
  const poolsTabList = poolRows.slice(0, MAX_ROWS);

  const tokensEmpty = !tokensLoading && !tokensError && tokenRows.length === 0;
  const poolsEmpty = !poolsLoading && !poolsError && poolRows.length === 0;
  const nothing =
    tab === "tokens"
      ? tokensEmpty
      : tab === "pools"
        ? poolsEmpty
        : tokensEmpty && !poolsLoading && poolRows.length === 0;

  const retryBlock = (label: string, onRetry: () => void) => (
    <div className="px-3 py-8 text-center text-sm text-dim">
      {label}{" "}
      <button
        type="button"
        className="underline transition-colors hover:text-fg"
        onClick={onRetry}
      >
        Retry
      </button>
    </div>
  );

  const tokenRowEls = (rows: TokenRow[]) =>
    rows.map((row) => (
      <button
        key={row.address}
        type="button"
        data-row="token"
        onClick={() => goToken(row)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-fill"
      >
        <TokenImage address={row.address} symbol={row.symbol} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-fg">{row.symbol}</span>
          <span className="block truncate text-xs text-dim">
            {row.ticker}
            {row.volume !== null ? (
              <>
                {" · "}
                <span className="tnum">{fmtUsdCompact(row.volume)}</span> 24h vol
              </>
            ) : null}
          </span>
        </span>
      </button>
    ));

  const poolRowEls = (rows: PoolRow[]) =>
    rows.map((row) => (
      <button
        key={row.key}
        type="button"
        data-row="pool"
        onClick={() => goPool(row)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-fill"
      >
        <TokenImage address={row.token} symbol={row.symbol} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-fg">{row.symbol}</span>
          <span className="block truncate text-xs text-dim">{row.sub}</span>
        </span>
        <span className="shrink-0 pl-3 text-right">
          <span className="tnum block text-sm font-semibold text-up">
            {row.apy !== null ? `${fmtNumTrim(row.apy * 100, 2)}%` : "-"}
          </span>
          <span className="block text-xs text-dim">{row.apyUnit}</span>
        </span>
      </button>
    ));

  // Portal to <body> so the overlay sits above the bottom nav: inside the
  // header's z-50 stacking context it would lose to MobileNav's z-50.
  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-ink/70"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label="Search stocks and pools"
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
        className={`fixed inset-x-0 bottom-0 top-16 z-[60] flex flex-col overflow-hidden rounded-t-2xl border-t border-line bg-surface-3 shadow-2xl md:inset-x-auto md:bottom-auto md:left-1/2 md:top-14 md:h-[540px] md:w-[412px] md:rounded-2xl md:border md:-translate-x-1/2 ${
          dragging ? "" : "transition-transform"
        }`}
      >
        {/* Mobile drag affordance: drag down to dismiss (no X). */}
        <div
          {...handleProps}
          data-drag-handle
          className="flex cursor-grab touch-none items-center justify-center py-3 active:cursor-grabbing md:hidden"
        >
          <span className="h-1 w-8 rounded-full bg-line" aria-hidden />
        </div>

        {/* Search field (rounded on mobile like the sheet, pill on desktop). */}
        <div className="px-3 pt-3 md:px-3.5 md:pt-3.5">
          <div className="flex h-11 items-center gap-2.5 rounded-xl bg-fill px-3.5 transition-shadow focus-within:ring-1 focus-within:ring-line-strong md:rounded-full">
            <Search size={16} strokeWidth={1.7} className="shrink-0 text-dim" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search stocks and pools"
              placeholder="Search stocks or pools"
              className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-dim"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-dim transition-colors hover:bg-fill-strong hover:text-fg"
              >
                <X size={13} strokeWidth={1.7} />
              </button>
            ) : null}
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Search scope"
          className="mt-2.5 flex shrink-0 items-center gap-1 px-3 md:px-3.5"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`h-7 rounded-full px-3 text-xs font-medium transition-colors ${
                tab === t.id
                  ? "bg-fill-strong text-fg"
                  : "text-dim hover:bg-fill hover:text-fg"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          id="nexa-search-list"
          className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-4"
        >
          {(tab === "all" || tab === "tokens") && (
            <>
              <SectionLabel>
                {q ? "Stocks" : "Stocks by 24h volume"}
              </SectionLabel>
              {tokensError
                ? retryBlock("Couldn't load the stock list.", () => void universe.refetch())
                : tokensLoading
                  ? <SkeletonRows n={SKELETON_ROWS} />
                  : tokenRowEls(tab === "all" ? allTokens : tokensTabList)}
            </>
          )}

          {tab === "pools" && (
            <>
              <SectionLabel>Pools</SectionLabel>
              {poolsError
                ? retryBlock("Couldn't load pools.", () => pools.refetch())
                : poolsLoading
                  ? <SkeletonRows n={SKELETON_ROWS} />
                  : poolRowEls(poolsTabList)}
            </>
          )}

          {tab === "all" &&
            (q ? allPools.length > 0 : poolsLoading || allPools.length > 0) && (
              <>
                <SectionLabel>Pools</SectionLabel>
                {poolsLoading ? <SkeletonRows n={3} /> : poolRowEls(allPools)}
              </>
            )}

          {nothing ? (
            <p className="px-3 py-8 text-center text-sm text-dim">
              {q ? (
                <>
                  No matches for &quot;
                  <span className="tnum text-fg">{query.trim()}</span>&quot;.
                </>
              ) : (
                "Nothing listed yet."
              )}
            </p>
          ) : null}
        </div>
      </div>
    </>,
    document.body,
  );
}
