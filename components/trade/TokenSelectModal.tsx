"use client";

import { Coins, RotateCcw, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useConnection, useReadContracts } from "wagmi";
import { TokenImage } from "@/components/ui/TokenImage";
import { Skeleton } from "@/components/ui/Skeleton";
import { useBodyScrollLock } from "@/components/ui/useBodyScrollLock";
import { useSheetDrag } from "@/components/ui/useSheetDrag";
import { ERC20_ABI } from "@/lib/erc20";
import { fmtUsd, formatUnits, unitsToNumber } from "@/lib/format";
import { useUniverseTickers } from "@/hooks/useTickers";
import type { Stock } from "@/lib/rwa";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as const;

export function TokenSelectModal({
  tokens,
  onSelect,
  onClose,
  loading = false,
  error = false,
  onRetry,
}: {
  tokens: Stock[];
  onSelect: (token: Stock) => void;
  onClose: () => void;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  const [q, setQ] = useState("");
  const openedAtRef = useRef(0);
  // Absorb accidental double-clicks: the card opens under the cursor, so a
  // fast second click would otherwise land on a row and select it unseen.
  const shielded = () => Date.now() - openedAtRef.current < 400;
  const { address } = useConnection();
  const tickers = useUniverseTickers(true);
  const { dragY, dragging, handleProps } = useSheetDrag(onClose);

  useBodyScrollLock(true);

  useEffect(() => {
    openedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // One multicall for every listed token's wallet balance.
  const balContracts = useMemo(
    () =>
      tokens.map((t) => ({
        address: t.contractAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf" as const,
        args: [address ?? ZERO_ADDR] as const,
      })),
    [tokens, address],
  );
  const balRead = useReadContracts({
    contracts: balContracts,
    query: { staleTime: 10_000, enabled: Boolean(address) },
  });

  const balUnits = (addr: string): bigint | null => {
    const i = tokens.findIndex((t) => t.contractAddress === addr);
    const r = i >= 0 ? balRead.data?.[i] : undefined;
    if (!r || r.status !== "success") return null;
    return r.result as bigint;
  };

  const balText = (t: Stock) => {
    if (!address) return "0";
    if (balRead.isLoading) return "…";
    const units = balUnits(t.contractAddress);
    if (units === null) return "–";
    return formatUnits(units, t.decimals ?? 18, 6);
  };

  const usdText = (t: Stock) => {
    if (!address) return "$0";
    const units = balUnits(t.contractAddress);
    if (units === null) return "-";
    const v = unitsToNumber(units, t.decimals ?? 18);
    if (v === 0) return "$0";
    const ticker = t.cs ? tickers.data?.[t.cs] : undefined;
    const price = ticker ? Number(ticker.price) : NaN;
    if (!Number.isFinite(price) || price <= 0) return "-";
    return fmtUsd(v * price);
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = tokens.filter(
      (t) =>
        !s ||
        t.symbol.toLowerCase().includes(s) ||
        t.ticker.toLowerCase().includes(s) ||
        t.contractAddress.toLowerCase().includes(s),
    );
    // Highest real 24h spot volume first.
    const vol = (t: Stock) => {
      const row = t.cs ? tickers.data?.[t.cs] : undefined;
      return row ? Number(row.quoteVolume) || 0 : -1;
    };
    return [...list].sort((a, b) => vol(b) - vol(a));
  }, [tokens, q, tickers.data]);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-ink/70"
        onClick={() => {
          if (!shielded()) onClose();
        }}
        aria-hidden
      />
      {/* Same shell as the header search card: 412x540 flush under the header
          on desktop, full-height drawer on mobile; fixed size so filtering
          never resizes the card. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select token to receive"
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
        className={`fixed inset-x-0 bottom-0 top-16 z-[60] flex flex-col overflow-hidden rounded-t-2xl border-t border-line bg-surface-3 shadow-2xl md:inset-x-auto md:bottom-auto md:left-1/2 md:top-14 md:h-[540px] md:w-[412px] md:rounded-2xl md:border md:-translate-x-1/2 ${
          dragging ? "" : "transition-transform"
        }`}
      >
        <div
          {...handleProps}
          data-drag-handle
          className="flex cursor-grab touch-none items-center justify-center py-3 active:cursor-grabbing md:hidden"
        >
          <span className="h-1 w-8 rounded-full bg-line" aria-hidden />
        </div>
        <div className="px-3 pt-3 md:px-3.5 md:pt-3.5">
          <div className="flex h-11 items-center gap-2.5 rounded-xl bg-fill px-3.5 transition-shadow focus-within:ring-1 focus-within:ring-line-strong md:rounded-full">
            <Search size={16} strokeWidth={1.7} className="shrink-0 text-dim" aria-hidden />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tokens"
              aria-label="Search tokens"
              className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-dim"
            />
            {q ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQ("")}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-dim transition-colors hover:bg-fill-strong hover:text-fg"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.7} />
              </button>
            ) : null}
          </div>
        </div>

        {/* Token rows */}
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          <p className="flex items-center gap-1.5 px-3 pb-1.5 pt-1 text-xs font-medium text-dim">
            <Coins className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
            All tokens
          </p>
          {error ? (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <p className="text-sm text-dim">Failed to load the token list.</p>
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-fill"
                >
                  <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.7} />
                  Retry
                </button>
              ) : null}
            </div>
          ) : loading ? (
            <div className="space-y-1 p-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-dim">
              {q.trim() ? (
                <>
                  No matches for &quot;
                  <span className="tnum text-fg">{q.trim()}</span>&quot;.
                </>
              ) : (
                "No tokens available."
              )}
            </div>
          ) : (
            filtered.map((t) => (
              <button
                key={t.contractAddress}
                type="button"
                onClick={() => {
                  if (shielded()) return;
                  onSelect(t);
                  onClose();
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-fill"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <TokenImage address={t.contractAddress} symbol={t.symbol} size={36} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-fg">{t.symbol}</span>
                    <span className="block truncate text-xs text-dim">{t.ticker}</span>
                  </span>
                </span>
                <span className="shrink-0 pl-3 text-right">
                  <span className="tnum block text-sm font-semibold text-fg">
                    {balText(t)}
                  </span>
                  <span className="tnum block text-xs text-dim">
                    {usdText(t)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
