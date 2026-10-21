"use client";

import { useRouter } from "next/navigation";
import { useConnection } from "wagmi";
import { Skeleton } from "@/components/ui/Skeleton";
import { TokenImage } from "@/components/ui/TokenImage";
import { TipLabel } from "@/components/ui/InfoTip";
import { GhostTable, ErrorBlock } from "@/components/ui/StateBlocks";
import { formatUnits } from "@/lib/format";
import { useListaAllPositions, useListaMarkets } from "@/hooks/useLista";

/**
 * Lista (Moolah) positions table for the combined Borrow positions view.
 * Shows a ghost skeleton when disconnected or empty, loading/error states,
 * or the open isolated-market positions.
 */
export function ListaPositionsCard() {
  const router = useRouter();
  const { address, isConnected } = useConnection();
  const markets = useListaMarkets();
  const positions = useListaAllPositions(markets.data, address);

  if (!isConnected) {
    return (
      <div className="min-w-0">
        <h2 className="mb-3 text-sm font-semibold text-fg">
          Lista Lending positions
        </h2>
        <GhostTable message="Connect your wallet to view your positions." />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <h2 className="mb-3 text-sm font-semibold text-fg">
        Lista Lending positions
      </h2>
      {markets.isLoading || positions.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : markets.isError || positions.isError ? (
        <ErrorBlock
          message="Failed to read your Lista positions."
          onRetry={() => {
            void markets.refetch();
            positions.refetch();
          }}
        />
      ) : positions.rows.length === 0 ? (
        <GhostTable message="No positions yet. Supply collateral on a Lista market to open one." />
      ) : (
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-dim">
              <th className="sticky top-14 z-10 h-10 bg-ink px-3 font-medium lg:top-16 lg:px-4">
                Market
              </th>
              <th className="sticky top-14 z-10 h-10 bg-ink px-3 text-right font-medium lg:top-16 lg:px-4">
                Collateral
              </th>
              <th className="sticky top-14 z-10 h-10 bg-ink px-3 text-right font-medium lg:top-16 lg:px-4">
                Debt
              </th>
              <th className="sticky top-14 z-10 h-10 bg-ink px-3 text-right font-medium lg:top-16 lg:px-4">
                <TipLabel
                  align="right"
                  label="Health"
                  text="Collateral value times max LTV, divided by debt. Below 1.00 the position can be liquidated."
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {positions.rows.map((r) => (
              <tr
                key={r.market.id}
                tabIndex={0}
                onClick={() => router.push(`/borrow/lista/${r.market.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/borrow/lista/${r.market.id}`);
                  }
                }}
                className="group h-12 cursor-pointer border-t border-line transition-colors hover:bg-fill md:h-14"
              >
                <td className="px-3 md:px-4">
                  <div className="flex items-center gap-3">
                    <TokenImage
                      address={r.market.collateralAddress}
                      src={r.market.collateralIcon}
                      symbol={r.market.collateralSymbol}
                      size={28}
                    />
                    <div>
                      <div className="text-sm font-semibold text-fg transition-colors group-hover:text-accent">
                        {r.market.collateralSymbol}
                      </div>
                      <div className="text-xs text-dim">
                        {r.market.loanSymbol} market
                      </div>
                    </div>
                  </div>
                </td>
                <td className="tnum px-3 text-right text-sm text-fg md:px-4">
                  {r.ready ? formatUnits(r.collateral, 18, 4) : "-"}
                </td>
                <td className="tnum px-3 text-right text-sm text-fg md:px-4">
                  {r.ready ? formatUnits(r.debtAssets, 18, 4) : "-"}
                </td>
                <td
                  className={`tnum px-3 text-right text-sm font-medium md:px-4 ${
                    r.healthFactor !== null && r.healthFactor < 1
                      ? "text-down"
                      : "text-fg"
                  }`}
                >
                  {r.healthFactor !== null ? r.healthFactor.toFixed(2) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
