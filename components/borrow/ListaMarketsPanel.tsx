"use client";

import { useRouter } from "next/navigation";
import { useConnection } from "wagmi";
import { Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { TokenImage } from "@/components/ui/TokenImage";
import { InfoTip } from "@/components/ui/InfoTip";
import { EmptyBlock, ErrorBlock } from "@/components/ui/StateBlocks";
import { formatUnits } from "@/lib/format";
import { useListaAllPositions, useListaMarkets } from "@/hooks/useLista";

/**
 * Lista (Moolah) positions table for the combined Borrow positions view.
 * The parent owns the connect-wallet gate; this renders loading, error,
 * empty or the open isolated-market positions.
 */
export function ListaPositionsCard() {
  const router = useRouter();
  const { address, isConnected } = useConnection();
  const markets = useListaMarkets();
  const positions = useListaAllPositions(markets.data, address);

  if (!isConnected) return null;

  return (
    <div className="min-w-0 flex flex-col overflow-hidden rounded-xl border border-line bg-surface-3">
      <div className="px-4 pt-3">
        <h2 className="mb-3 text-sm font-semibold text-fg">
          Lista Lending positions
        </h2>
      </div>
      {markets.isLoading || positions.isLoading ? (
        <div className="space-y-3 px-4 pb-4 pt-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : markets.isError || positions.isError ? (
        <div className="px-4 pb-4 pt-1">
          <ErrorBlock
            message="Failed to read your Lista positions."
            onRetry={() => {
              void markets.refetch();
              positions.refetch();
            }}
          />
        </div>
      ) : positions.rows.length === 0 ? (
        <div className="px-4 pb-4">
          <EmptyBlock
            icon={Inbox}
            message="No Lista collateral yet. Open a Lista market and press Supply."
          />
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider">
                <th className="px-3 pb-2 font-medium text-dim md:px-4">
                  Market
                </th>
                <th className="px-3 pb-2 text-right font-medium text-dim md:px-4">
                  Collateral
                </th>
                <th className="px-3 pb-2 text-right font-medium text-dim md:px-4">
                  Debt
                </th>
                <th className="px-3 pb-2 text-right font-medium text-dim md:px-4">
                  <span className="inline-flex items-center gap-1">
                    Health
                    <InfoTip
                      align="right"
                      text="Collateral value times max LTV, divided by debt. Below 1.00 the position can be liquidated."
                    />
                  </span>
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
                  className="group h-11 cursor-pointer transition-colors hover:bg-fill md:h-16"
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
        </div>
      )}
    </div>
  );
}
