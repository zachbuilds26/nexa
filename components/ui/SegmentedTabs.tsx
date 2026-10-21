"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";

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
  hrefs,
}: {
  tabs: ReadonlyArray<SegTab<K>>;
  value: K;
  onChange?: (k: K) => void;
  ariaLabel: string;
  className?: string;
  hrefs?: Partial<Record<K, string>>;
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
        const cls = `flex h-9 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm transition-colors ${
          active ? "bg-accent/10 font-medium text-accent" : "text-dim hover:text-fg"
        }`;
        const href = hrefs?.[t.key];
        if (href) {
          return (
            <Link
              key={t.key}
              href={href}
              role="tab"
              aria-selected={active}
              onClick={() => onChange?.(t.key)}
              className={cls}
            >
              {Icon ? <Icon className="h-4 w-4" strokeWidth={1.7} /> : null}
              {t.label}
            </Link>
          );
        }
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(t.key)}
            className={cls}
          >
            {Icon ? <Icon className="h-4 w-4" strokeWidth={1.7} /> : null}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
