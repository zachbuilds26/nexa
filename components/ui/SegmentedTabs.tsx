"use client";

import type { LucideIcon } from "lucide-react";

export type SegTab<K extends string> = {
  key: K;
  label: string;
  icon?: LucideIcon;
};

export function SegmentedTabs<K extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  className = "",
}: {
  tabs: ReadonlyArray<SegTab<K>>;
  value: K;
  onChange: (k: K) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex w-full max-w-[480px] gap-1 rounded-full border border-line bg-fill p-1 ${className}`}
    >
      {tabs.map((t) => {
        const active = t.key === value;
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={`flex h-9 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm transition-colors ${
              active ? "bg-accent/10 font-medium text-accent" : "text-dim hover:text-fg"
            }`}
          >
            {Icon ? <Icon className="h-4 w-4" strokeWidth={1.7} /> : null}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
