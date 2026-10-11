"use client";

import type { LucideIcon } from "lucide-react";
import { RotateCcw, TriangleAlert } from "lucide-react";

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
