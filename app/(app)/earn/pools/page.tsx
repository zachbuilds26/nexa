"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { TokenImage } from "@/components/ui/TokenImage";
import { EmptyBlock, ErrorBlock } from "@/components/ui/StateBlocks";
import { SortHeader } from "@/components/ui/TableBits";
import { ColPager, windowVisible } from "@/components/ui/ColPager";
import { EarnShell } from "@/components/earn/EarnShell";
import {
  fmtNumTrim,
  fmtUsdCompact,
  formatUnits,
} from "@/lib/format";
import { venueName } from "@/lib/earnKey";
import { useYieldBalances, useYieldRows } from "@/hooks/useYield";

type SortCol = "tvl" | "apy";

type Row = {
  key: string;
  label: string;
  sub: string;
  typeChip: string;
  apy: number | null;
  tvl: number | null;
  wallet: string;
  go: string;
  token?: `0x${string}`;
};

function fmtPct(fraction: number | null, dp = 2): string {
  if (fraction === null || !Number.isFinite(fraction)) return "-";
  return `${fmtNumTrim(fraction * 100, dp)}%`;
}

function YieldSkeletonRow({ colPage }: { colPage: number }) {
  const v0 = windowVisible(0, colPage) ? "" : "hidden ";
  const v1 = windowVisible(1, colPage) ? "" : "hidden ";
  const v2 = windowVisible(2, colPage) ? "" : "hidden ";
  return (
    <tr className="h-12 border-t border-line md:h-14">
      <td className="px-3 md:px-4">
        <Skeleton className="h-4 w-4" />
      </td>
      <td className="px-3 md:px-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        </div>
      </td>
      <td className="hidden px-3 sm:table-cell md:px-4">
        <Skeleton className="h-6 w-20 rounded-full" />
      </td>
      <td className={`${v0}px-3 text-right sm:table-cell md:px-4`}>
        <Skeleton className="ml-auto h-4 w-14" />
      </td>
      <td className={`${v1}px-3 text-right sm:table-cell md:px-4`}>
        <Skeleton className="ml-auto h-4 w-16" />
      </td>
      <td className={`${v2}px-4 text-right sm:table-cell`}>
        <Skeleton className="ml-auto h-4 w-16" />
      </td>
    </tr>
  );
}

export default function EarnPoolsPage() {
  const router = useRouter();
  const { rows, loading, error, refetch } = useYieldRows();
  const balanceQ = useYieldBalances(rows);
  const balanceByKey = balanceQ.balanceByKey;

  const [query, setQuery] = useState("");
  const [colPage, setColPage] = useState(0);
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" }>({
    col: "tvl",
    dir: "desc",
  });

  const allRows: Row[] = useMemo(
    () =>
      rows.map((r) => {
        const bal = balanceByKey.get(r.key) ?? 0n;
        return {
          key: r.key,
          label: r.symbol,
          sub: `${venueName(r.venue)} · ${r.apyNote}`,
          typeChip: r.venue === "venus" ? "Venus" : "Native",
          apy: r.apy,
          tvl: r.tvlUsd,
          wallet: balanceQ.isError ? "-" : formatUnits(bal, r.decimals, 4),
          go: `/earn/${r.key}`,
          token: r.token,
        };
      }),
    [rows, balanceByKey, balanceQ.isError],
  );

  const viewRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = allRows.filter(
      (r) =>
        !q || `${r.label} ${r.sub}`.toLowerCase().includes(q),
    );
    const mul = sort.dir === "desc" ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const av = sort.col === "tvl" ? (a.tvl ?? -1) : (a.apy ?? -1);
      const bv = sort.col === "tvl" ? (b.tvl ?? -1) : (b.apy ?? -1);
      return mul * (av - bv);
    });
  }, [allRows, query, sort]);

  function onSort(c: string) {
    const col = c as SortCol;
    setSort((s) =>
      s.col === col
        ? { col, dir: s.dir === "desc" ? "asc" : "desc" }
        : { col, dir: "desc" },
    );
  }

  return (
    <EarnShell view="pools">
      <div className="min-w-0">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-fg">Pools</h2>
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim"
                strokeWidth={1.7}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pools"
                aria-label="Search pools"
                className="h-8 w-full rounded-lg border border-line bg-fill pl-8 pr-3 text-xs text-fg placeholder:text-dim focus:border-line-strong"
              />
            </div>
          </div>
        </div>
        {error ? (
          <ErrorBlock message="Failed to load yield pools." onRetry={refetch} />
        ) : (
          <div className="relative">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider">
                  <th className="sticky top-14 z-10 h-10 bg-ink px-3 font-medium text-dim lg:top-16 lg:px-4">
                    #
                  </th>
                  <th className="sticky top-14 z-10 h-10 bg-ink px-3 font-medium text-dim lg:top-16 lg:px-4">
                    Pool
                  </th>
                  <th className="sticky top-14 z-10 hidden h-10 bg-ink px-3 font-medium text-dim sm:table-cell lg:top-16 lg:px-4">
                    Type
                  </th>
                  <SortHeader
                    label="APY / APR"
                    col="apy"
                    active={sort.col === "apy"}
                    dir={sort.dir}
                    onSort={onSort}
                    tip="Live annualized yield. Lending markets show APR; liquidity pools show projected APY."
                    className={`sticky top-14 z-10 h-10 bg-ink lg:top-16 max-md:px-3! ${windowVisible(0, colPage) ? "" : "hidden sm:table-cell"}`}
                  />
                  <SortHeader
                    label="TVL"
                    col="tvl"
                    active={sort.col === "tvl"}
                    dir={sort.dir}
                    onSort={onSort}
                    tip="Total value deposited in this pool across all users."
                    className={`sticky top-14 z-10 h-10 bg-ink lg:top-16 max-md:px-3! ${windowVisible(1, colPage) ? "" : "hidden sm:table-cell"}`}
                  />
                  <th className={`sticky top-14 z-10 h-10 bg-ink px-4 text-right font-medium text-dim lg:top-16 ${windowVisible(2, colPage) ? "sm:table-cell" : "hidden sm:table-cell"}`}>
                    In wallet
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [0, 1, 2, 3].map((i) => (
                    <YieldSkeletonRow key={i} colPage={colPage} />
                  ))
                ) : viewRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="border-t border-line px-4 py-8">
                      <EmptyBlock message="No pool matches this search." />
                    </td>
                  </tr>
                ) : (
                  viewRows.map((r, i) => (
                    <tr
                      key={r.key}
                      tabIndex={0}
                      onClick={() => router.push(r.go)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(r.go);
                        }
                      }}
                      className="group h-12 cursor-pointer border-t border-line transition-colors hover:bg-fill md:h-14"
                    >
                      <td className="tnum px-3 align-middle text-xs text-dim md:px-4">
                        {i + 1}
                      </td>
                      <td className="px-3 align-middle md:px-4">
                        <div className="flex items-center gap-3">
                          <TokenImage
                            address={r.token}
                            symbol={r.label}
                            size={32}
                            className="ring-2 ring-ink"
                          />
                          <div className="min-w-0 max-w-[96px] sm:max-w-none">
                            <div className="truncate text-sm font-medium text-fg transition-colors group-hover:text-accent">
                              {r.label}
                            </div>
                            <div className="truncate text-xs text-dim">
                              {r.sub}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-3 align-middle sm:table-cell md:px-4">
                        <span className="inline-flex h-6 items-center rounded-full border border-line-strong bg-fill px-2.5 text-[11.5px] font-medium text-dim">
                          {r.typeChip}
                        </span>
                      </td>
                      <td className={`tnum align-middle text-right text-sm font-medium text-fg md:px-4 ${windowVisible(0, colPage) ? "px-3" : "hidden px-3 sm:table-cell"}`}>
                        {fmtPct(r.apy)}
                      </td>
                      <td className={`tnum align-middle text-right text-sm text-fg md:px-4 ${windowVisible(1, colPage) ? "px-3" : "hidden px-3 sm:table-cell"}`}>
                        {fmtUsdCompact(r.tvl)}
                      </td>
                      <td className={`tnum px-4 align-middle text-right text-sm font-medium text-fg ${windowVisible(2, colPage) ? "sm:table-cell" : "hidden sm:table-cell"}`}>
                        {loading ? "…" : r.wallet}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <ColPager page={colPage} pages={2} onPage={setColPage} />
          </div>
        )}
      </div>
    </EarnShell>
  );
}
