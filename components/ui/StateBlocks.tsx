"use client";

import type { LucideIcon } from "lucide-react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { WalletFilled } from "./WalletFilled";

export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
      <TriangleAlert className="h-5 w-5 text-down" strokeWidth={1.7} />
      <p className="max-w-sm text-sm text-dim">{message}</p>
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
  );
}

export function EmptyBlock({
  message,
  icon: Icon,
}: {
  message: string;
  icon?: LucideIcon;
}) {
  if (!Icon) {
    return (
      <div className="px-4 py-8 text-center text-sm text-dim">{message}</div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-4">
        <Icon className="h-6 w-6 text-fg" strokeWidth={1.7} />
      </span>
      <p className="max-w-xs text-sm text-dim">{message}</p>
    </div>
  );
}

/**
 * Ghost preview for empty / not-connected states.
 *
 * A dashed-border card with one full ghost row (overlapping avatar rings,
 * name bar + sub-bar, value bar, action pill outline), a borderless faded
 * peek row below, a filled wallet icon, and a centered message.
 *
 * Rows are purely decorative and non-interactive.
 */
export function GhostTable({ message }: { message: string }) {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      {/* Dashed-border card with full ghost row */}
      <div className="w-full rounded-xl border border-dashed border-line-strong bg-surface-1/20 px-4 py-4">
        <div className="flex items-center gap-3.5" aria-hidden="true">
          {/* Overlapping avatar rings */}
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
            <span className="absolute left-0 h-7 w-7 rounded-full border border-line-strong bg-surface-2" />
            <span className="absolute right-0 h-7 w-7 rounded-full border border-line-strong bg-surface-2" />
          </span>
          {/* name bar + sub-bar */}
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-24 rounded bg-fill-strong" />
            <div className="h-2 w-16 rounded bg-fill" />
          </div>
          {/* value bar */}
          <div className="hidden flex-col items-end gap-1.5 md:flex">
            <div className="h-2.5 w-20 rounded bg-fill-strong" />
          </div>
          {/* action pill outline */}
          <span className="h-7 w-16 shrink-0 rounded-full border border-line-strong" />
        </div>
      </div>

      {/* Borderless faded peek row — outside the card, bars only */}
      <div
        className="flex w-full items-center gap-3.5 px-4 opacity-25"
        aria-hidden="true"
      >
        {/* avatar blob */}
        <span className="h-7 w-7 shrink-0 rounded-full bg-fill-strong" />
        {/* name bar + sub-bar */}
        <div className="flex-1 space-y-1.5">
          <div className="h-2.5 w-20 rounded bg-fill-strong" />
          <div className="h-2 w-14 rounded bg-fill" />
        </div>
        {/* value bar */}
        <div className="hidden flex-col items-end gap-1.5 md:flex">
          <div className="h-2.5 w-16 rounded bg-fill-strong" />
        </div>
      </div>

      {/* Wallet icon */}
      <WalletFilled className="mt-3 h-6 w-6 text-dim" />

      {/* Message */}
      <p className="px-4 text-center text-sm text-dim">{message}</p>
    </div>
  );
}
