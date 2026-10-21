import type { ReactNode } from "react";
import { TipLabel } from "@/components/ui/InfoTip";

export function InfoRow({
  label,
  value,
  sub,
  tip,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tip?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line py-2.5 text-sm first:border-t-0">
      <span className="flex min-w-0 items-center gap-1 text-dim">
        <TipLabel label={label} text={tip} />
      </span>
      <span className="text-right">
        <span className="tnum text-fg">{value}</span>
        {sub ? <span className="mt-0.5 block text-xs text-dim">{sub}</span> : null}
      </span>
    </div>
  );
}

export function ContextStat({
  label,
  value,
  tip,
}: {
  label: string;
  value: string;
  tip?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-fill px-2.5 py-2">
      <div className="flex min-w-0 items-center gap-1">
        <TipLabel
          label={label}
          text={tip}
          className="min-w-0 truncate text-[11px] font-medium uppercase tracking-[0.12em] text-dim"
        />
      </div>
      <p className="tnum mt-0.5 truncate text-sm font-medium text-fg">{value}</p>
    </div>
  );
}
