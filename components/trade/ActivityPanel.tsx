"use client";

import { useState } from "react";
import { ChevronLeft, ExternalLink, History } from "lucide-react";
import { loadActivity, type SwapActivity } from "@/lib/swapActivity";

function timeAgo(at: number): string {
  const s = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ActivityRow({ rec }: { rec: SwapActivity }) {
  return (
    <div className="flex items-center gap-3 border-t border-line px-1 py-3 first:border-t-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">
          {rec.fromAmount} {rec.fromSymbol}
          <span className="mx-1.5 text-dim">→</span>~{rec.toAmount}{" "}
          {rec.toSymbol}
        </p>
        <p className="tnum mt-0.5 text-xs text-dim">{timeAgo(rec.at)}</p>
      </div>
      <a
        href={`https://bscscan.com/tx/${rec.hash}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View transaction on BscScan"
        className="shrink-0 rounded-lg p-1.5 text-dim transition-colors hover:text-accent"
      >
        <ExternalLink className="h-4 w-4" strokeWidth={1.7} />
      </a>
    </div>
  );
}

/** Inline activity panel rendered in place of the swap form. */
export function ActivityPanel({ onBack }: { onBack: () => void }) {
  // Only mounted after a client-side click (never part of the server render),
  // so the lazy initializer can read localStorage safely.
  const [rows] = useState<SwapActivity[]>(() => loadActivity());

  return (
    <div className="flex flex-1 flex-col">
      {/* Header with back */}
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to swap"
          className="-ml-1.5 rounded-lg p-1.5 text-dim transition-colors hover:text-accent"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.7} />
        </button>
        <h1 className="text-sm font-semibold text-fg">Activity</h1>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
          <History className="h-6 w-6 text-dim" strokeWidth={1.7} />
          <p className="text-sm text-dim">No swaps yet. Settled trades show up here.</p>
        </div>
      ) : (
        <div className="-mx-1 mt-1 flex-1 overflow-y-auto">
          {rows.map((rec) => (
            <ActivityRow key={rec.hash} rec={rec} />
          ))}
        </div>
      )}
    </div>
  );
}
