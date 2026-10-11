"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, Copy, ExternalLink } from "lucide-react";
import type { MarketStatus, Stock } from "@/lib/rwa";
import { useMeta } from "@/hooks/useRwa";
import { Skeleton } from "@/components/ui/Skeleton";
import { TokenImage } from "@/components/ui/TokenImage";
import { MarketBadge } from "@/components/trade/MarketBadge";

export function prettyStockName(
  name: string | null | undefined,
  fallback: string,
): string {
  const pretty = (name ?? "").replace(/\s*\(bStocks\)\s*$/i, "").trim();
  return pretty || fallback;
}

export function StockHeaderCard({
  stock,
  status,
  statusError = false,
  showBack = true,
}: {
  stock: Stock;
  status?: MarketStatus;
  statusError?: boolean;
  showBack?: boolean;
}) {
  const meta = useMeta(stock.contractAddress);
  const title = prettyStockName(meta.data?.name, stock.symbol);
  const [copied, setCopied] = useState(false);

  function copyAddr() {
    void navigator.clipboard.writeText(stock.contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-3">
      {showBack ? (
        <Link
          href="/stocks"
          aria-label="Back to stocks"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface-3 text-dim transition-colors hover:bg-fill hover:text-accent"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.7} />
        </Link>
      ) : null}
      <TokenImage
        address={stock.contractAddress}
        symbol={stock.symbol}
        size={40}
        className="shrink-0 ring-2 ring-ink"
      />
      <div className="flex min-w-0 items-baseline gap-2.5">
        {meta.isLoading && !meta.data ? (
          <Skeleton className="h-8 w-52" />
        ) : (
          <h1 className="truncate text-2xl font-semibold text-fg">{title}</h1>
        )}
        <span className="shrink-0 text-base font-medium text-dim">
          {stock.ticker}
        </span>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2.5">
        <span className="hidden sm:inline-flex">
          <MarketBadge status={status} error={statusError} />
        </span>
        <button
          type="button"
          aria-label="Copy contract address"
          onClick={copyAddr}
          className={`transition-colors ${
            copied ? "text-accent" : "text-dim hover:text-accent"
          }`}
        >
          {copied ? (
            <Check className="h-4 w-4" strokeWidth={1.7} />
          ) : (
            <Copy className="h-4 w-4" strokeWidth={1.7} />
          )}
        </button>
        <a
          href={`https://bscscan.com/token/${stock.contractAddress}`}
          target="_blank"
          rel="noreferrer"
          aria-label="View on BscScan"
          className="text-dim transition-colors hover:text-accent"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={1.7} />
        </a>
      </div>
    </div>
  );
}
