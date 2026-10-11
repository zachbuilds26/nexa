"use client";

import { Inbox, WalletCards } from "lucide-react";
import { useConnection } from "wagmi";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { TokenImage } from "@/components/ui/TokenImage";
import { EmptyBlock, ErrorBlock } from "@/components/ui/StateBlocks";
import { InfoTip } from "@/components/ui/InfoTip";
import { fmtUsd, formatUnits } from "@/lib/format";
import { useEarnData } from "@/hooks/useEarn";

function venueName(venue: "venus" | "native"): string {
  return venue === "venus" ? "Venus Core Pool" : "Native Pool";
}

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
    <Card className={`flex flex-col p-4 ${className}`}>
      <h2 className="mb-3 text-sm font-semibold text-fg">Your deposits</h2>
      {!isConnected ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyBlock
            icon={WalletCards}
            message="Connect wallet to see your deposits."
          />
        </div>
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
        <div className="min-h-0 flex-1 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-dim">
                <th className="px-4 pb-2 font-medium">Asset</th>
                <th className="px-4 pb-2 font-medium">Venue</th>
                <th className="px-4 pb-2 text-right font-medium">Balance</th>
                <th className="px-4 pb-2 text-right font-medium">Value</th>
                <th className="hidden px-4 pb-2 text-right font-medium sm:table-cell">
                  <span className="inline-flex items-center gap-1">
                    Earned
                    <InfoTip
                      align="right"
                      text="Yield earned on your deposit so far. Venus pools show a dash until the market reports it."
                    />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.key} className="border-t border-line">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <TokenImage
                        address={p.token}
                        symbol={p.symbol}
                        size={32}
                        className="ring-2 ring-surface-3"
                      />
                      <span className="text-sm font-medium text-fg">
                        {p.symbol}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex h-6 items-center rounded-full border border-line-strong bg-fill px-2.5 text-[11.5px] font-medium text-dim">
                      {venueName(p.venue)}
                    </span>
                  </td>
                  <td className="tnum px-4 py-3 text-right text-sm text-fg">
                    {formatUnits(p.units, p.decimals, 4)}
                  </td>
                  <td className="tnum px-4 py-3 text-right text-sm font-medium text-fg">
                    {fmtUsd(p.usd)}
                  </td>
                  <td className="tnum hidden px-4 py-3 text-right text-xs text-dim sm:table-cell">
                    {p.earned ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <EmptyBlock
            icon={Inbox}
            message="No deposits yet. Open Earn and pick a pool."
          />
        </div>
      )}
    </Card>
  );
}
