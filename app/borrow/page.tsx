"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useConnection, useReadContracts } from "wagmi";
import { Search, WalletCards } from "lucide-react";
import { PageFallback } from "@/components/ui/PageFallback";
import { Skeleton } from "@/components/ui/Skeleton";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { TokenImage } from "@/components/ui/TokenImage";
import { InfoTip } from "@/components/ui/InfoTip";
import { EmptyBlock } from "@/components/ui/StateBlocks";
import { ColPager, windowVisible } from "@/components/ui/ColPager";
import { ListaPositionsCard } from "@/components/borrow/ListaMarketsPanel";
import { ERC20_ABI } from "@/lib/erc20";
import { fmtNumTrim as fmtTrim, fmtUsd, formatUnits } from "@/lib/format";
import { useUniverse } from "@/hooks/useRwa";
import { useListaMarkets } from "@/hooks/useLista";
import type { ListaMarket } from "@/lib/lista";

type SortCol = "size" | "supplyApr" | "borrowApr" | "name";

type ListaRow = {
  market: ListaMarket;
  symbol: string;
  ticker: string;
  iconSrc?: string;
  walletBalance?: bigint;
};

function fmtPct(fraction: number, dp = 2): string {
  if (!Number.isFinite(fraction)) return "-";
  return `${fmtTrim(fraction * 100, dp)}%`;
}

function ValueSkeleton() {
  return <Skeleton className="ml-auto h-4 w-16" />;
}

function SortHeader({
  label,
  col,
  active,
  onSort,
  className = "",
}: {
  label: string;
  col: SortCol;
  active: boolean;
  dir?: "asc" | "desc";
  onSort: (c: SortCol) => void;
  className?: string;
}) {
  return (
    <th
      className={`sticky top-0 z-10 h-10 bg-surface-3 px-3 font-medium shadow-[0_1px_0_0_var(--color-line)] md:px-4 ${
        col === "name" ? "text-left" : "text-right"
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className={`inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-fg ${
          active ? "text-fg" : "text-dim"
        }`}
      >
        {label}
      </button>
    </th>
  );
}

function MarketSkeletonRow({ colPage }: { colPage: number }) {
  const vis = (i: number) => (windowVisible(i, colPage) ? "" : "hidden ");
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
      <td className={`${vis(0)}px-3 text-right sm:table-cell md:px-4`}>
        <ValueSkeleton />
      </td>
      <td className={`${vis(1)}px-3 text-right sm:table-cell md:px-4`}>
        <ValueSkeleton />
      </td>
      <td className={`${vis(2)}px-3 text-right sm:table-cell md:px-4`}>
        <ValueSkeleton />
      </td>
      <td className={`${vis(3)}px-3 text-right sm:table-cell md:px-4`}>
        <ValueSkeleton />
      </td>
      <td className={`${vis(4)}px-3 text-right sm:table-cell md:px-4`}>
        <ValueSkeleton />
      </td>
    </tr>
  );
}

export default function BorrowPage() {
  return (
    <Suspense fallback={<PageFallback label="Loading borrow" />}>
      <BorrowInner />
    </Suspense>
  );
}

function BorrowInner() {
  const router = useRouter();
  const { address, isConnected } = useConnection();

  const universe = useUniverse();
  const lista = useListaMarkets();
  const stockByAddr = useMemo(
    () =>
      new Map(
        (universe.data ?? []).map((s) => [
          s.contractAddress.toLowerCase(),
          s,
        ]),
      ),
    [universe.data],
  );
  const listaList = useMemo(() => lista.data ?? [], [lista.data]);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" }>({
    col: "size",
    dir: "desc",
  });
  const [colPage, setColPage] = useState(0);
  const [view, setView] = useState<"markets" | "positions">("markets");

  const listaBalRead = useReadContracts({
    contracts:
      address && listaList.length > 0
        ? listaList.map((m) => ({
            address: m.collateralAddress,
            abi: ERC20_ABI,
            functionName: "balanceOf" as const,
            args: [address] as const,
          }))
        : [],
    query: {
      enabled: Boolean(address) && listaList.length > 0,
      staleTime: 5_000,
    },
  });

  const rows = useMemo<ListaRow[]>(() => {
    const byCollateral = new Map<string, ListaRow>();
    for (const m of listaList) {
      const stock = stockByAddr.get(m.collateralAddress.toLowerCase());
      const symbol = stock?.symbol ?? m.collateralSymbol;
      const existing = byCollateral.get(symbol);
      if (!existing) {
        const idx = listaList.indexOf(m);
        const res = listaBalRead.data?.[idx]?.result;
        byCollateral.set(symbol, {
          market: m,
          symbol,
          ticker: stock?.ticker ?? "",
          iconSrc: stock ? undefined : m.collateralIcon,
          walletBalance: typeof res === "bigint" ? res : undefined,
        });
      } else if (m.liquidityUsd > existing.market.liquidityUsd) {
        byCollateral.set(symbol, { ...existing, market: m });
      }
    }
    return [...byCollateral.values()];
  }, [listaList, stockByAddr, listaBalRead.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.symbol, r.ticker, r.market.loanSymbol]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, query]);

  const sorted = useMemo(() => {
    const mul = sort.dir === "desc" ? -1 : 1;
    const val = (r: ListaRow): number => {
      switch (sort.col) {
        case "size":
          return r.market.liquidityUsd;
        case "supplyApr":
          return r.market.supplyApy;
        case "borrowApr":
          return r.market.borrowRate;
        case "name":
          return 0;
      }
    };
    return [...filtered].sort((a, b) => {
      if (sort.col === "name") return mul * a.symbol.localeCompare(b.symbol);
      return mul * (val(a) - val(b));
    });
  }, [filtered, sort]);

  function onSort(col: SortCol) {
    setSort((s) =>
      s.col === col
        ? { col, dir: s.dir === "desc" ? "asc" : "desc" }
        : { col, dir: col === "name" ? "asc" : "desc" },
    );
  }

  const loading = universe.isLoading || lista.isLoading;
  const error = universe.isError || lista.isError;
  const refetch = () => {
    void universe.refetch();
    void lista.refetch();
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 lg:px-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-fg">Borrow</h1>
        <p className="mt-1 max-w-2xl text-sm text-dim">
          Post a listed bStock as collateral and borrow stables against it,
          through Lista Lending on BNB Chain.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <SegmentedTabs
          ariaLabel="Markets or positions"
          value={view}
          onChange={setView}
          tabs={[
            { key: "markets", label: "Markets" },
            { key: "positions", label: "Positions" },
          ]}
        />
        {view === "markets" ? (
          <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface-3">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold text-fg">
                Markets
                {loading ? (
                  <Skeleton className="ml-2 inline-block h-4 w-16 align-middle" />
                ) : query ? (
                  <span className="ml-2 text-xs font-normal text-dim">
                    {sorted.length} {sorted.length === 1 ? "match" : "matches"}
                  </span>
                ) : (
                  <span className="ml-2 text-xs text-dim">
                    {rows.length} bStocks
                  </span>
                )}
                {error ? (
                  <button
                    type="button"
                    onClick={refetch}
                    className="ml-3 text-xs font-normal text-down underline"
                  >
                    markets unavailable - retry
                  </button>
                ) : null}
              </h2>
              <div className="flex w-full items-center gap-2 rounded-lg bg-surface-4 px-3 sm:w-64">
                <Search className="h-4 w-4 shrink-0 text-dim" strokeWidth={1.7} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search symbol…"
                  className="h-9 w-full min-w-0 bg-transparent text-sm text-fg outline-none placeholder:text-dim/60"
                />
              </div>
            </div>

            <div className="relative">
              <div className="max-h-[260px] overflow-y-auto overscroll-contain md:max-h-[360px]">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-dim">
                      <th className="sticky top-0 z-10 h-10 bg-surface-3 px-3 font-medium shadow-[0_1px_0_0_var(--color-line)] md:px-4">
                        #
                      </th>
                      <th className="sticky top-0 z-10 h-10 bg-surface-3 px-3 font-medium shadow-[0_1px_0_0_var(--color-line)] md:px-4">
                        Market
                      </th>
                      <SortHeader
                        label="Available"
                        col="size"
                        active={sort.col === "size"}
                        dir={sort.dir}
                        onSort={onSort}
                        className={windowVisible(0, colPage) ? "" : "hidden sm:table-cell"}
                      />
                      <SortHeader
                        label="Supply APY"
                        col="supplyApr"
                        active={sort.col === "supplyApr"}
                        dir={sort.dir}
                        onSort={onSort}
                        className={windowVisible(1, colPage) ? "" : "hidden sm:table-cell"}
                      />
                      <SortHeader
                        label="Borrow APR"
                        col="borrowApr"
                        active={sort.col === "borrowApr"}
                        dir={sort.dir}
                        onSort={onSort}
                        className={windowVisible(2, colPage) ? "" : "hidden sm:table-cell"}
                      />
                      <th
                        className={`sticky top-0 z-10 h-10 bg-surface-3 px-3 text-right font-medium shadow-[0_1px_0_0_var(--color-line)] md:px-4 ${windowVisible(3, colPage) ? "" : "hidden sm:table-cell"}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          Max LTV
                          <InfoTip
                            align="right"
                            text="Max loan-to-value. The largest share of your collateral value you are allowed to borrow against."
                          />
                        </span>
                      </th>
                      <th
                        className={`sticky top-0 z-10 h-10 bg-surface-3 px-3 text-right font-medium shadow-[0_1px_0_0_var(--color-line)] md:px-4 ${windowVisible(4, colPage) ? "" : "hidden sm:table-cell"}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          In wallet
                          <InfoTip
                            align="right"
                            text="Your wallet balance of this collateral asset."
                          />
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <MarketSkeletonRow key={i} colPage={colPage} />
                      ))
                    ) : sorted.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-10 text-center text-sm text-dim md:px-4">
                          {query ? (
                            <>
                              No market matches “
                              <span className="tnum text-fg">{query.trim()}</span>
                              ”.
                            </>
                          ) : (
                            "No bStock is listed as collateral right now."
                          )}
                        </td>
                      </tr>
                    ) : (
                      sorted.map((r, i) => {
                        const v0 = windowVisible(0, colPage) ? "" : "hidden ";
                        const v1 = windowVisible(1, colPage) ? "" : "hidden ";
                        const v2 = windowVisible(2, colPage) ? "" : "hidden ";
                        const v3 = windowVisible(3, colPage) ? "" : "hidden ";
                        const v4 = windowVisible(4, colPage) ? "" : "hidden ";
                        return (
                          <tr
                            key={r.market.id}
                            tabIndex={0}
                            onClick={() =>
                              router.push(`/borrow/lista/${r.market.id}`)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                router.push(`/borrow/lista/${r.market.id}`);
                              }
                            }}
                            className="group h-11 cursor-pointer transition-colors hover:bg-fill md:h-16"
                          >
                            <td className="tnum px-3 text-xs text-dim md:px-4">
                              {i + 1}
                            </td>
                            <td className="px-3 md:px-4">
                              <div className="flex items-center gap-3">
                                <TokenImage
                                  address={r.market.collateralAddress}
                                  src={r.iconSrc}
                                  symbol={r.symbol}
                                  size={28}
                                />
                                <div>
                                  <div className="text-sm font-semibold text-fg transition-colors group-hover:text-accent">
                                    {r.symbol}
                                  </div>
                                  <div className="text-xs text-dim">
                                    {r.ticker}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className={`${v0}px-3 text-right sm:table-cell md:px-4`}>
                              <span className="tnum text-sm font-medium text-fg">
                                {fmtUsd(r.market.liquidityUsd)}
                              </span>
                            </td>
                            <td className={`${v1}px-3 text-right sm:table-cell md:px-4`}>
                              <span className="tnum text-sm text-fg">
                                {fmtPct(r.market.supplyApy)}
                              </span>
                            </td>
                            <td className={`${v2}px-3 text-right sm:table-cell md:px-4`}>
                              <span className="tnum text-sm text-fg">
                                {fmtPct(r.market.borrowRate)}
                              </span>
                            </td>
                            <td className={`${v3}px-3 text-right sm:table-cell md:px-4`}>
                              <span className="tnum text-sm text-fg">
                                {fmtPct(r.market.lltv, 0)}
                              </span>
                            </td>
                            <td className={`${v4}px-3 text-right sm:table-cell md:px-4`}>
                              <span className="tnum text-sm font-medium text-fg">
                                {typeof r.walletBalance === "bigint"
                                  ? formatUnits(r.walletBalance, 18, 4)
                                  : "-"}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <ColPager page={colPage} pages={4} onPage={setColPage} />
            </div>
          </div>
        ) : (
          <div className="flex min-h-[calc(100dvh-360px)] min-w-0 flex-col gap-6">
            {!isConnected ? (
              <div className="flex min-h-[240px] flex-col overflow-hidden rounded-xl border border-line bg-surface-3">
                <div className="flex flex-1 items-center justify-center">
                  <EmptyBlock
                    icon={WalletCards}
                    message="Connect wallet to see your borrow positions."
                  />
                </div>
              </div>
            ) : (
              <ListaPositionsCard />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
