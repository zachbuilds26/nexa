"use client";

import { RotateCcw, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { TokenImage } from "@/components/ui/TokenImage";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Stock } from "@/lib/rwa";

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
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tokens.slice(0, 40);
    return tokens
      .filter(
        (t) =>
          t.symbol.toLowerCase().includes(s) ||
          t.ticker.toLowerCase().includes(s) ||
          t.contractAddress.toLowerCase().includes(s),
      )
      .slice(0, 40);
  }, [tokens, q]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close token picker"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-line bg-surface-1/95 shadow-2xl shadow-black/50 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-fg">Select token</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-dim transition-colors hover:bg-fill hover:text-accent"
          >
            <X className="h-4 w-4" strokeWidth={1.7} />
          </button>
        </div>
        <div className="border-b border-line px-4 py-3">
          <div className="flex items-center gap-2 rounded-lg bg-surface-4 px-3">
            <Search className="h-4 w-4 shrink-0 text-dim" strokeWidth={1.7} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search ticker or 0x address…"
              className="h-10 w-full bg-transparent text-sm text-fg outline-none placeholder:text-dim/60"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {error ? (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <p className="text-sm text-dim">
                Failed to load the token list.
              </p>
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
            <div className="space-y-1 p-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-dim">
              No token matches “{q}”.
            </div>
          ) : (
            filtered.map((t) => (
              <button
                key={t.contractAddress}
                type="button"
                onClick={() => {
                  onSelect(t);
                  onClose();
                }}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-fill"
              >
                <span className="flex items-center gap-3">
                  <TokenImage address={t.contractAddress} symbol={t.symbol} size={32} />
                  <span>
                    <span className="text-sm font-semibold text-fg">{t.symbol}</span>
                    <span className="ml-2 text-xs text-dim">{t.ticker}</span>
                  </span>
                </span>
                <span className="tnum text-xs text-dim">
                  {t.contractAddress.slice(0, 6)}…{t.contractAddress.slice(-4)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
