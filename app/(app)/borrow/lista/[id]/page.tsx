"use client";

import { Suspense, use, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageFallback } from "@/components/ui/PageFallback";
import { DotsBackdrop } from "@/components/ui/DotsBackdrop";
import { Skeleton } from "@/components/ui/Skeleton";
import { AddressChip } from "@/components/ui/AddressChip";
import { Card } from "@/components/ui/Card";
import { TokenImage } from "@/components/ui/TokenImage";
import { ErrorBlock, EmptyBlock } from "@/components/ui/StateBlocks";
import { ContextStat, InfoRow } from "@/components/ui/Stats";
import {
  ListaMarketActionCard,
  ListaTokenPairIcons,
} from "@/components/borrow/ListaMarketActionCard";
import { MOOLAH_ADDRESS, findListaMarket } from "@/lib/lista";
import { fmtNumTrim as fmtTrim, fmtUsdCompact } from "@/lib/format";
import { useListaMarkets } from "@/hooks/useLista";

export default function ListaMarketPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PageFallback label="Loading market" />}>
      <ListaMarketView {...props} />
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

function ListaMarketView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const markets = useListaMarkets();
  const market = markets.data ? findListaMarket(markets.data, id) : undefined;

  return (
    <div className="relative">
      <DotsBackdrop />
      <div className="relative mx-auto w-full max-w-[1200px] px-4 py-6 lg:px-8">
      <Link
        href="/borrow/markets"
        className="inline-flex items-center gap-1.5 text-sm text-dim transition-colors hover:text-accent"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.7} />
        Markets
      </Link>

      <div className="mb-5 mt-4">
        {markets.isLoading && !market ? (
          <Skeleton className="h-8 w-48" />
        ) : market ? (
          <h1 className="flex items-center gap-3 text-2xl font-semibold text-fg">
            <ListaTokenPairIcons market={market} />
            <span>{`${market.collateralSymbol} / ${market.loanSymbol}`}</span>
          </h1>
        ) : (
          <h1 className="text-2xl font-semibold text-fg">Market</h1>
        )}
        {markets.isLoading && !market ? (
          <Skeleton className="mt-2.5 h-6 w-72" />
        ) : market ? (
          <div className="mt-2.5 flex flex-nowrap items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Pill>Lista Lending</Pill>
            <Pill>Max LTV {fmtTrim(market.lltv * 100)}%</Pill>
            <Pill>Borrow {fmtTrim(market.borrowRate * 100)}%</Pill>
          </div>
        ) : (
          <p className="mt-1.5 text-sm text-dim">
            {markets.isError
              ? "Couldn't load Lista markets - reload to try again."
              : "This market isn't available right now."}
          </p>
        )}
      </div>

      {markets.isLoading && !market ? (
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
      ) : !market ? (
        <EmptyBlock message="No Lista market matches this id." />
      ) : market ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <ContextStat
                label="Borrow APR"
                value={`${fmtTrim(market.borrowRate * 100, 2)}%`}
                tip="Live annualized cost of borrowing. It moves with utilization, so it is not a fixed promise."
              />
              <ContextStat
                label="Max LTV"
                value={`${fmtTrim(market.lltv * 100)}%`}
                tip="Largest share of your collateral value you are allowed to borrow against."
              />
              <ContextStat
                label="Available"
                value={fmtUsdCompact(market.liquidityUsd)}
                tip="Loan-token liquidity sitting in this market, ready to borrow."
              />
            </div>

            <Card className="mt-4 p-4">
              <h2 className="text-sm font-semibold text-fg">Market details</h2>
              <div className="mt-2">
                <InfoRow
                  label="Supply APY"
                  value={`${fmtTrim(market.supplyApy * 100, 2)}%`}
                  sub="direct supply; vault routes may differ"
                />
                <InfoRow
                  label="Utilization"
                  value={`${fmtTrim(market.utilization * 100, 1)}%`}
                  sub="of supplied loan capital in use"
                />
                <InfoRow
                  label="Total borrowed"
                  value={`${fmtTrim(market.totalBorrowAsset, 2)} ${market.loanSymbol}`}
                />
                <InfoRow
                  label="Borrow asset"
                  value={
                    <span className="inline-flex items-center gap-2">
                      <TokenImage
                        src={market.loanIcon}
                        symbol={market.loanSymbol}
                        size={18}
                      />
                      {market.loanSymbol}
                    </span>
                  }
                  sub="what you receive and repay"
                />
                <InfoRow
                  label="Contract"
                  value={
                    <AddressChip
                      address={MOOLAH_ADDRESS}
                      href={`https://bscscan.com/address/${MOOLAH_ADDRESS}`}
                    />
                  }
                />
              </div>
              {markets.isError ? (
                <div className="mt-4">
                  <ErrorBlock
                    message="Failed to load market stats."
                    onRetry={markets.refetch}
                  />
                </div>
              ) : null}
            </Card>
          </div>
          <div className="min-w-0 flex flex-col lg:order-none order-first">
            <ListaMarketActionCard market={market} />
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}
