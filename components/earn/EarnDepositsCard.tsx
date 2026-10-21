"use client";

import { useConnection } from "wagmi";
import { Skeleton } from "@/components/ui/Skeleton";
import { TokenImage } from "@/components/ui/TokenImage";
import { GhostTable, ErrorBlock } from "@/components/ui/StateBlocks";
import { TipLabel } from "@/components/ui/InfoTip";
import { fmtUsd, formatUnits } from "@/lib/format";
import { venueName } from "@/lib/earnKey";
import { useEarnData } from "@/hooks/useEarn";

/** Read-only deposits table: Venus lending + Native Pool balances. */
export function EarnDepositsCard({ className = "" }: { className?: string }) {
  const { isConnected } = useConnection();
  const earn = useEarnData();

  const rows = [
    ...earn.venusItems.map((i) => ({
      ...i,
      venue: "venus" as const,
      earned: undefined as string | undefined,
    })),
    ...earn.nativeItems.map((i) => ({ ...i, venue: "native" as const })),
  ];

  return (
    <div className={`min-w-0 ${className}`}>
      <h2 className="mb-3 text-sm font-semibold text-fg">Your deposits</h2>
      {earn.hasUnpriced && !earn.hasError ? (
        <p className="mb-3 text-xs text-warn">
          Some deposits have no oracle price right now; their value shows a dash.
        </p>
      ) : null}
      {!isConnected ? (
        <GhostTable message="Connect your wallet to view your deposits." />
      ) : earn.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : earn.hasError ? (
        <ErrorBlock
          message="Failed to read your deposit positions."
          onRetry={earn.refetch}
        />
      ) : rows.length > 0 ? (
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-dim">
              <th className="sticky top-14 z-10 h-10 bg-ink px-3 font-medium lg:top-16 lg:px-4">
                Asset
              </th>
              <th className="sticky top-14 z-10 h-10 bg-ink px-3 font-medium lg:top-16 lg:px-4">
                Venue
              </th>
              <th className="sticky top-14 z-10 h-10 bg-ink px-3 text-right font-medium lg:top-16 lg:px-4">
                Balance
              </th>
              <th className="sticky top-14 z-10 h-10 bg-ink px-3 text-right font-medium lg:top-16 lg:px-4">
                Value
              </th>
              <th className="sticky top-14 z-10 hidden h-10 bg-ink px-3 text-right font-medium lg:top-16 sm:table-cell lg:px-4">
                <TipLabel
                  align="right"
                  label="Earned"
                  text="Yield earned on your deposit so far. Native Pool reports lifetime yield; Venus positions show a dash."
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.key} className="h-12 border-t border-line transition-colors hover:bg-fill md:h-14">
                <td className="px-3 md:px-4">
                  <div className="flex items-center gap-3">
                    <TokenImage
                      address={p.token}
                      symbol={p.symbol}
                      size={32}
                      className="ring-2 ring-ink"
                    />
                    <span className="text-sm font-medium text-fg">
                      {p.symbol}
                    </span>
                  </div>
                </td>
                <td className="px-3 md:px-4">
                  <span className="inline-flex h-6 items-center rounded-full border border-line-strong bg-fill px-2.5 text-[11.5px] font-medium text-dim">
                    {venueName(p.venue)}
                  </span>
                </td>
                <td className="tnum px-3 text-right text-sm text-fg md:px-4">
                  {formatUnits(p.units, p.decimals, 4)}
                </td>
                <td className="tnum px-3 text-right text-sm font-medium text-fg md:px-4">
                  {fmtUsd(p.usd)}
                </td>
                <td className="tnum hidden px-3 text-right text-xs text-dim sm:table-cell md:px-4">
                  {p.earned ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <GhostTable message="No deposits yet. Open Earn and pick a pool." />
      )}
    </div>
  );
}
