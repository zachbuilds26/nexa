"use client";

import { Suspense, use, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageFallback } from "@/components/ui/PageFallback";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";
import { TokenImage } from "@/components/ui/TokenImage";
import { VenueLogo } from "@/components/ui/VenueLogo";
import { AddressChip } from "@/components/ui/AddressChip";
import { PoolActionCard } from "@/components/earn/PoolActionCard";
import { PoolInfoPanel } from "@/components/earn/PoolInfoPanel";
import { parseEarnKey, venueName } from "@/lib/earnKey";
import { useYieldRows } from "@/hooks/useYield";

export default function EarnPoolPage(props: {
  params: Promise<{ key: string }>;
}) {
  return (
    <Suspense fallback={<PageFallback label="Loading pool" />}>
      <EarnPoolView {...props} />
    </Suspense>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full border border-line-strong bg-fill px-2.5 text-[11.5px] font-medium text-dim">
      {children}
    </span>
  );
}

function EarnPoolView({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const poolKey = key.toLowerCase();
  const parsed = parseEarnKey(poolKey);
  const { rows, loading, error } = useYieldRows();
  const row = rows.find((r) => r.key === poolKey);

  const symbol =
    row?.symbol ?? parsed?.asset?.toUpperCase() ?? "";
  const venue = row
    ? venueName(row.venue)
    : parsed
      ? venueName(parsed.venue)
      : "";

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 lg:px-8">
      <Link
        href="/earn"
        className="inline-flex items-center gap-1.5 text-sm text-dim transition-colors hover:text-accent"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.7} />
        Pools
      </Link>

      <div className="mb-5 mt-4">
        {loading && !row && parsed ? (
          <Skeleton className="h-8 w-56" />
        ) : (
          <h1 className="flex items-center gap-3 text-2xl font-semibold text-fg">
            {parsed ? (
              <>
                <TokenImage
                  address={row?.token}
                  symbol={symbol || "?"}
                  size={32}
                  className="ring-2 ring-ink"
                />
                <VenueLogo venue={parsed.venue} size={28} className="ring-2 ring-ink" />
              </>
            ) : null}
            <span>{parsed ? `${symbol} · ${venue}` : "Pool"}</span>
          </h1>
        )}
        {parsed ? (
          loading && !row ? (
            <Skeleton className="mt-2.5 h-6 w-80" />
          ) : (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Pill>{venue}</Pill>
              {row?.apyNote ? <Pill>{row.apyNote}</Pill> : null}
              {row ? (
                <span
                  className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[11.5px] font-medium ${
                    row.depositEnabled
                      ? "border-line-strong bg-fill text-dim"
                      : "border-warn/30 bg-warn/10 text-warn"
                  }`}
                >
                  {row.depositEnabled ? "Deposits open" : "Deposits paused"}
                </span>
              ) : null}
              {row?.vToken ? (
                <AddressChip
                  address={row.vToken}
                  href={`https://bscscan.com/token/${row.vToken}`}
                />
              ) : null}
            </div>
          )
        ) : (
          <p className="mt-1.5 text-sm text-dim">
            {error
              ? "Couldn't load yield pools - reload to try again."
              : "This pool isn't available right now."}
          </p>
        )}
      </div>

      {loading && !row ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
            <Card className="mt-4 p-4">
              <Skeleton className="mb-3 h-4 w-28" />
              <Skeleton className="mb-2 h-3 w-full" />
              <Skeleton className="mb-2 h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
            </Card>
          </div>
          <Card className="p-5">
            <Skeleton className="mb-3 h-4 w-24" />
            <Skeleton className="mb-3 h-10 w-full" />
            <Skeleton className="mb-3 h-10 w-full" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <PoolInfoPanel poolKey={poolKey} className="min-w-0" />
          <div className="min-w-0 flex flex-col lg:order-none order-first">
            <PoolActionCard poolKey={poolKey} />
          </div>
        </div>
      )}
    </div>
  );
}
