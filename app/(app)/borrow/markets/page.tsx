"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useConnection, useReadContracts } from "wagmi";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronsUpDown, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { TokenImage } from "@/components/ui/TokenImage";
import { TipLabel } from "@/components/ui/InfoTip";
import { ColPager, windowVisible } from "@/components/ui/ColPager";
import { BorrowShell } from "@/components/borrow/BorrowShell";
import { ERC20_ABI } from "@/lib/erc20";
import { fmtNumTrim as fmtTrim, fmtUsd, formatUnits } from "@/lib/format";
import { useUniverse } from "@/hooks/useRwa";
import { useListaMarkets } from "@/hooks/useLista";
import type { ListaMarket } from "@/lib/lista";

type SortCol = "size" | "borrowApr" | "name";

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
  dir = "desc",
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
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={`sticky top-14 z-10 h-10 bg-ink px-3 font-medium lg:top-16 lg:px-4 ${
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

function MarketSkeletonRow({ colPage }: { colPage: number }) {
  const vis = (i: number) => (windowVisible(i, colPage) ? "" : "hidden ");
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

export default function BorrowMarketsPage() {
  const router = useRouter();
  const { address } = useConnection();

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
    <BorrowShell view="markets">
      <div className="min-w-0">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              aria-label="Search borrow markets"
              className="h-9 w-full min-w-0 bg-transparent text-sm text-fg outline-none placeholder:text-dim/60"
            />
          </div>
        </div>

        <div className="relative">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-dim">
                <th className="sticky top-14 z-10 h-10 bg-ink px-3 font-medium lg:top-16 lg:px-4">
                  #
                </th>
                <th className="sticky top-14 z-10 h-10 bg-ink px-3 font-medium lg:top-16 lg:px-4">
                  Market
                </th>
                <SortHeader
                  label="Available"
                  col="size"
                  active={sort.col === "size"}
                  dir={sort.dir}
                  onSort={onSort}
                  className={`sticky top-14 z-10 h-10 bg-ink lg:top-16 ${windowVisible(0, colPage) ? "" : "hidden sm:table-cell"}`}
                />
                <th
                  className={`sticky top-14 z-10 h-10 bg-ink px-3 text-right font-medium lg:top-16 lg:px-4 ${windowVisible(1, colPage) ? "" : "hidden sm:table-cell"}`}
                >
                  Supply APY
                </th>
                <SortHeader
                  label="Borrow APR"
                  col="borrowApr"
                  active={sort.col === "borrowApr"}
                  dir={sort.dir}
                  onSort={onSort}
                  className={`sticky top-14 z-10 h-10 bg-ink lg:top-16 ${windowVisible(2, colPage) ? "" : "hidden sm:table-cell"}`}
                />
                <th
                  className={`sticky top-14 z-10 h-10 bg-ink px-3 text-right font-medium lg:top-16 lg:px-4 ${windowVisible(3, colPage) ? "" : "hidden sm:table-cell"}`}
                >
                  <TipLabel
                    align="right"
                    label="Max LTV"
                    text="Max loan-to-value. The largest share of your collateral value you are allowed to borrow against."
                  />
                </th>
                <th
                  className={`sticky top-14 z-10 h-10 bg-ink px-3 text-right font-medium lg:top-16 lg:px-4 ${windowVisible(4, colPage) ? "" : "hidden sm:table-cell"}`}
                >
                  In wallet
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
                  <td colSpan={7} className="border-t border-line px-3 py-10 text-center text-sm text-dim lg:px-4">
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
                      className="group h-12 cursor-pointer border-t border-line transition-colors hover:bg-fill md:h-14"
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
          <ColPager page={colPage} pages={4} onPage={setColPage} />
        </div>
      </div>
    </BorrowShell>
  );
}
