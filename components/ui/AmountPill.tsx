"use client";

import type { ReactNode } from "react";
import { WandSparkles } from "lucide-react";

/**
 * Green amount pill used for percent shortcuts (25% / 50% / 75%) and Max
 * buttons across the app. Max pills get the expand icon: full-round,
 * accent border, accent text.
 */
export function AmountPill({
  children,
  onClick,
  icon = false,
  disabled = false,
  ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  /** Show the expand icon (used on Max pills). */
  icon?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon ? <WandSparkles className="h-3 w-3" strokeWidth={1.7} /> : null}
      {children}
    </button>
  );
}
